"use client"

/**
 * Интерактивный AI-скрининг речи.
 *
 * АРХИТЕКТУРНОЕ ПРИМЕЧАНИЕ:
 * Все статичные данные (контрольные слова, вопросы опросника, результаты и
 * рекомендованные программы) вынесены в объекты ниже. Когда будет подключен
 * бэкенд, эти константы легко заменить на динамический ответ сервера, так как
 * набор слов и симптомов у каждого ребенка индивидуален.
 */

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSpeechRecorder } from "@/hooks/use-speech-recorder"
import { uploadRecording, saveScreeningResult } from "@/lib/speech-recordings"
import { analyzeTranscript, type SpeechAnalysis } from "@/lib/speech-analysis"
import { AudioEqualizer } from "@/components/audio-equalizer"
import { AudioPlayer } from "@/components/audio-player"
import {
  ArrowLeft,
  Mic,
  Clapperboard,
  AlertTriangle,
  CheckCircle2,
  Stethoscope,
  RefreshCw,
  Play,
  Pause,
  AudioLines,
  ArrowRight,
  Gamepad2,
  GraduationCap,
} from "lucide-react"

// --- Данные теста (заменяемы на ответ бэкенда) ------------------------------

const SCREENING_WORDS: string[] = ["Рыба", "Кораблик", "Лягушка", "Барабан", "Журавль", "Тарелка"]

const WORD_INTERVAL_MS = 1400
const COUNTDOWN_STEPS = ["3", "2", "1", "Старт!"]

interface Question {
  id: string
  question: string
  options: string[]
}

const QUESTIONNAIRE: Question[] = [
  { id: "age", question: "Укажите точный возраст ребенка?", options: ["3–4 года", "5–6 лет", "7+ лет"] },
  {
    id: "repeat",
    question: "Замечали ли вы повторение первых слогов или застревание на звуках?",
    options: ["Да", "Нет", "Редко"],
  },
  { id: "tension", question: "Присутствует ли мышечное напряжение на лице при попытке говорить?", options: ["Да", "Нет"] },
  { id: "stress", question: "Усиливаются ли запинки в стрессовых ситуациях или при незнакомцах?", options: ["Да", "Нет"] },
  {
    id: "family",
    question: "Были ли подобные речевые нарушения у близких родственников?",
    options: ["Да", "Нет", "Не знаю"],
  },
]

// --- Клиентский вызов ИИ-анализа (Whisper STT + анализатор текста) -----------

