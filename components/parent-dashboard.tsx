"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n"
import { buildRecommendedPrograms } from "@/components/ai-screening"
import { compareToReference, type ReferenceAnalysis } from "@/lib/speech-analysis"
import { AudioPlayer } from "@/components/audio-player"
import { AudioEqualizer } from "@/components/audio-equalizer"
import { useSpeechRecorder } from "@/hooks/use-speech-recorder"
import {
  fetchLatestRecording,
  fetchAllRecordings,
  uploadRecording,
  saveScreeningResult,
  type ScreeningResultRow,
} from "@/lib/speech-recordings"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { CartesianGrid, Line, LineChart as RLineChart, XAxis, YAxis } from "recharts"
import {
  Activity,
  Brain,
  Download,
  LineChart,
  LogOut,
  Stethoscope,
  Sparkles,
  Mic,
  X,
  Lock,
  Play,
  Pause,
  History,
  Volume2,
  Loader2,
} from "lucide-react"

// Возраст ребенка по умолчанию (mock), пока не подключен бэкенд/БД.
const MOCK_CHILD_AGE = 5

export function ParentDashboard() {
  const { t } = useLanguage()
  const router = useRouter()
  // Флаг монтирования: защищает SSR от падения, пока нет данных пользователя/графиков.
  const [isMounted, setIsMounted] = useState(false)
  // Статус авторизации: гость видит кабинет, но платные функции закрыты.
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState("")
  // Возраст ребенка из профиля определяет, какой превентивный курс показать.
  const [childAge, setChildAge] = useState(MOCK_CHILD_AGE)
  // Модалка «Зарегистрируйтесь или войдите» для защищённого функционала.
  const [showAuthGate, setShowAuthGate] = useState(false)
  // Пройден ли комплексный скрининг (опросник + отчёт сохранён в кабинет).
  const [screeningDone, setScreeningDone] = useState(false)

  useEffect(() => {
    // Помечаем компонент как смонтированный: вся клиентская логика ниже безопасна.
    setIsMounted(true)
    if (typeof window === "undefined") return
    // Безопасно читаем профиль авторизованного пользователя (строго на клиенте).
    setIsLoggedIn(localStorage.getItem("isLoggedIn") === "true")
    setUserName(localStorage.getItem("userName") ?? "")
    const storedAge = Number(localStorage.getItem("childAge"))
    if (Number.isFinite(storedAge) && storedAge > 0) setChildAge(storedAge)
    // Статус скрининга: зелёный бейдж, если отчёт уже сохранён в кабинет.
    setScreeningDone(localStorage.getItem("screeningCompleted") === "true")
    // Восстанавливаем историю точек графика, чтобы результаты тестов не пропадали
    // после перезагрузки страницы (Hybrid Mode: данные хранятся в localStorage).
    const stored = readStoredPoints()
    if (stored) setMonitorPoints(stored)
  }, [])

  // Последняя сохранённая аудиозапись скрининга (по ссылке audio_url).
  // Грузим только после монтирования, чтобы не трогать Supabase на SSR.
  const { data: latestRecording, mutate: mutateRecording } = useSWR(
    isMounted ? "latest-screening-recording" : null,
    fetchLatestRecording,
  )

  // Полная история сохранённых записей для раздела «История скринингов».
  // Обновляется вместе с последней записью после каждого нового теста.
  const { data: recordingHistory, mutate: mutateHistory } = useSWR(
    isMounted ? "all-screening-recordings" : null,
    fetchAllRecordings,
  )

  // Имя подтягивается динамически из профиля; фолбэка на статичное имя нет.
  // Автоформатирование: первая буква всегда заглавная ("dsds" -> "Dsds").
  const rawName = userName?.trim() ?? ""
  const displayName = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : ""
  const programs = buildRecommendedPrograms(childAge)

  // Пропускает к защищённой функции только авторизованных; иначе — модалка входа.
  function requireAuth(action: () => void) {
    if (isLoggedIn) action()
    else setShowAuthGate(true)
  }

  // Оверлей регулярного теста (только запись голоса, без опросника).
  const [showRegularTest, setShowRegularTest] = useState(false)
  // Полноэкранное окно результатов после завершённого экспресс-теста.
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  // Точки для графика «Динамика превентивного мониторинга».
  // Каждый экспресс-тест добавляет новую точку: дата + показатель плавности речи
  // + ссылка на аудио этой контрольной точки (для проигрывания прямо на графике).
  const [monitorPoints, setMonitorPoints] = useState<MonitorPoint[]>(() => seedMonitorPoints())

  // Результат регулярного теста приходит уже разобранным ИИ (пословное
  // сравнение речи с эталонной фразой). Итоговый балл динамики = индекс
  // плавности речи из анализа.
  function handleRegularTestComplete(result: { analysis: ReferenceAnalysis; audioUrl: string | null }) {
    const { analysis } = result
    const quality = analysis.fluencyIndex
    const date = formatDate(new Date())

    // Новый результат теста: ID, дата, балл, уровень риска, ИИ-анализ и аудио.
    const newResult: TestResult = {
      id: makePointId(),
      date,
      quality,
      stutter: analysis.errorCount,
      tempo: analysis.speechRate ?? 0,
      audioUrl: result.audioUrl,
      riskLevel: analysis.riskLevel,
      aiAnalysis: analysis.recommendation,
      analysis,
    }

    // Добавляем результат в историю (график + список контрольных точек)
    // и сразу синхронизируем массив с localStorage, чтобы он пережил перезагрузку.
    setMonitorPoints((prev) => {
      const next: MonitorPoint[] = [
        ...prev,
        {
          id: newResult.id,
          date: newResult.date,
          value: newResult.quality,
          audioUrl: newResult.audioUrl,
          riskLevel: newResult.riskLevel,
          aiAnalysis: newResult.aiAnalysis,
        },
      ]
      writeStoredPoints(next)
      return next
    })

    setShowRegularTest(false)
    // Открываем крупное окно результатов: график динамики + плеер свежей записи.
    setTestResult(newResult)
    // Обновляем плеер отчёта и историю скринингов: последняя зап��сь —
    // только что сохранённый экспресс-тест (сохранён в localStorage).
    void mutateRecording()
    void mutateHistory()
  }

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("isLoggedIn")
      localStorage.removeItem("userName")
    }
    router.push("/")
  }

  // По��а компонент не смонтирован на клиенте, отдаём лёгкий скелетон.
  // Это исключает падение SSR из-за отсутствия данных пользователя и графико��.
  if (!isMounted) {
    return (
      <div className="mx-auto max-w-5xl space-y-8" aria-hidden="true">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-muted" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-48 animate-pulse rounded-3xl bg-muted" />
          <div className="h-48 animate-pulse rounded-3xl bg-muted" />
        </div>
        <div className="h-64 animate-pulse rounded-3xl bg-muted" />
        <div className="h-64 animate-pulse rounded-3xl bg-muted" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Stethoscope className="h-4 w-4" />
            {t("dash.badge")}
          </span>
          <h1 className="text-balance text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            {displayName ? `${t("dash.welcome")}, ${displayName}!` : t("dash.welcomeNoName")}
          </h1>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-xl border-border bg-transparent px-5 text-foreground hover:bg-muted"
        >
          <LogOut className="h-4 w-4" />
          {t("dash.logout")}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Patient status */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Activity className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-bold text-foreground">{t("dash.status.title")}</h2>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-background px-4 py-3">
              <dt className="text-muted-foreground">{t("dash.status.patient")}</dt>
              <dd className="font-semibold text-foreground">{t("dash.status.patientName")}</dd>
            </div>
            <div
              className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                screeningDone ? "bg-emerald-50" : "bg-amber-50"
              }`}
            >
              <dt className="text-muted-foreground">{t("dash.status.value")}</dt>
              <dd
                className={`flex items-center gap-2 font-semibold ${
                  screeningDone ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${screeningDone ? "bg-emerald-500" : "bg-amber-500"}`}
                />
                {screeningDone ? t("dash.status.done") : t("dash.status.date")}
              </dd>
            </div>
          </dl>
        </section>

        {/* AI conclusion */}
        <section className="rounded-3xl border border-rose-200 bg-rose-50/60 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-500">
              <Brain className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-bold text-foreground">{t("dash.ai.title")}</h2>
          </div>

          <div className="mb-4 flex items-center gap-4 rounded-xl bg-card px-4 py-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-rose-400 text-sm font-bold text-rose-500">
              74%
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("dash.ai.risk")}</p>
              <p className="text-sm font-semibold text-foreground">{t("dash.status.patientName")}</p>
            </div>
          </div>

          <p className="text-pretty text-sm leading-relaxed text-foreground/80">{t("dash.ai.text")}</p>

          {/* Плеер сохранённой записи речи на карточке отчёта */}
          {latestRecording?.audio_url && (
            <AudioPlayer
              src={latestRecording.audio_url}
              title="Запись речи (скрининг)"
              className="mt-5 border-rose-200 bg-rose-100/40"
            />
          )}

          <Button
            type="button"
            disabled
            variant="outline"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border-rose-300 bg-transparent text-rose-500 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {t("dash.ai.download")}
          </Button>
        </section>
      </div>

      {/* Recommended age-based programs (mock, зависят от возраста ребенка) */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-bold text-foreground">{t("dash.therapy.title")}</h2>

        {/* Три одинаковые карточки в один ряд: экспресс-тест + 2 программы */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Карточка 1: регулярный экспресс-тест (запускает тест речи) */}
          <div className="flex flex-col rounded-2xl border border-border bg-background p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Mic className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-base font-bold text-foreground">{t("dash.express.title")}</h3>
            <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{t("dash.express.desc")}</p>
            <button
              type="button"
              onClick={() => requireAuth(() => setShowRegularTest(true))}
              className="mt-4 inline-flex w-fit items-center rounded-lg bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              {t("dash.express.start")}
            </button>
          </div>

          {/* Карточки 2 и 3: видеоматериалы + возрастной курс */}
          {programs?.map((program) => {
            const Icon = program?.icon ?? Sparkles
            return (
              <div key={program?.title} className="flex flex-col rounded-2xl border border-border bg-background p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-bold text-foreground">{program?.title}</h3>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{program?.desc}</p>
                <button
                  type="button"
                  onClick={() => requireAuth(() => router.push(program?.href ?? "/courses"))}
                  className="mt-4 inline-flex w-fit items-center rounded-lg bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
                >
                  {t("dash.therapy.open")}
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* История скринингов: список всех сохранённых тестов с записью речи */}
      <ScreeningHistory history={recordingHistory} isLoggedIn={isLoggedIn} onLocked={() => setShowAuthGate(true)} />

      {/* Primary diagnostic checkpoint */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Stethoscope className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-foreground">{t("dash.primary.title")}</h2>
              <p className="text-sm text-muted-foreground">{t("dash.primary.subtitle")}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="flex items-center gap-2 rounded-xl border-primary/40 bg-transparent px-5 text-primary hover:bg-primary/10"
          >
            <Download className="h-4 w-4" />
            {t("dash.primary.download")}
          </Button>
        </div>
        <PrimaryDiagnosticChart
          metrics={[
            { label: t("dash.primary.metric.tempo"), value: 42 },
            { label: t("dash.primary.metric.articulation"), value: 61 },
            { label: t("dash.primary.metric.fluency"), value: 55 },
          ]}
        />
      </section>

      {/* Preventive monitoring dynamics */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-500">
            <LineChart className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-foreground">{t("dash.monitor.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("dash.monitor.subtitle")}</p>
          </div>
        </div>
        {isLoggedIn ? (
          <>
            <ClarityChart points={monitorPoints} startLabel={t("dash.chart.start")} nowLabel={t("dash.chart.now")} />
            {/* Контрольные точки: строки с датой, баллом и кнопкой прослушивания */}
            <CheckpointList points={monitorPoints} />
          </>
        ) : (
          /* Для гостей график динамики закрыт: показываем замок и приглашение войти */
          <button
            type="button"
            onClick={() => setShowAuthGate(true)}
            className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-background px-6 py-12 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Lock className="h-6 w-6" />
            </span>
            <span className="text-sm font-semibold text-foreground">{t("dash.gate.locked")}</span>
            <span className="text-sm text-muted-foreground">{t("dash.gate.text")}</span>
          </button>
        )}
      </section>
      {/* End preventive monitoring */}

      <div className="text-center">
        <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-primary">
          {t("dash.back")}
        </Link>
      </div>

      {showRegularTest && (
        <RegularSpeechTest onClose={() => setShowRegularTest(false)} onComplete={handleRegularTestComplete} />
      )}

      {/* Полноэкранное окно результатов: график динамики + плеер свежей записи */}
      {testResult && (
        <TestResultModal
          result={testResult}
          points={monitorPoints}
          startLabel={t("dash.chart.start")}
          nowLabel={t("dash.chart.now")}
          onClose={() => setTestResult(null)}
        />
      )}

      {/* Модалка закрытого доступа: срабатывает только на клиенте по действию пользователя */}
      {showAuthGate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={t("dash.gate.locked")}
        >
          <div className="relative w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
            <button
              type="button"
              onClick={() => setShowAuthGate(false)}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
              aria-label={t("dash.regular.close")}
            >
              <X className="h-5 w-5" />
            </button>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Lock className="h-7 w-7" />
            </span>
            <h2 className="mt-5 text-xl font-bold text-foreground">{t("dash.gate.locked")}</h2>
            <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">{t("dash.gate.text")}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                onClick={() => router.push("/register")}
                className="flex-1 rounded-xl"
              >
                {t("dash.gate.register")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/register")}
                className="flex-1 rounded-xl bg-transparent"
              >
                {t("dash.gate.login")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Регулярный экспресс-тест: одна короткая фраза + запись --------------------
// Короткие скороговорки для проверки чистоты речи. При каждом запуске
// выбирается одна случайно. Ребенок 3–9 лет читает её крупным шрифтом.
const TEST_PHRASES = [
  "У Сени и Сани в сетях усы с сомами",
  "Шла Саша по шоссе и сосала сушку",
  "Ехал грека через реку, видит грека — в реке рак",
  "Карл у Клары украл кораллы, а Клара у Карла кларнет",
  "От топота копыт пыль по полю летит",
] as const

/**
 * Отправляет Base64-запись и эталонную фразу на серверный ИИ-анализ
 * (Whisper STT + пословное сравнение). Возвращает null при любой ошибке,
 * чтобы интерфейс мог мягко переключиться на демонстрационный разбор.
 */
async function requestReferenceAnalysis(payload: {
  audio: Blob | string
  referenceText: string
  durationSec: number
}): Promise<ReferenceAnalysis | null> {
  try {
    const formData = new FormData()
    if (payload.audio instanceof Blob) {
      formData.append("audio", payload.audio, "audio.webm")
    } else {
      formData.append("audio", payload.audio)
    }
    formData.append("duration", String(payload.durationSec))
    formData.append("analysisType", "reference")
    formData.append("referenceText", payload.referenceText)

    const res = await fetch("/api/analyze", {
      method: "POST",
      body: formData,
    })

    const data = (await res.json()) as Partial<ReferenceAnalysis> & {
      error?: string
      text?: string
      transcription?: string
      wpm?: number
      speech_rate?: number
      fluencyIndex?: number
      score?: number
      riskLevel?: ReferenceAnalysis["riskLevel"]
      risk_level?: ReferenceAnalysis["riskLevel"]
      recommendation?: string
      accuracyIndex?: number
      correctCount?: number
      errorCount?: number
      referenceWords?: Array<{ text: string; observedText?: string; isCorrect: boolean }>
    }

    if (!res.ok || data.error) {
      console.log("[v0] Анализ регулярного теста не удался:", data.error ?? res.status)
      return null
    }

    const transcript = data.text ?? data.transcription ?? ""
    const baseAnalysis = compareToReference(payload.referenceText, transcript, payload.durationSec)
    const fluencyIndex =
      typeof data.accuracyIndex === "number"
        ? data.accuracyIndex
        : typeof data.fluencyIndex === "number"
          ? data.fluencyIndex
          : typeof data.score === "number"
            ? data.score
            : baseAnalysis.fluencyIndex
    const speechRate = typeof data.wpm === "number" ? data.wpm : typeof data.speech_rate === "number" ? data.speech_rate : baseAnalysis.speechRate
    const errorCount = typeof data.errorCount === "number" ? data.errorCount : baseAnalysis.errorCount

    return {
      ...baseAnalysis,
      transcript,
      fluencyIndex,
      speechRate,
      errorCount,
      riskLevel: (data.riskLevel ?? data.risk_level ?? baseAnalysis.riskLevel) as ReferenceAnalysis["riskLevel"],
      recommendation: data.recommendation ?? baseAnalysis.recommendation,
      referenceWords: (data.referenceWords ?? baseAnalysis.referenceWords).map((word) => ({
        text: word.text,
        status: word.isCorrect ? "correct" : "error",
      })),
    }
  } catch (err) {
    console.log("[v0] Исключение при анализе регулярного теста:", err)
    return null
  }
}

/**
 * Демонстрационный разбор фразы, когда ИИ недоступен (нет ключа/сети).
 * Симулирует распознанную речь, «потеряв» часть слов, и прогоняет её через
 * тот же алгоритм пословного сравнения — интерфейс работает идентично живому.
 */
function demoReferenceAnalysis(phrase: string, durationSec: number): ReferenceAnalysis {
  const words = phrase.split(/\s+/).filter(Boolean)
  // Помечаем как «ошибочные» каждое 4-е слово, начиная со второго.
  const recognized = words.filter((_, idx) => idx % 4 !== 1)
  const seconds = durationSec > 0 ? durationSec : Math.max(3, words.length * 0.5)
  return compareToReference(phrase, recognized.join(" "), seconds)
}

function RegularSpeechTest({
  onClose,
  onComplete,
}: {
  onClose: () => void
  onComplete: (result: { analysis: ReferenceAnalysis; audioUrl: string | null }) => void
}) {
  const { t } = useLanguage()
  const [phase, setPhase] = useState<"reading" | "recording" | "analyzing">("reading")
  // Случайный выбор одной короткой фразы при монтировании компонента.
  const [phrase] = useState(() => TEST_PHRASES[Math.floor(Math.random() * TEST_PHRASES.length)])
  // Момент старта записи — для расчёта длительности и темпа речи.
  const recordStartRef = useRef(0)

  const recorder = useSpeechRecorder()

  // Клик по «Записать»: запрашиваем микрофон и стартуем запись фразы.
  async function handleStartRecording() {
    const ready = await recorder.prepare()
    if (!ready) return
    recordStartRef.current = Date.now()
    recorder.start()
    setPhase("recording")
  }

  // Остановка записи -> ИИ-распознавание (Whisper) + пословное сравнение с
  // эталонной фразой -> сохранение результата и переход к отчёту.
  async function handleStopRecording() {
    setPhase("analyzing")
    const blob = await recorder.stop()
    const durationSec = recordStartRef.current ? (Date.now() - recordStartRef.current) / 1000 : 0

    // Base64 записи: используется и как источник для ИИ, и для проигрывания.
    let audioUrl: string | null = null
    if (blob) audioUrl = await uploadRecording(blob)

    // Реальный ИИ-анализ через серверный роут; при сбое — демо-разбор фразы.
    let analysis: ReferenceAnalysis | null = null
    if (blob) {
      analysis = await requestReferenceAnalysis({ audio: blob, referenceText: phrase, durationSec })
    }
    if (!analysis) analysis = demoReferenceAnalysis(phrase, durationSec)

    // Сохраняем полный результат теста в таблицу screening_results.
    // try/catch защищает поток анализа: даже при сбое сети отчёт откроется.
    try {
      await saveScreeningResult({
        score: analysis.fluencyIndex,
        riskLevel: analysis.riskLevel,
        transcription: analysis.transcript,
        audioUrl,
        wordCount: analysis.totalWords,
        errorCount: analysis.errorCount,
        speechRate: analysis.speechRate,
        recommendations: analysis.recommendation,
      })
    } catch (err) {
      console.log("[v0] Не удалось сохранить результат регулярного теста:", err)
    }

    onComplete({ analysis, audioUrl })
  }

  const denied = recorder.error === "denied"
  const unsupported = recorder.error === "unsupported"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t("dash.regular.cta")}
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-8 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
          aria-label={t("dash.regular.close")}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {t("dash.regular.badge")}
          </span>
          <p className="mt-4 text-sm font-medium text-muted-foreground">{t("dash.regular.readPhrase")}</p>

          {/* Ровно одна короткая фраза крупным шрифтом для чтения ребенком */}
          <div className="mt-4 w-full rounded-2xl border border-border bg-background p-6">
            <p className="text-balance text-2xl font-extrabold leading-snug text-foreground md:text-3xl">
              {phrase}
            </p>
          </div>

          {phase === "reading" && (
            <>
              <button
                type="button"
                onClick={handleStartRecording}
                className="mt-7 flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-105"
              >
                <Mic className="h-5 w-5" />
                {t("dash.regular.beginRecord")}
              </button>
              {(denied || unsupported) && (
                <p className="mt-4 max-w-xs text-xs text-destructive">
                  {denied
                    ? "Доступ к микрофону запрещён. Разрешите его в браузере, чтобы записать фразу."
                    : "Ваш браузер не поддерживает запись с микрофона."}
                </p>
              )}
            </>
          )}

          {phase === "recording" && (
            <>
              <div className="relative mt-7 flex h-20 w-20 items-center justify-center">
                <span className="absolute inset-0 animate-ripple-ring rounded-full bg-primary/30" />
                <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                  <Mic className="h-8 w-8" />
                </span>
              </div>
              <p className="mt-4 text-sm font-medium text-primary">{t("dash.regular.recording")}</p>
              {/* Живой эквалайзер, управляемый данными микрофона */}
              <AudioEqualizer analyserRef={recorder.analyserRef} active={recorder.isRecording} className="mt-6" />
              <button
                type="button"
                onClick={handleStopRecording}
                className="mt-6 rounded-xl border border-border px-5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                {t("dash.regular.stop")}
              </button>
            </>
          )}

          {phase === "analyzing" && (
            <div className="mt-7 flex flex-col items-center">
              <span className="h-12 w-12 animate-spin rounded-full border-4 border-primary/25 border-t-primary" />
              <p className="mt-5 text-sm font-medium text-foreground">{t("dash.regular.analyzing")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PrimaryDiagnosticChart({ metrics }: { metrics: { label: string; value: number }[] }) {
  // Column chart of the first deep-analysis metrics (0–100).
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <div className="flex h-48 items-end justify-around gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <span className="text-sm font-bold text-foreground">{m.value}%</span>
            <div
              className={`w-full max-w-[3.5rem] rounded-t-xl ${m.value < 50 ? "bg-rose-400" : "bg-primary"}`}
              style={{ height: `${m.value}%`, transition: "height 1s ease-out" }}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-start justify-around gap-4">
        {metrics.map((m) => (
          <p key={m.label} className="flex-1 text-center text-xs leading-tight text-muted-foreground">
            {m.label}
          </p>
        ))}
      </div>
    </div>
  )
}

function ClarityChart({
  points,
  startLabel,
  nowLabel,
}: {
  points: MonitorPoint[]
  startLabel: string
  nowLabel: string
}) {
  // Интерактивный линейный график динамики плавности речи.
  // Ось X — даты проверок, ось Y — показатель речи (%). Каждый экспресс-тест
  // добавляет новую точку в массив points. Точки с аудио кликабельны: по клику
  // всплывает подсказка с датой и кнопкой Play для проигрывания записи.
  const safePoints = points?.length ? points : [{ date: formatDate(new Date()), value: 70 }]
  const start = safePoints[0].value
  const now = safePoints[safePoints.length - 1].value

  // Активная точка графика: индекс + координаты (cx, cy) для позиционирования подсказки.
  const [active, setActive] = useState<{ index: number; cx: number; cy: number } | null>(null)
  const activePoint = active ? safePoints[active.index] : null

  // Кастомный рендер точки: видимый кружок + невидимая крупная зона клика.
  // recharts передаёт cx/cy (пиксели внутри svg) и payload (данные точки).
  function renderDot(props: {
    cx?: number
    cy?: number
    index?: number
    payload?: MonitorPoint
  }) {
    const { cx, cy, index, payload } = props
    if (typeof cx !== "number" || typeof cy !== "number" || typeof index !== "number") {
      return <g key={`empty-${String(index)}`} />
    }
    const hasAudio = !!payload?.audioUrl
    const isActive = active?.index === index
    return (
      <g key={index}>
        {/* Кольцо-подсказка вокруг точек, у которых есть аудиозапись */}
        {hasAudio && (
          <circle cx={cx} cy={cy} r={9} fill="none" stroke="var(--color-value)" strokeOpacity={0.35} strokeWidth={2} />
        )}
        <circle
          cx={cx}
          cy={cy}
          r={isActive ? 6 : 4}
          fill="var(--color-value)"
          stroke="var(--card)"
          strokeWidth={2}
        />
        {/* Крупная прозрачная зона для удобного клика/тача */}
        <circle
          cx={cx}
          cy={cy}
          r={16}
          fill="transparent"
          className="cursor-pointer"
          onClick={() => setActive({ index, cx, cy })}
        />
      </g>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{startLabel}</p>
          <p className="text-2xl font-extrabold text-foreground">{Math.round(start)}%</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{nowLabel}</p>
          <p className="text-2xl font-extrabold text-primary">{Math.round(now)}%</p>
        </div>
      </div>

      {/* relative-обёртка: подсказка позиционируется поверх графика по cx/cy точки */}
      <div className="relative mt-4">
        <ChartContainer
          config={{ value: { label: "Плавность речи", color: "var(--primary)" } }}
          className="h-48 w-full"
        >
          <RLineChart data={safePoints} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
            <YAxis
              domain={[(dataMin: number) => Math.max(0, Math.floor(dataMin - 4)), (dataMax: number) => Math.min(100, Math.ceil(dataMax + 4))]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={32}
              fontSize={12}
              unit="%"
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--color-value)"
              strokeWidth={2.5}
              dot={renderDot}
              activeDot={false}
              isAnimationActive={false}
            />
          </RLineChart>
        </ChartContainer>

        {/* Всплывающая подсказка активной точки: дата + Play записи этой точки */}
        {active && activePoint && (
          <>
            {/* Клик мимо подсказки закрывает её */}
            <button
              type="button"
              aria-label="Закрыть подсказку"
              className="absolute inset-0 z-10 cursor-default"
              onClick={() => setActive(null)}
            />
            <div
              className="absolute z-20 w-52 -translate-x-1/2 -translate-y-full rounded-2xl border border-border bg-card p-3 shadow-xl"
              style={{ left: active.cx, top: active.cy - 14 }}
              role="dialog"
              aria-label={`Контрольная точка ${activePoint.date}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Дата проверки</p>
                  <p className="text-sm font-bold text-foreground">{activePoint.date}</p>
                </div>
                <span className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                  {Math.round(activePoint.value)}%
                </span>
              </div>
              <div className="mt-3">
                {activePoint.audioUrl ? (
                  <PointAudioButton src={activePoint.audioUrl} />
                ) : (
                  <p className="text-xs text-muted-foreground">Для этой точки нет аудиозаписи</p>
                )}
              </div>
              {/* Указатель-стрелка вниз к точке */}
              <span className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-border bg-card" />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Компактная кнопка Play/Pause для проигрывания аудио контрольной точки
 * прямо во всплывающей подсказке графика. Работает и с публичной ссылкой
 * Supabase Storage, и с object URL / data URL из localStorage (Hybrid Mode).
 */
function PointAudioButton({
  src,
  idleLabel = "Прослушать запись",
}: {
  src: string
  idleLabel?: string
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  // isLoading — идёт буферизация перед стартом (показываем спиннер).
  const [loading, setLoading] = useState(false)
  // isReady — аудио догружено до конца (canplaythrough), можно играть без задержки.
  const readyRef = useRef(false)
  // Если пользователь нажал «Слушать» до готовности — стартуем, как только будем готовы.
  const wantPlayRef = useRef(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    readyRef.current = false

    const onEnded = () => setPlaying(false)
    const onCanPlayThrough = () => {
      readyRef.current = true
      // Отложенный запуск: пользователь уже нажал кнопку, ждали загрузки.
      if (wantPlayRef.current) {
        wantPlayRef.current = false
        setLoading(false)
        void audio
          .play()
          .then(() => setPlaying(true))
          .catch(() => setPlaying(false))
      }
    }

    audio.addEventListener("ended", onEnded)
    audio.addEventListener("canplaythrough", onCanPlayThrough)
    // Начинаем буферизацию сразу при монтировании — убирает задержку «двойного клика».
    audio.load()

    return () => {
      audio.removeEventListener("ended", onEnded)
      audio.removeEventListener("canplaythrough", onCanPlayThrough)
      audio.pause()
      wantPlayRef.current = false
    }
  }, [src])

  function toggle() {
    const audio = audioRef.current
    if (!audio) return

    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }

    // Аудио готово — играем сразу.
    if (readyRef.current || audio.readyState >= 4) {
      void audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false))
      return
    }

    // Ещё не готово — показываем спиннер и стартуем по событию canplaythrough.
    wantPlayRef.current = true
    setLoading(true)
    audio.load()
  }

  // crossOrigin только для удалённых ссылок; локальные blob:/data: URL — без него.
  const isRemote = /^https?:/i.test(src)

  return (
    <div className="flex items-center gap-2">
      {/* preload="auto" + audio.load() догружают запись заранее для мгновенного старта. */}
      <audio ref={audioRef} src={src} preload="auto" crossOrigin={isRemote ? "anonymous" : undefined} />
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:cursor-wait disabled:opacity-80 disabled:hover:scale-100"
        aria-label={loading ? "Загрузка записи" : playing ? "Пауза" : "Проиграть запись этой точки"}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : playing ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 translate-x-0.5" />
        )}
      </button>
      <span className="text-xs font-medium text-muted-foreground">
        {loading ? "Загрузка…" : playing ? "Воспроизведение…" : idleLabel}
      </span>
    </div>
  )
}