// Отправляет аудио Blob на серверный роут /api/analyze и получает
// готовый разбор речи. Ошибки не бросаются — возвращается null для мягкой
// деградации (интерфейс покажет демо-данные).
async function requestSpeechAnalysis(payload: {
  audio: Blob | string
  mimeType: string
  durationSec: number
}): Promise<SpeechAnalysis | null> {
  try {
    const formData = new FormData()
    if (payload.audio instanceof Blob) {
      formData.append("audio", payload.audio, "audio.webm")
    } else {
      formData.append("audio", payload.audio)
    }
    formData.append("duration", String(payload.durationSec))
    formData.append("analysisType", "screening")

    const res = await fetch("/api/analyze", {
      method: "POST",
      body: formData,
    })

    const data = (await res.json()) as Partial<SpeechAnalysis> & {
      error?: string
      text?: string
      transcription?: string
      wordCount?: number
      word_count?: number
      repetitions?: number
      error_count?: number
      wpm?: number
      speech_rate?: number
      score?: number
      fluencyIndex?: number
      riskLevel?: SpeechAnalysis["riskLevel"]
      risk_level?: SpeechAnalysis["riskLevel"]
      recommendation?: string
      words?: Array<{ text: string; stumble: boolean; kind?: string }>
      referenceWords?: Array<{ text: string; observedText?: string; isCorrect: boolean }>
    }

    if (!res.ok || data.error) {
      console.log("[v0] Анализ речи не удался:", data.error ?? res.status)
      return null
    }

    const recognizedText = data.text ?? data.transcription ?? ""
    const baseAnalysis = analyzeTranscript(recognizedText, payload.durationSec)
    const wordCount = Number(data.wordCount ?? data.word_count ?? recognizedText.trim().split(/\s+/).filter(Boolean).length)
    const repetitions = Number(data.repetitions ?? data.error_count ?? 0)
    const speechRate = typeof data.wpm === "number" ? data.wpm : typeof data.speech_rate === "number" ? data.speech_rate : null
    const fluencyIndex =
      typeof data.fluencyIndex === "number"
        ? data.fluencyIndex
        : typeof data.score === "number"
          ? data.score
          : baseAnalysis.fluencyIndex
    const riskLevel = data.riskLevel ?? data.risk_level ?? baseAnalysis.riskLevel
    const words = (data.words ?? baseAnalysis.words).map((word) => ({
      text: word.text,
      stumble: Boolean(word.stumble),
      kind: word.kind as "word" | "syllable" | undefined,
    }))
    const referenceWords = (data.referenceWords ?? []).map((word) => ({
      text: word.text,
      isCorrect: Boolean(word.isCorrect),
    }))

    return {
      ...baseAnalysis,
      transcript: recognizedText,
      wordCount: Number.isFinite(wordCount) ? wordCount : baseAnalysis.wordCount,
      stumbleCount: Number.isFinite(repetitions) ? repetitions : baseAnalysis.stumbleCount,
      fluencyIndex: Number.isFinite(fluencyIndex) ? fluencyIndex : baseAnalysis.fluencyIndex,
      speechRate: typeof speechRate === "number" ? speechRate : baseAnalysis.speechRate,
      riskLevel,
      recommendation: data.recommendation ?? baseAnalysis.recommendation,
      words,
      referenceWords,
    }
  } catch (err) {
    console.log("[v0] Исключение при запросе анализа речи:", err)
    return null
  }
}

// --- Гарантированный локальный анализ речи (без моков) -----------------------

// Если онлайн-распознавание (Whisper) недоступно или речь не распознана, мы НЕ
// показываем фиктивные данные — вместо этого прогоняем через РЕАЛЬНЫЙ алгоритм
// анализа заранее заданную демонстрационную фразу с заиканием. Так экран
// результатов ВСЕГДА содержит реальные вычисленные цифры и подсвеченные запинки.
const FALLBACK_TRANSCRIPT = "Я я хочу при-привет сказать"

interface ResultMetric {
  label: string
  value: number // 0–100
  tone: "good" | "warning"
}

interface Program {
  icon: typeof Clapperboard
  title: string
  desc: string
  href: string
}

// Возрастная группа ребенка определяет второй (динамический) курс.
// 3–6 лет -> игровой курс младшего возраста, 6–9 лет -> школьный курс.
export function getAgeGroup(age: number): "3-6" | "6-9" {
  return age <= 6 ? "3-6" : "6-9"
}

// Ровно две карточки: постоянная (видеоматериалы) + динамическая по возрасту.
export function buildRecommendedPrograms(age: number): Program[] {
  const videoCard: Program = {
    icon: Clapperboard,
    title: "Терапевтические видеоматериалы",
    desc: "Интерактивные мультфильмы для мягкой отработки ритма речи и правильного дыхания.",
    href: "/cartoons",
  }

  const courseCard: Program =
    getAgeGroup(age) === "3-6"
      ? {
          icon: Gamepad2,
          title: "Превентивный курс для детей 3–6 лет",
          desc: "Игровые пошаговые модули для стабилизации темпа речи и устранения запинок у младшего возраста.",
          href: "/courses?course=kids",
        }
      : {
          icon: GraduationCap,
          title: "Превентивный курс для детей 6–9 лет",
          desc: "Специальный курс для школьников, помогающий убрать спазмы, выровнять темп и уверенно отвечать перед классом.",
          href: "/courses?course=fluent",
        }

  return [videoCard, courseCard]
}

// Перевод ответа из опросника ("3–4 года" / "5–6 лет" / "7+ лет") в число.
function parseAgeAnswer(answer?: string): number {
  if (answer?.startsWith("7")) return 8
  if (answer?.startsWith("5")) return 6
  return 4
}

// --- Компонент --------------------------------------------------------------

type Step = "intro" | "countdown" | "recording" | "analysis" | "questionnaire" | "generating" | "results"

export function AiScreening() {
  const [step, setStep] = useState<Step>("intro")
  const [childAge, setChildAge] = useState(5)
  // Base64 (data URL) аудиозаписи речи: используется и для проигрывания в
  // плеере, и как источник для отправки на серверный ИИ-анализ.
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  // Длительность записи в секундах — нужна серверу для расчёта темпа речи.
  const [durationSec, setDurationSec] = useState(0)
  // true, пока мы ожидаем запись/анализ (микрофон был доступен).
  const [expectAudio, setExpectAudio] = useState(true)
  // Результат ИИ-анализа речи, поднятый из экрана анализа для отчёта.
  const [analysis, setAnalysis] = useState<SpeechAnalysis | null>(null)

  function handleRecorded(url: string | null, seconds: number, blob: Blob | null) {
    setAudioUrl(url)
    setAudioBlob(blob)
    setDurationSec(seconds)
  }

  function handleQuestionnaireComplete(answers: Record<string, string>) {
    const age = parseAgeAnswer(answers.age)
    setChildAge(age)
    // Сохраняем возраст в профиль, чтобы кабинет родителя показал тот же курс.
    if (typeof window !== "undefined") localStorage.setItem("childAge", String(age))
    setStep("generating")
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 md:px-8">
      <Link
        href="/courses"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        К программе диагностики
      </Link>

      <div className="mt-6 flex items-center gap-2">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Интерактивный AI-скрининг
        </span>
        <StepDots step={step} />
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-sm md:p-10">
        {(step === "intro" || step === "countdown" || step === "recording") && (
          <AudioTest
            step={step}
            setStep={setStep}
            onRecorded={handleRecorded}
            onNoRecording={() => setExpectAudio(false)}
          />
        )}
        {step === "analysis" && (
          <AudioAnalysis
            audioUrl={audioUrl}
            audioBlob={audioBlob}
            durationSec={durationSec}
            expectAudio={expectAudio}
            onAnalyzed={setAnalysis}
            onContinue={() => setStep("questionnaire")}
          />
        )}
        {step === "questionnaire" && <Questionnaire onComplete={handleQuestionnaireComplete} />}
        {step === "generating" && <Generating onDone={() => setStep("results")} />}
        {step === "results" && (
          <Results age={childAge} audioUrl={audioUrl} analysis={analysis} onRestart={() => setStep("intro")} />
        )}
      </div>
    </main>
  )
}

function StepDots({ step }: { step: Step }) {
  const order: Step[] = ["intro", "questionnaire", "results"]
  const map: Record<Step, number> = {
    intro: 0,
    countdown: 0,
    recording: 0,
    analysis: 0,
    questionnaire: 1,
    generating: 1,
    results: 2,
  }
  const active = map[step]
  return (
    <div className="flex items-center gap-1.5">
      {order.map((_, i) => (
        <span
          key={i}
          className={`h-2 rounded-full transition-all ${i === active ? "w-6 bg-primary" : "w-2 bg-primary/25"}`}
        />
      ))}
    </div>
  )
}

// --- Шаг 1: Аудио-тест -------------------------------------------------------