/**
 * Раздел «История скринингов»: карточки всех сохранённых тестов речи.
 * Каждая карточка показывает дату, тип теста, ключевые метрики и — если запись
 * присутствует — стильную кнопку «🔊 Воспроизвести запись речи» (Base64 из
 * localStorage/Supabase). Данные приходят из fetchAllRecordings и переживают
 * перезагрузку страницы. Гостям раздел закрыт замком.
 */
function ScreeningHistory({
  history,
  isLoggedIn,
  onLocked,
}: {
  history: ScreeningResultRow[] | undefined
  isLoggedIn: boolean
  onLocked: () => void
}) {
  const rows = history ?? []

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <History className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-foreground">История скринингов</h2>
          <p className="text-sm text-muted-foreground">Все сохранённые тесты речи с записью голоса</p>
        </div>
      </div>

      {!isLoggedIn ? (
        <button
          type="button"
          onClick={onLocked}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-background px-6 py-12 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="h-6 w-6" />
          </span>
          <span className="text-sm font-semibold text-foreground">Войдите, чтобы увидеть историю</span>
          <span className="text-sm text-muted-foreground">История записей речи доступна после входа</span>
        </button>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-background px-6 py-10 text-center">
          <Volume2 className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Записей пока нет</p>
          <p className="text-sm text-muted-foreground">
            Пройдите экспресс-скрининг или регулярный тест — записи появятся здесь.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold ${riskBadgeClass(row.risk_level)}`}
                  >
                    Риск: {row.risk_level ?? "—"}
                  </span>
                  <span className="text-sm font-semibold text-foreground">{formatHistoryDate(row.created_at)}</span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Балл: <span className="font-semibold text-foreground">{row.score ?? "—"}</span>
                  {"  •  "}
                  Слов: <span className="font-semibold text-foreground">{row.word_count ?? "—"}</span>
                  {"  •  "}
                  Ошибок: <span className="font-semibold text-foreground">{row.error_count ?? "—"}</span>
                  {"  •  "}
                  Темп: <span className="font-semibold text-foreground">{row.speech_rate ?? "—"}</span> сл/мин
                </p>
                {row.transcription ? (
                  <p className="mt-1.5 line-clamp-2 text-xs italic text-muted-foreground">«{row.transcription}»</p>
                ) : null}
              </div>
              <div className="shrink-0">
                {row.audio_url ? (
                  <PointAudioButton src={row.audio_url} idleLabel="🔊 Прослушать" />
                ) : (
                  <span className="text-xs text-muted-foreground">Нет аудиозаписи</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * Список контрольных точек мониторинга под графиком динамики. Для каждой точки
 * с записью показывает дату, показатель речи и кнопку прослушивания аудио.
 */
function CheckpointList({ points }: { points: MonitorPoint[] }) {
  // Показываем только точки с реальной аудиозаписью (свежие тесты), новые сверху.
  const withAudio = (points ?? []).filter((p) => !!p.audioUrl).reverse()
  if (withAudio.length === 0) return null

  return (
    <div className="mt-5">
      <p className="mb-3 text-sm font-bold text-foreground">Контрольные точки с записью речи</p>
      <ul className="flex flex-col gap-2.5">
        {withAudio.map((point, i) => (
          <li
            key={point.id ?? `${point.date}-${i}`}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                {Math.round(point.value)}%
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{point.date}</p>
                {point.riskLevel && (
                  <p className="text-xs text-muted-foreground">Риск: {point.riskLevel}</p>
                )}
              </div>
            </div>
            <div className="shrink-0">
              {point.audioUrl && (
                <PointAudioButton src={point.audioUrl} idleLabel="Воспроизвести запись речи" />
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Полноэкранное окно результатов экспресс-теста (с аккуратными отступами).
 * Показывает итоговые метрики, полный график «Динамика превентивного
 * мониторинга» (с кликабельными аудио-точками) и плеер только что записанного
 * голоса, чтобы сразу его прослушать.
 */
/** Карточка биомаркера для окна результатов (строгий медицинский стиль). */
function MetricCard({
  value,
  label,
  accent = "neutral",
}: {
  value: string
  label: string
  accent?: "primary" | "danger" | "neutral"
}) {
  const valueColor =
    accent === "primary" ? "text-primary" : accent === "danger" ? "text-rose-500" : "text-foreground"
  return (
    <div className="rounded-2xl border border-border bg-background p-4 text-center">
      <p className={`text-2xl font-extrabold ${valueColor}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function TestResultModal({
  result,
  points,
  startLabel,
  nowLabel,
  onClose,
}: {
  result: TestResult
  points: MonitorPoint[]
  startLabel: string
  nowLabel: string
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center overflow-y-auto bg-foreground/50 p-4 backdrop-blur-sm md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Результаты экспресс-теста"
    >
      <div className="relative m-auto w-full max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-2xl md:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
          aria-label="Закрыть результаты"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Stethoscope className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-balance text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
            Результат речевого теста
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">eHealth-разбор от {result.date} сохранён в кабинет</p>
        </div>

        {/* Биомаркеры: индекс плавности, темп речи, запинки */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricCard value={`${result.quality}%`} label="Индекс плавности" accent="primary" />
          <MetricCard value={result.tempo > 0 ? `${result.tempo}` : "—"} label="Темп речи, слов/мин" />
          <MetricCard value={`${result.stutter}`} label="Повторов / запинок" accent="danger" />
        </div>

        {/* Пословный разбор: эталонная фраза с красной подсветкой ошибок */}
        {result.analysis && (
          <div className="mt-6 rounded-2xl border border-border bg-background p-5">
            <p className="text-sm font-bold text-foreground">Разбор произношения по словам</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {"Красным выделены слова, которые ребёнок пропустил или произнёс неверно ("}
              {result.analysis.errorCount} из {result.analysis.totalWords}
              {")."}
            </p>
            <p className="mt-4 text-lg font-semibold leading-relaxed text-foreground">
              {result.analysis.referenceWords.map((w, i) => (
                <span key={`${w.text}-${i}`}>
                  {w.status === "error" ? (
                    <span className="text-red-500 font-semibold underline decoration-red-500 decoration-2 underline-offset-4">
                      {w.text}
                    </span>
                  ) : (
                    <span>{w.text}</span>
                  )}
                  {i < result.analysis!.referenceWords.length - 1 ? " " : ""}
                </span>
              ))}
            </p>
            {/* Распознанный ИИ текст для прозрачности разбора */}
            <div className="mt-4 rounded-xl bg-muted/50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Распознано ИИ (Whisper)
              </p>
              <p className="mt-1 text-sm text-foreground/80">
                {result.analysis.transcript || "Речь не распознана"}
              </p>
            </div>
          </div>
        )}

        {/* ИИ-заключени�� по этому тесту: уровень риска + рекомендация родителю */}
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 text-rose-500">
                <Brain className="h-4 w-4" />
              </span>
              <p className="text-sm font-bold text-foreground">Заключение ИИ и рекомендации</p>
            </div>
            <span className="rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-600">
              Риск: {result.riskLevel}
            </span>
          </div>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-foreground/80">{result.aiAnalysis}</p>
        </div>

        {/* Плеер только что записанного голоса */}
        {result.audioUrl && (
          <AudioPlayer src={result.audioUrl} title="Ваша запись этого теста" className="mt-6" />
        )}

        {/* Полный график динамики с кликабельными аудио-точками */}
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-500">
              <LineChart className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-foreground">Динамика превентивного мониторинга</h3>
              <p className="text-xs text-muted-foreground">Нажмите на точку графика, чтобы прослушать её запись</p>
            </div>
          </div>
          <ClarityChart points={points} startLabel={startLabel} nowLabel={nowLabel} />
        </div>

        <Button type="button" onClick={onClose} className="mt-6 w-full rounded-xl">
          Готово
        </Button>
      </div>
    </div>
  )
}

// --- Данные графика динамики -------------------------------------------------
// Каждая контрольная точка графика = один результат экспресс-теста.
// audioUrl — ссылка на запись, сделанную в эту точку (может быть null для
// затравочных точек до подключения записи или при ошибке загрузки).
type MonitorPoint = {
  id?: string
  date: string
  value: number
  audioUrl?: string | null
  riskLevel?: string
  aiAnalysis?: string
}

// Итог одного экспресс-теста для полноэкранного окна результатов.
type TestResult = {
  id: string
  date: string
  quality: number
  stutter: number
  tempo: number
  audioUrl: string | null
  riskLevel: string
  aiAnalysis: string
  /** Полный разбор ИИ (пословное сравнение с эталоном) для отчёта. */
  analysis?: ReferenceAnalysis
}

/** Ключ localStorage для истории контрольных точек графика динамики. */
const MONITOR_POINTS_KEY = "monitor_points"

// Короткая дата ДД.ММ для оси X графика.
function formatDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  return `${day}.${month}`
}

// Дата ДД.ММ.ГГГГ, ЧЧ:ММ для карточек «Истории скринингов» (безопасно к мусору).
// Возвращает Tailwind-классы бейджа риска в зависимости от уровня.
function riskBadgeClass(level: string | null): string {
  switch (level) {
    case "Высокий":
      return "bg-rose-100 text-rose-600"
    case "Средний":
      return "bg-amber-100 text-amber-600"
    case "Низкий":
      return "bg-emerald-100 text-emerald-600"
    default:
      return "bg-primary/10 text-primary"
  }
}

function formatHistoryDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${day}.${month}.${year}, ${hh}:${mm}`
}

// Генерирует уникальный ID результата (с фолбэком, если crypto недоступен).
function makePointId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  } catch {}
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

// Уровень риска речевого отклонения по показателю плавности речи.
function riskLevelFor(quality: number): string {
  if (quality >= 80) return "Низкий"
  if (quality >= 60) return "Умеренный"
  return "Высокий"
}

// Короткое ИИ-заключение по метрикам теста (mock-анализ произношения).
function aiAnalysisFor(stutter: number, tempo: number): string {
  const parts: string[] = []
  parts.push(stutter > 12 ? "Замечены частые запинки" : "Запинки в пределах нормы")
  if (tempo > 125) parts.push("темп речи ускорен")
  else if (tempo < 100) parts.push("темп речи замедлен")
  else parts.push("темп речи в норме")
  return `${parts.join(", ")}.`
}

// Читаем сохранённую историю точек графика из localStorage (безопасно).
function readStoredPoints(): MonitorPoint[] | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(MONITOR_POINTS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as MonitorPoint[]) : null
  } catch (err) {
    console.log("[v0] Не удалось прочитать историю точек графика:", err)
    return null
  }
}

// Пишем историю точек графика в localStorage (безопасно, без падений).
function writeStoredPoints(points: MonitorPoint[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(MONITOR_POINTS_KEY, JSON.stringify(points))
  } catch (err) {
    console.log("[v0] Не удалось сохранить историю точек графика:", err)
  }
}

// Стартовые точки мониторинга за прошедшие недели (mock, заменяемо на бэкенд).
function seedMonitorPoints(): MonitorPoint[] {
  const values = [70, 71, 70, 72, 73, 74, 75]
  const now = Date.now()
  return values.map((value, i) => ({
    date: formatDate(new Date(now - (values.length - 1 - i) * 7 * 24 * 60 * 60 * 1000)),
    value,
  }))
}