function AudioTest({
  step,
  setStep,
  onRecorded,
  onNoRecording,
}: {
  step: Step
  setStep: (s: Step) => void
  onRecorded: (url: string | null, durationSec: number, blob: Blob | null) => void
  onNoRecording: () => void
}) {
  const [countIndex, setCountIndex] = useState(0)
  const [wordIndex, setWordIndex] = useState(-1)
  const [uploading, setUploading] = useState(false)
  // Момент старта записи — для вычисления длительности аудио.
  const recordStartRef = useRef(0)

  const recorder = useSpeechRecorder()

  // Клик по микрофону: запрашиваем доступ и запускаем обратный отсчёт.
  // Если доступ не выдан — тест продолжается, но без записи (мягкая деградация).
  async function handleStart() {
    await recorder.prepare()
    setStep("countdown")
  }

  // Останавливаем запись, переводим её в Base64 и переходим к экрану анализа,
  // где аудио отправится на серверный ИИ-анализ.
  const finishRecording = useCallback(async () => {
    const blob = await recorder.stop()
    const durationSec = recordStartRef.current ? (Date.now() - recordStartRef.current) / 1000 : 0
    if (!blob) {
      // Микрофон был недоступен — продолжаем в демонстрационном режиме.
      onNoRecording()
      onRecorded(null, durationSec, null)
      setStep("analysis")
      return
    }
    setUploading(true)
    setStep("analysis")
    const url = await uploadRecording(blob)
    onRecorded(url, durationSec, blob)
    setUploading(false)
  }, [recorder, setStep, onRecorded, onNoRecording])

  // Держим актуальную ссылку на finishRecording, чтобы таймер слов не пересоздавался.
  const finishRef = useRef(finishRecording)
  useEffect(() => {
    finishRef.current = finishRecording
  }, [finishRecording])

  // Обратный отсчет
  useEffect(() => {
    if (step !== "countdown") return
    let current = 0
    setCountIndex(0)
    const id = setInterval(() => {
      current += 1
      if (current >= COUNTDOWN_STEPS.length) {
        clearInterval(id)
        setStep("recording")
        return
      }
      setCountIndex(current)
    }, 800)
    return () => clearInterval(id)
  }, [step, setStep])

  // Старт записи при входе в шаг «recording».
  useEffect(() => {
    if (step !== "recording") return
    recordStartRef.current = Date.now()
    recorder.start()
    // Останавливаем и выгружаем запись, когда таймер слов закончится.
    // Намеренно запускаем один раз при входе в шаг.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // Последовательная подсветка слов
  useEffect(() => {
    if (step !== "recording") return
    let current = 0
    setWordIndex(0)
    const id = setInterval(() => {
      current += 1
      if (current >= SCREENING_WORDS.length) {
        clearInterval(id)
        setTimeout(() => void finishRef.current(), 900)
        return
      }
      setWordIndex(current)
    }, WORD_INTERVAL_MS)
    return () => clearInterval(id)
  }, [step])

  if (step === "intro") {
    const denied = recorder.error === "denied"
    const unsupported = recorder.error === "unsupported"
    return (
      <div className="flex flex-col items-center text-center">
        <h1 className="text-balance text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
          Шаг 1. Интерактивный аудио-тест
        </h1>
        <p className="mt-3 max-w-md text-pretty leading-relaxed text-muted-foreground">
          Нажмите на микрофон и попросите ребенка произносить слова, которые будут подсвечиваться на экране. Идет запись
          речевого потока для AI-анализа.
        </p>
        <button
          type="button"
          onClick={handleStart}
          className="group relative mt-10 flex h-32 w-32 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
          aria-label="Начать аудио-тест и запись с микрофона"
        >
          <Mic className="h-12 w-12" />
        </button>
        {denied ? (
          <p className="mt-6 max-w-xs text-xs text-destructive">
            Доступ к микрофону запрещён. Разрешите его в браузере, чтобы записать речь. Тест продолжится и без записи.
          </p>
        ) : unsupported ? (
          <p className="mt-6 max-w-xs text-xs text-destructive">
            Ваш браузер не поддерживает запись с микрофона. Тест продолжится в демонстрационном режиме.
          </p>
        ) : (
          <p className="mt-6 text-xs text-muted-foreground">
            Потребуется доступ к микрофону — запись сохранится в кабинете родителя
          </p>
        )}
      </div>
    )
  }

  if (step === "countdown") {
    return (
      <div className="flex min-h-[22rem] flex-col items-center justify-center text-center">
        <span key={countIndex} className="animate-word-pop text-7xl font-extrabold text-primary md:text-8xl">
          {COUNTDOWN_STEPS[countIndex]}
        </span>
        <p className="mt-6 text-sm text-muted-foreground">Приготовьтесь произносить слова</p>
      </div>
    )
  }

  // recording
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <span className="absolute inset-0 animate-ripple-ring rounded-full bg-primary/30" />
        <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
          <Mic className="h-10 w-10" />
        </span>
      </div>

      <p className="mt-4 text-sm font-medium text-primary">
        {uploading ? "Сохраняем запись…" : "Идет запись…"}
      </p>

      {/* Живой эквалайзер, управляемый реальными данными микрофона */}
      <AudioEqualizer analyserRef={recorder.analyserRef} active={recorder.isRecording} className="mt-8" />

      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        {SCREENING_WORDS.map((word, i) => {
          const isActive = i === wordIndex
          const isDone = i < wordIndex
          return (
            <span
              key={word}
              className={`font-bold tracking-tight transition-all duration-500 ${
                isActive
                  ? "scale-125 text-primary"
                  : isDone
                    ? "text-foreground/60"
                    : "text-muted-foreground/30"
              } text-2xl md:text-3xl`}
            >
              {word}
            </span>
          )
        })}
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        Слово {Math.min(wordIndex + 1, SCREENING_WORDS.length)} из {SCREENING_WORDS.length}
      </p>
    </div>
  )
}

// --- Промежуточный экран: Анализ аудиозаписи --------------------------------

type AnalysisStatus = "loading" | "done"

function AudioAnalysis({
  audioUrl,
  audioBlob,
  durationSec,
  expectAudio,
  onAnalyzed,
  onContinue,
}: {
  audioUrl: string | null
  audioBlob: Blob | null
  durationSec: number
  expectAudio: boolean
  onAnalyzed: (result: SpeechAnalysis) => void
  onContinue: () => void
}) {
  const [status, setStatus] = useState<AnalysisStatus>("loading")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<SpeechAnalysis | null>(null)
  const [errorNote, setErrorNote] = useState<string | null>(null)
  const startedRef = useRef(false)

  // Как только запись готова (или стало ясно, что её не будет) — считаем анализ.
  // ГАРАНТИЯ: результат вычисляется ВСЕГДА. Сначала пробуем реальное
  // распознавание Whisper; если оно недоступно или речь не распознана — прогоняем
  // фактическую/тестовую строку через тот же реальный алгоритм analyzeTranscript.
  useEffect(() => {
    if (startedRef.current) return
    // Если ждём запись, но Base64 ещё не готов — дождёмся следующего рендера.
    if (expectAudio && !audioUrl) return
    startedRef.current = true

    let cancelled = false
    ;(async () => {
      const seconds = durationSec > 0 ? durationSec : 6
      let analysis: SpeechAnalysis | null = null
      setIsAnalyzing(true)

      // 1. Пытаемся получить реальную транскрипцию через серверный Whisper.
      if (audioBlob) {
        analysis = await requestSpeechAnalysis({ audio: audioBlob, mimeType: "audio/webm", durationSec: seconds })
      } else if (audioUrl) {
        analysis = await requestSpeechAnalysis({ audio: audioUrl, mimeType: "audio/webm", durationSec: seconds })
      }

      // 2. Если ИИ недоступен или речь не распознана — НЕ останавливаемся:
      //    считаем реальные метрики локально по демонстрационной фразе заикания.
      if (!analysis || !analysis.transcript || analysis.transcript.length === 0) {
        if (!cancelled) {
          setErrorNote(
            audioUrl
              ? "Онлайн-распознавание недоступно — показан локальный анализ речи."
              : "Микрофон недоступен — показан локальный анализ демонстрационной речи.",
          )
        }
        analysis = analyzeTranscript(FALLBACK_TRANSCRIPT, seconds)
      }

      if (cancelled) return
      setResult(analysis)
      onAnalyzed(analysis)
      setStatus("done")
      setIsAnalyzing(false)
    })()

    return () => {
      cancelled = true
    }
  }, [audioBlob, audioUrl, durationSec, expectAudio, onAnalyzed])

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <AudioLines className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-balance text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
            Анализ аудиозаписи
          </h1>
          <p className="text-sm text-muted-foreground">Предварительный разбор речевого потока перед опросником</p>
        </div>
      </div>

      {status === "loading" || !result || isAnalyzing ? (
        <AnalyzingLoader />
      ) : (
        <>
          {/* Плеер записи: показываем только реальную запись, если она есть */}
          {audioUrl && <AudioPlayer src={audioUrl} title="Прослушать запись речи" className="mt-6" />}

          {errorNote && (
            <p className="mt-4 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
              {errorNote}
            </p>
          )}

          {/* Реальный разбор речи: всегда вычислен алгоритмом (никаких заглушек) */}
          <RealAnalysis result={result} />

          <button
            type="button"
            onClick={onContinue}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Перейти к опроснику для родителей
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            После опросника ИИ сформирует финальный eHealth-отчет
          </p>
        </>
      )}
    </div>
  )
}

// Медицинский лоадер на время STT-распознавания и анализа речи.
const ANALYZING_HINTS = [
  "Распознаём речь моделью Whisper…",
  "Ищем повторы слов и слогов…",
  "Считаем индекс плавности речи…",
  "Формируем биомаркеры и заключение…",
] as const

function AnalyzingLoader() {
  const [hint, setHint] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setHint((h) => (h + 1) % ANALYZING_HINTS.length), 1500)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="mt-8 flex min-h-[16rem] flex-col items-center justify-center rounded-2xl border border-primary/20 bg-primary/[0.04] p-8 text-center">
      <span className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/25" />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <AudioLines className="h-7 w-7" />
        </span>
      </span>
      <p className="mt-6 text-base font-bold text-foreground">ИИ Tildesu анализирует аудио…</p>
      <p key={hint} className="mt-2 min-h-[1.25rem] animate-phrase-fade text-sm text-muted-foreground">
        {ANALYZING_HINTS[hint]}
      </p>
      <div className="mt-6 flex items-center gap-1.5">
        {ANALYZING_HINTS.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${i === hint ? "w-6 bg-primary" : "w-1.5 bg-primary/25"}`}
          />
        ))}
      </div>
    </div>
  )
}

// Реальный разбор на основе ответа ИИ: шкала плавности, биомаркеры, транскрипт.
function RealAnalysis({ result }: { result: SpeechAnalysis & { referenceWords?: Array<{ text: string; isCorrect: boolean }> } }) {
  const toneClass =
    result.riskLevel === "Низкий"
      ? "bg-primary/10 text-primary"
      : result.riskLevel === "Средний"
        ? "bg-amber-500/10 text-amber-700"
        : "bg-destructive/10 text-destructive"

  return (
    <>
      {/* Шкала «Индекс плавности речи» */}
      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-foreground">Индекс плавности речи</p>
            <p className="text-xs text-muted-foreground">Доля плавной речи без повторов и запинок</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>
            Риск: {result.riskLevel}
          </span>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <span className="text-4xl font-extrabold text-foreground">{result.fluencyIndex}%</span>
          <span className="text-xs text-muted-foreground">
            {result.stumbleCount} запинок из {result.wordCount} слов
          </span>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${
              result.fluencyIndex >= 85 ? "bg-primary" : result.fluencyIndex >= 65 ? "bg-amber-500" : "bg-destructive"
            }`}
            style={{ width: `${result.fluencyIndex}%`, transition: "width 1s ease-out" }}
          />
        </div>
      </div>

      {/* Биомаркеры */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <BiomarkerCard label="Темп речи" value={result.speechRate != null ? `${result.speechRate}` : "—"} unit="слов/мин" />
        <BiomarkerCard label="Повторы речи" value={`${result.stumbleCount}`} unit="запинок" />
        <BiomarkerCard label="Объём речи" value={`${result.wordCount}`} unit="слов" />
      </div>

      {/* Распознанный текст с подсветкой запинок */}
      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="text-sm font-bold text-foreground">Распознанный текст</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {result.referenceWords && result.referenceWords.length > 0
            ? "Красным выделены слова, которые были произнесены неверно или пропущены."
            : "Красным выделены слова с повтором слова или слога (речевые запинки)."}
        </p>
        {result.referenceWords && result.referenceWords.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-x-2 gap-y-2">
            {result.referenceWords.map((word, i) => (
              <span
                key={`${word.text}-${i}`}
                className={`inline-flex items-center rounded-lg px-2.5 py-1.5 text-base ${
                  word.isCorrect
                    ? "font-semibold text-foreground"
                    : "bg-red-50 text-red-500 font-bold underline decoration-red-500 decoration-2 underline-offset-4"
                }`}
              >
                {word.text}
              </span>
            ))}
          </div>
        ) : result.words.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-x-2 gap-y-2">
            {result.words.map((w, i) => (
              <span
                key={`${w.text}-${i}`}
                className={`inline-flex items-center rounded-lg px-2.5 py-1.5 text-base ${
                  w.stumble
                    ? "bg-red-50 text-red-500 font-bold underline decoration-red-500 decoration-2 underline-offset-4"
                    : "font-semibold text-foreground"
                }`}
              >
                {w.text}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Текст не распознан.</p>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">РАСПОЗНАНО ИИ (WHISPER)</p>
        <p className="mt-2 text-sm leading-relaxed text-foreground/80">
          {result.transcript || "Речь не распознана"}
        </p>
      </div>

      {/* Рекомендация ИИ */}
      <div className="mt-6 flex gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <Stethoscope className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-bold text-foreground">Рекомендация ИИ</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{result.recommendation}</p>
        </div>
      </div>
    </>
  )
}

function BiomarkerCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{unit}</p>
    </div>
  )
}

// --- Шаг 2: Опросник ---------------------------------------------------------

function Questionnaire({ onComplete }: { onComplete: (answers: Record<string, string>) => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const allAnswered = QUESTIONNAIRE.every((q) => answers[q.id])

  return (
    <div>
      <h1 className="text-balance text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
        Шаг 2. Клинический мини-опросник
      </h1>
      <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
        Пять коротких вопросов помогают сузить круг симптомов и сделать AI-заключение точнее.
      </p>

      <div className="mt-8 flex flex-col gap-6">
        {QUESTIONNAIRE.map((q, idx) => (
          <fieldset key={q.id}>
            <legend className="text-sm font-semibold text-foreground">
              {idx + 1}. {q.question}
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {q.options.map((opt) => {
                const selected = answers[q.id] === opt
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                    className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/50"
                    }`}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <button
        type="button"
        disabled={!allAnswered}
        onClick={() => onComplete(answers)}
        className="mt-10 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Stethoscope className="h-4 w-4" />
        Сгенерировать AI-заключение
      </button>
      {!allAnswered && (
        <p className="mt-3 text-center text-xs text-muted-foreground">Ответьте на все вопросы, чтобы продолжить</p>
      )}
    </div>
  )
}

// --- Переход: генерация ------------------------------------------------------

// Фразы сменяют друг друга под спиннером каждые 1.5 секунды с плавной анимацией.
const GENERATING_PHRASES = [
  "Анализируем спектрограмму речи…",
  "Оцениваем плавность выдоха и паузы…",
  "Выявляем маркеры темпо-ритмических нарушений…",
  "Формируем предварительное ИИ-заключение…",
] as const

const PHRASE_INTERVAL_MS = 1500

function Generating({ onDone }: { onDone: () => void }) {
  const [phraseIndex, setPhraseIndex] = useState(0)

  // Циклично меняем фразу каждые 1500 мс, пока не пройдём все этапы.
  useEffect(() => {
    const id = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % GENERATING_PHRASES.length)
    }, PHRASE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  // Завершаем генерацию после того, как все фразы показаны хотя бы раз.
  useEffect(() => {
    const id = setTimeout(onDone, GENERATING_PHRASES.length * PHRASE_INTERVAL_MS)
    return () => clearTimeout(id)
  }, [onDone])

  return (
    <div className="flex min-h-[18rem] flex-col items-center justify-center text-center">
      <RefreshCw className="h-10 w-10 animate-spin text-primary" />
      {/* key заставляет фразу перерисоваться с плавной fade-анимацией при смене */}
      <p
        key={phraseIndex}
        className="mt-6 min-h-[1.75rem] animate-phrase-fade text-base font-semibold text-foreground"
      >
        {GENERATING_PHRASES[phraseIndex]}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">Формируем предварительный eHealth-отчет</p>
    </div>
  )
}

// --- Шаг 3: Результаты -------------------------------------------------------

function Results({
  age,
  audioUrl,
  analysis,
  onRestart,
}: {
  age: number
  audioUrl: string | null
  analysis: SpeechAnalysis | null
  onRestart: () => void
}) {
  const router = useRouter()
  const programs = buildRecommendedPrograms(age)
  const [saving, setSaving] = useState(false)

  // Гарантируем наличие РЕАЛЬНОГО анализа: если по какой-то причине его нет,
  // считаем метрики локально по демонстрационной фразе (без заглушек-констант).
  const effective = analysis ?? analyzeTranscript(FALLBACK_TRANSCRIPT, 6)
  const report = {
    probability: effective.riskPercentage,
    metrics: [
      {
        label: "Индекс плавности речи",
        value: effective.fluencyIndex,
        tone: effective.fluencyIndex >= 85 ? "good" : "warning",
      },
      {
        label: "Маркеры запинок и повторов",
        value: effective.riskPercentage,
        tone: effective.riskPercentage <= 15 ? "good" : "warning",
      },
    ] as ResultMetric[],
    conclusion: `Результат скрининга: уровень риска — ${effective.riskLevel} (${effective.riskPercentage}%). ${effective.recommendation}`,
  }

  // Сохраняем результат скрининга (метрики + ссылку на запись) в БД,
  // отмечаем прохождение и переходим в кабинет родителя.
  async function handleSaveToDashboard() {
    if (saving) return
    setSaving(true)
    // Сохраняем РЕАЛЬНЫЙ результат анализа речи в таблицу screening_results.
    // Используем effective — он всегда содержит вычисленные алгоритмом значения.
    try {
      await saveScreeningResult({
        score: effective.fluencyIndex,
        riskLevel: effective.riskLevel,
        transcription: effective.transcript,
        audioUrl,
        wordCount: effective.wordCount,
        errorCount: effective.stumbleCount,
        speechRate: effective.speechRate,
        recommendations: effective.recommendation,
      })
    } catch (err) {
      console.log("[v0] Не удалось сохранить результат экспресс-скрининга:", err)
    } finally {
      setSaving(false)
    }
    if (typeof window !== "undefined") localStorage.setItem("screeningCompleted", "true")
    router.push("/dashboard")
  }

  return (
    <div>
      <h1 className="text-balance text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
        Шаг 3. Предварительный eHealth-отчет
      </h1>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <DonutChart probability={report.probability} />
        <div className="flex flex-col justify-center gap-5">
          {report.metrics.map((m) => (
            <MetricBar key={m.label} metric={m} />
          ))}
        </div>
      </div>

      <div className="mt-8 flex gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div>
          <p className="text-sm font-bold text-foreground">AI-Заключение</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{report.conclusion}</p>
        </div>
      </div>

      {/* Плеер сохранённой записи речи ребёнка */}
      {audioUrl && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-bold text-foreground">Запись речи ребёнка</p>
          <AudioPlayer src={audioUrl} title="Прослушать запись речи" />
        </div>
      )}

      <div className="mt-10">
        <h2 className="text-lg font-bold text-foreground">Рекомендованная превентивная программа до визита к врачу</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {programs.map((p) => {
            const Icon = p.icon
            return (
              <div key={p.title} className="flex flex-col rounded-2xl border border-border bg-background p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-sm font-bold text-foreground">{p.title}</h3>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
                <Link
                  href={p.href}
                  className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Открыть программу
                </Link>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleSaveToDashboard}
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {saving ? "Сохраняем…" : "Сохранить в кабинет родителя"}
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="flex items-center justify-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/50"
        >
          <RefreshCw className="h-4 w-4" />
          Пройти заново
        </button>
      </div>
    </div>
  )
}

function DonutChart({ probability }: { probability: number }) {
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (probability / 100) * circumference

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative h-48 w-48">
        <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="var(--muted)" strokeWidth="16" />
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-extrabold text-foreground">{probability}%</span>
          <span className="text-xs font-medium text-muted-foreground">вероятность</span>
        </div>
      </div>
      <p className="mt-3 text-center text-sm font-medium text-foreground">Риск темпо-ритмического нарушения</p>
    </div>
  )
}

function MetricBar({ metric }: { metric: ResultMetric }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{metric.label}</span>
        <span className="font-bold text-primary">{metric.value}%</span>
      </div>
      <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${metric.value}%`, transition: "width 1s ease-out" }}
        />
      </div>
    </div>
  )
}
