"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import confetti from "canvas-confetti"
import {
  ArrowLeft,
  Mic,
  Loader2,
  Play,
  Crown,
  Award,
  Check,
  Sailboat,
  Wind,
  Volume2,
  MessageCircle,
} from "lucide-react"
import { useLanguage } from "@/lib/i18n"
import { useAudioPlayer, SoundWave } from "@/components/audio-controls"

/* ------------------------------- Types & data ----------------------------- */

type Lang = "RU" | "KZ"
type Loc = { RU: string; KZ: string }

type Step =
  | { kind: "theory"; text: Loc; audio: string }
  | { kind: "balloon"; text: Loc; audio: string }
  | { kind: "boat"; text: Loc }
  | { kind: "phrases"; text: Loc; items: { kz: string; sub: Loc; audio: string }[] }
  | { kind: "trafficlight"; text: Loc; audio: string }
  | { kind: "karaoke"; text: Loc; words: string[] }
  | { kind: "rhythm"; text: Loc; cards: string[]; audio: string }
  | { kind: "ask"; text: Loc; question: string; audio: string; think?: boolean }
  | { kind: "praise"; text: Loc; phrase: string; audio: string }
  | { kind: "chat"; text: Loc; bot1: string; bot1Audio: string; bot2: string; bot2Audio: string }
  | { kind: "picture"; text: Loc; image: string; emoji: string; audio: string }
  | { kind: "record"; text: Loc; prompt: Loc }
  | { kind: "topics"; text: Loc; options: { emoji: string; label: Loc }[] }
  | { kind: "plan"; text: Loc; items: Loc[] }
  | { kind: "quest"; text: Loc; choices: { emoji: string; kz: string }[] }
  | { kind: "success"; text: Loc; audio: string }
  | { kind: "diploma"; audio: string }

interface Lesson {
  id: number
  title: Loc
  emoji: string
  steps: Step[]
  finale?: boolean
}

const LESSONS: Lesson[] = [
  {
    id: 1,
    title: { RU: "Дыхание — основа речи", KZ: "Тыныс алу — дұрыс сөйлеудің негізі" },
    emoji: "🌬️",
    steps: [
      {
        kind: "theory",
        audio: "/audio/lesson1_intro.mp3",
        text: {
          RU: "Привет! Я робот Тіл. Чтобы говорить красиво, нужно научиться правильно дышать. Сделаем вдох носом и медленный выдох ртом.",
          KZ: "Сәлем! Мен Тіл роботымын. Әдемі сөйлеу үшін дұрыс тыныс алуды үйрену керек. Мұрынмен дем алып, аузбен баяу шығарамыз.",
        },
      },
      {
        kind: "balloon",
        audio: "/audio/balloon.mp3",
        text: { RU: "Удерживай кнопку и надуй шарик одним долгим выдохом!", KZ: "Түймені басып тұрып, бір ұзақ дем шығарып шарды үрле!" },
      },
      {
        kind: "boat",
        text: { RU: "Дуй ровно и проведи кораблик к финишу!", KZ: "Бірқалыпты үрлеп, кемені мәреге жеткіз!" },
      },
      {
        kind: "phrases",
        text: { RU: "Повтори фразы вслух. Нажми на динамик, чтобы услышать.", KZ: "Сөз тіркестерін дауыстап қайтала. Тыңдау үшін динамикті бас." },
        items: [
          { kz: "Сәлем.", sub: { RU: "Привет.", KZ: "Сәлемдесу." }, audio: "/audio/salem.mp3" },
          { kz: "Қайырлы күн.", sub: { RU: "Добрый день.", KZ: "Күндізгі сәлем." }, audio: "/audio/kairly_kun.mp3" },
          { kz: "Мен бүгін қуаныштымын.", sub: { RU: "Я сегодня радостный.", KZ: "Бүгінгі көңіл-күй." }, audio: "/audio/kuanyshtymyn.mp3" },
        ],
      },
      {
        kind: "success",
        audio: "/audio/success.mp3",
        text: { RU: "Отлично! Ты освоил дыхание для речи!", KZ: "Тамаша! Сөйлеуге арналған тыныс алуды меңгердің!" },
      },
    ],
  },
  {
    id: 2,
    title: { RU: "Говорим не спеша", KZ: "Сөйлейміз асықпай" },
    emoji: "🚦",
    steps: [
      {
        kind: "trafficlight",
        audio: "/audio/click.mp3",
        text: { RU: "Светофор речи: говори на зелёный, делай паузу на жёлтый, вдох на красный.", KZ: "Сөз бағдаршамы: жасылда сөйле, сарыда кідір, қызылда дем ал." },
      },
      {
        kind: "karaoke",
        text: { RU: "Читай в темпе — слова подсвечиваются по очереди.", KZ: "Қарқынмен оқы — сөздер кезекпен жанады." },
        words: ["Мен", "асықпай", "анық", "сөйлеймін."],
      },
      {
        kind: "success",
        audio: "/audio/success.mp3",
        text: { RU: "Здорово! Ты говоришь спокойно и чётко!", KZ: "Жарайсың! Сен сабырлы әрі анық сөйлейсің!" },
      },
    ],
  },
  {
    id: 3,
    title: { RU: "Ритм помогает говорить", KZ: "Ритм помогает говорить" },
    emoji: "🥁",
    steps: [
      {
        kind: "rhythm",
        audio: "/audio/metronome.mp3",
        text: { RU: "Нажимай на карточки и проговаривай слоги в ритм метронома.", KZ: "Карточкаларды басып, буындарды метроном ырғағымен айт." },
        cards: ["Та-та-та", "Ма-ма-ма", "Ба-ла-пан"],
      },
      {
        kind: "success",
        audio: "/audio/success.mp3",
        text: { RU: "Браво! Ритм делает речь чёткой!", KZ: "Браво! Ырғақ сөзді анық етеді!" },
      },
    ],
  },
  {
    id: 4,
    title: { RU: "Отвечай уверенно", KZ: "Сенімді жауап бер" },
    emoji: "💪",
    steps: [
      {
        kind: "ask",
        audio: "/audio/question_name.mp3",
        question: "Атың кім?",
        think: true,
        text: { RU: "Робот спрашивает. Подумай, потом ответь в микрофон.", KZ: "Робот сұрайды. Ойлан, содан кейін микрофонға жауап бер." },
      },
      {
        kind: "ask",
        audio: "/audio/question_class.mp3",
        question: "Қай сыныпта оқисың?",
        think: true,
        text: { RU: "Второй вопрос. Не спеши с ответом!", KZ: "Екінші сұрақ. Жауап беруге асықпа!" },
      },
      {
        kind: "praise",
        audio: "/audio/well_done.mp3",
        phrase: "Жарайсың! Асықпай жауап бердің.",
        text: { RU: "Робот хвалит тебя за уверенные ответы.", KZ: "Робот сені сенімді жауаптарың үшін мақтайды." },
      },
    ],
  },
  {
    id: 5,
    title: { RU: "Давай поговорим", KZ: "Әңгімелесейік" },
    emoji: "💬",
    steps: [
      {
        kind: "chat",
        text: { RU: "Поболтай с роботом. Слушай и отвечай голосом.", KZ: "Роботпен әңгімелес. Тыңдап, дауыспен жауап бер." },
        bot1: "Бүгін мектепте не болды?",
        bot1Audio: "/audio/chat_1.mp3",
        bot2: "Мәссаған! Ал достарың не деді?",
        bot2Audio: "/audio/chat_2.mp3",
      },
      {
        kind: "success",
        audio: "/audio/success.mp3",
        text: { RU: "Классный разговор! Ты поддержал беседу!", KZ: "Тамаша әңгіме! Сен сұхбатты жалғастырдың!" },
      },
    ],
  },
  {
    id: 6,
    title: { RU: "Говори по картинке", KZ: "Сурет бойынша сөйле" },
    emoji: "🖼️",
    steps: [
      {
        kind: "picture",
        audio: "/audio/park_questions.mp3",
        emoji: "🏞️",
        image: "/park-children-playing.png",
        text: { RU: "Посмотри на картинку. Робот задаёт наводящие вопросы.", KZ: "Суретке қара. Робот бағыттаушы сұрақтар қояды." },
      },
      {
        kind: "record",
        text: { RU: "Теперь расскажи связную историю по картинке.", KZ: "Енді сурет бойынша байланысты әңгіме айт." },
        prompt: { RU: "Что происходит на картинке?", KZ: "Суретте не болып жатыр?" },
      },
    ],
  },
  {
    id: 7,
    title: { RU: "Маленький спикер", KZ: "Кішкентай спикер" },
    emoji: "🎤",
    steps: [
      {
        kind: "topics",
        text: { RU: "Выбери тему для мини-выступления.", KZ: "Шағын сөз сөйлеуге тақырып таңда." },
        options: [
          { emoji: "🐶", label: { RU: "Моё животное", KZ: "Менің жануарым" } },
          { emoji: "⚽", label: { RU: "Любимая игра", KZ: "Сүйікті ойыным" } },
          { emoji: "👨‍👩‍👧", label: { RU: "Моя семья", KZ: "Менің отбасым" } },
          { emoji: "🌟", label: { RU: "Моя мечта", KZ: "Менің арманым" } },
        ],
      },
      {
        kind: "plan",
        text: { RU: "Вот план выступления. Запиши свою речь!", KZ: "Міне сөз жоспары. Сөзіңді жаз!" },
        items: [
          { RU: "1. Поздоровайся", KZ: "1. Сәлемдес" },
          { RU: "2. Назови тему", KZ: "2. Тақырыпты ата" },
          { RU: "3. Расскажи 2-3 предложения", KZ: "3. 2-3 сөйлем айт" },
          { RU: "4. Поблагодари за внимание", KZ: "4. Назарларыңызға рахмет де" },
        ],
      },
      {
        kind: "success",
        audio: "/audio/success.mp3",
        text: { RU: "Браво, спикер! Отличное выступление!", KZ: "Браво, спикер! Керемет сөз!" },
      },
    ],
  },
  {
    id: 8,
    title: { RU: "Я говорю уверенно!", KZ: "Мен сенімді сөйлеймін!" },
    emoji: "🏆",
    finale: true,
    steps: [
      {
        kind: "quest",
        text: { RU: "Финальный квест! Нажимай быстро — вспомни всё, что выучил!", KZ: "Финалдық квест! Тез бас — бәрін есіңе түсір!" },
        choices: [
          { emoji: "🌬️", kz: "Тыныс" },
          { emoji: "🚦", kz: "Асықпай" },
          { emoji: "🥁", kz: "Ритм" },
          { emoji: "💬", kz: "Әңгіме" },
        ],
      },
      { kind: "diploma", audio: "/audio/final_fanfare.mp3" },
    ],
  },
]

/* --------------------------------- Entry ---------------------------------- */

export function FluentCourse() {
  const [active, setActive] = useState<Lesson | null>(null)
  if (!active) return <FluentRoadmap onPick={setActive} />
  return <LessonPlayer lesson={active} onExit={() => setActive(null)} />
}

/* --------------------------------- Roadmap -------------------------------- */

const W = 320
const TOP = 90
const SPACING = 150
const AMP = 95

function getPoint(i: number) {
  return { x: W / 2 + Math.sin(i * 0.9) * AMP, y: TOP + i * SPACING }
}

function FluentRoadmap({ onPick }: { onPick: (l: Lesson) => void }) {
  const { t, lang } = useLanguage()
  const points = LESSONS.map((_, i) => getPoint(i))
  const height = TOP * 2 + (LESSONS.length - 1) * SPACING

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1]
    const p1 = points[i]
    const my = (p0.y + p1.y) / 2
    d += ` C ${p0.x} ${my}, ${p1.x} ${my}, ${p1.x} ${p1.y}`
  }

  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-primary/20 bg-card shadow-xl">
      <div className="flex items-center justify-between gap-3 bg-primary px-5 py-4 text-primary-foreground">
        <div className="min-w-0">
          <p className="text-xs font-medium text-primary-foreground/80">{t("fluent.roadmap.label")}</p>
          <h3 className="truncate text-base font-bold leading-tight">{t("fluent.roadmap.title")}</h3>
        </div>
        <span className="shrink-0 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold">{`0 / ${LESSONS.length}`}</span>
      </div>

      <div
        className="relative"
        style={{
          backgroundImage: "url(/roadmap-jungle.png)",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "repeat-y",
        }}
      >
        <div className="absolute inset-0 bg-primary/30" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-primary/40" aria-hidden="true" />

        <div className="relative mx-auto" style={{ width: W, height }}>
          <svg width={W} height={height} className="absolute left-0 top-0" fill="none" aria-hidden="true">
            <path d={d} stroke="white" strokeOpacity="0.5" strokeWidth={16} strokeLinecap="round" />
            <path d={d} stroke="white" strokeWidth={6} strokeLinecap="round" strokeDasharray="1 26" />
          </svg>

          {LESSONS.map((lesson, i) => {
            const p = points[i]
            const labelSide = p.x > W / 2 ? "left" : "right"
            return (
              <RoadmapNode
                key={lesson.id}
                lesson={lesson}
                title={lesson.title[lang]}
                labelSide={labelSide}
                onPick={() => onPick(lesson)}
                style={{ left: p.x, top: p.y }}
              />
            )
          })}
        </div>
      </div>

      <div className="border-t border-border bg-card px-5 py-4">
        <p className="text-center text-sm font-semibold text-foreground/70">{t("fluent.roadmap.hint")}</p>
      </div>
    </div>
  )
}

function RoadmapNode({
  lesson,
  title,
  labelSide,
  onPick,
  style,
}: {
  lesson: Lesson
  title: string
  labelSide: "left" | "right"
  onPick: () => void
  style: React.CSSProperties
}) {
  const { t } = useLanguage()
  const isFinale = lesson.finale
  const size = isFinale ? 84 : lesson.id === 1 ? 76 : 68

  return (
    <div className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={style}>
      <button
        type="button"
        onClick={onPick}
        aria-label={`${t("fluent.lesson")} ${lesson.id}: ${title}`}
        className={`relative flex items-center justify-center rounded-full border-4 border-primary-foreground text-primary-foreground shadow-lg ring-4 ring-primary-foreground/30 transition-transform hover:scale-110 active:scale-95 ${
          isFinale ? "bg-amber-400 text-amber-950" : "bg-primary"
        }`}
        style={{ width: size, height: size }}
      >
        {isFinale ? (
          <Crown className="h-10 w-10" fill="currentColor" />
        ) : lesson.id === 1 ? (
          <Play className="h-8 w-8" fill="currentColor" />
        ) : (
          <span className="text-3xl">{lesson.emoji}</span>
        )}
        <span className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary-foreground bg-card text-xs font-extrabold text-primary shadow">
          {lesson.id}
        </span>
      </button>

      <span
        className={`pointer-events-none absolute top-1/2 max-w-[8.5rem] -translate-y-1/2 truncate whitespace-nowrap rounded-full bg-card/95 px-3 py-1 text-xs font-bold text-foreground/80 shadow-md ${
          labelSide === "left" ? "right-full mr-3" : "left-full ml-3"
        }`}
      >
        {title}
      </span>
    </div>
  )
}

/* --------------------------------- Player --------------------------------- */

function LessonPlayer({ lesson, onExit }: { lesson: Lesson; onExit: () => void }) {
  const { t } = useLanguage()
  const [step, setStep] = useState(0)
  const total = lesson.steps.length
  const progress = ((step + 1) / total) * 100
  const next = () => setStep((s) => Math.min(s + 1, total - 1))

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onExit}
          aria-label={t("fluent.back")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-primary/15">
          <div className="h-full rounded-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div key={step} className="mt-8 animate-in fade-in zoom-in-95 duration-500">
        <StepRenderer step={lesson.steps[step]} onNext={next} onExit={onExit} />
      </div>
    </div>
  )
}

function StepRenderer({ step, onNext, onExit }: { step: Step; onNext: () => void; onExit: () => void }) {
  switch (step.kind) {
    case "theory":
      return <TheoryStep step={step} onNext={onNext} />
    case "balloon":
      return <BalloonStep step={step} onNext={onNext} />
    case "boat":
      return <BoatStep step={step} onNext={onNext} />
    case "phrases":
      return <PhrasesStep step={step} onNext={onNext} />
    case "trafficlight":
      return <TrafficStep step={step} onNext={onNext} />
    case "karaoke":
      return <KaraokeStep step={step} onNext={onNext} />
    case "rhythm":
      return <RhythmStep step={step} onNext={onNext} />
    case "ask":
      return <AskStep step={step} onNext={onNext} />
    case "praise":
      return <PraiseStep step={step} onNext={onNext} />
    case "chat":
      return <ChatStep step={step} onNext={onNext} />
    case "picture":
      return <PictureStep step={step} onNext={onNext} />
    case "record":
      return <RecordStep step={step} onNext={onNext} />
    case "topics":
      return <TopicsStep step={step} onNext={onNext} />
    case "plan":
      return <PlanStep step={step} onNext={onNext} />
    case "quest":
      return <QuestStep step={step} onNext={onNext} />
    case "success":
      return <SuccessStep step={step} onExit={onExit} />
    case "diploma":
      return <DiplomaStep step={step} onExit={onExit} />
  }
}

/* ------------------------------ Shared bits ------------------------------- */

function Robot({ active }: { active?: boolean }) {
  return (
    <div className={`flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-4xl text-primary-foreground shadow-lg ${active ? "animate-bounce" : ""}`}>
      🤖
    </div>
  )
}

function Prompt({ text }: { text: string }) {
  return <h3 className="mt-6 text-balance text-xl font-extrabold text-foreground">{text}</h3>
}

function NextButton({ onClick, label }: { onClick: () => void; label?: string }) {
  const { t } = useLanguage()
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-8 w-full rounded-2xl bg-primary py-3 text-base font-bold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02]"
    >
      {label ?? t("fluent.next")}
    </button>
  )
}

/** Microphone with idle -> recording -> AI checking -> onNext, plus optional think timer. */
function MicButton({ onDone, think }: { onDone: () => void; think?: boolean }) {
  const { t } = useLanguage()
  const [state, setState] = useState<"think" | "idle" | "recording" | "checking">(think ? "think" : "idle")
  const [count, setCount] = useState(3)

  useEffect(() => {
    if (state !== "think") return
    if (count <= 0) {
      setState("idle")
      return
    }
    const id = setTimeout(() => setCount((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [state, count])

  function press() {
    if (state === "idle") {
      setState("recording")
    } else if (state === "recording") {
      setState("checking")
      setTimeout(onDone, 1500)
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative mt-8 flex h-40 w-40 items-center justify-center">
        {state === "recording" && (
          <>
            <span className="absolute inset-0 animate-ping rounded-full bg-destructive/30" />
            <span className="absolute inset-4 animate-pulse rounded-full bg-destructive/20" />
          </>
        )}
        <button
          type="button"
          onClick={press}
          disabled={state === "think" || state === "checking"}
          aria-label={t("fluent.mic.idle")}
          className={`relative flex h-28 w-28 items-center justify-center rounded-full text-white shadow-xl transition-transform ${
            state === "recording"
              ? "animate-pulse bg-destructive"
              : state === "think"
                ? "bg-muted-foreground/40"
                : "bg-primary hover:scale-105 active:scale-95"
          }`}
        >
          {state === "checking" ? (
            <Loader2 className="h-11 w-11 animate-spin" />
          ) : state === "think" ? (
            <span className="text-3xl font-extrabold">{count}</span>
          ) : (
            <Mic className="h-11 w-11" />
          )}
        </button>
      </div>
      <p className="mt-6 text-base font-bold text-foreground">
        {state === "think" && t("fluent.think")}
        {state === "idle" && t("fluent.mic.idle")}
        {state === "recording" && t("fluent.mic.recording")}
        {state === "checking" && t("fluent.mic.checking")}
      </p>
    </div>
  )
}

/* --------------------------------- Steps ---------------------------------- */

function TheoryStep({ step, onNext }: { step: Extract<Step, { kind: "theory" }>; onNext: () => void }) {
  const { t, lang } = useLanguage()
  const { isPlaying, play } = useAudioPlayer()

  useEffect(() => {
    play(step.audio)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col items-center text-center">
      <Robot active={isPlaying} />
      <div className="mt-6 max-w-md rounded-3xl border-2 border-primary/15 bg-primary/5 p-5">
        <p className="text-pretty text-base leading-relaxed text-foreground">{step.text[lang]}</p>
      </div>
      <button
        type="button"
        onClick={() => play(step.audio)}
        className={`mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-base font-bold text-primary-foreground shadow-sm transition-transform hover:scale-105 ${
          isPlaying ? "ring-4 ring-primary/30" : ""
        }`}
      >
        {isPlaying ? <SoundWave active className="text-primary-foreground" /> : <Volume2 className="h-5 w-5" />}
        {t("fluent.listen")}
      </button>
      <NextButton onClick={onNext} />
    </div>
  )
}

function BalloonStep({ step, onNext }: { step: Extract<Step, { kind: "balloon" }>; onNext: () => void }) {
  const { lang } = useLanguage()
  const { play } = useAudioPlayer()
  const [size, setSize] = useState(40)
  const [done, setDone] = useState(false)
  const holding = useRef(false)
  const raf = useRef<number | null>(null)

  const grow = useCallback(() => {
    setSize((s) => {
      const ns = Math.min(s + 1.4, 200)
      if (ns >= 200 && !done) {
        setDone(true)
        holding.current = false
      }
      return ns
    })
    if (holding.current) raf.current = requestAnimationFrame(grow)
  }, [done])

  const start = () => {
    if (done) return
    holding.current = true
    play(step.audio)
    raf.current = requestAnimationFrame(grow)
  }
  const stop = () => {
    holding.current = false
    if (raf.current) cancelAnimationFrame(raf.current)
  }

  useEffect(() => () => stop(), [])

  return (
    <div className="flex flex-col items-center text-center">
      <Prompt text={step.text[lang]} />
      <div className="mt-8 flex h-56 items-center justify-center">
        <div
          className="flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-[width,height] duration-75 ease-out"
          style={{ width: size, height: size + 6 }}
        >
          <Wind className="h-6 w-6 opacity-70" />
        </div>
      </div>
      {done ? (
        <NextButton onClick={onNext} />
      ) : (
        <button
          type="button"
          onPointerDown={start}
          onPointerUp={stop}
          onPointerLeave={stop}
          className="mt-6 select-none rounded-2xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-sm active:scale-95"
        >
          <span className="inline-flex items-center gap-2">
            <Wind className="h-5 w-5" />
            {lang === "RU" ? "Держи и дуй" : "Басып тұрып үрле"}
          </span>
        </button>
      )}
    </div>
  )
}

function BoatStep({ step, onNext }: { step: Extract<Step, { kind: "boat" }>; onNext: () => void }) {
  const { lang } = useLanguage()
  const [pos, setPos] = useState(0)
  const done = pos >= 100

  return (
    <div className="flex flex-col items-center text-center">
      <Prompt text={step.text[lang]} />
      <div className="relative mt-10 h-24 w-full overflow-hidden rounded-3xl bg-primary/10">
        <div className="absolute bottom-0 h-12 w-full bg-primary/20" />
        <div
          className="absolute bottom-6 transition-all duration-200 ease-out"
          style={{ left: `calc(${pos}% - 24px)` }}
        >
          <Sailboat className="h-10 w-10 text-primary" />
        </div>
        <span className="absolute right-2 top-2 text-2xl">🏁</span>
      </div>
      {done ? (
        <NextButton onClick={onNext} />
      ) : (
        <button
          type="button"
          onClick={() => setPos((p) => Math.min(p + 20, 100))}
          className="mt-6 rounded-2xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-sm transition-transform hover:scale-105 active:scale-95"
        >
          <span className="inline-flex items-center gap-2">
            <Wind className="h-5 w-5" />
            {lang === "RU" ? "Дуть на кораблик" : "Кемеге үрле"}
          </span>
        </button>
      )}
    </div>
  )
}

function PhrasesStep({ step, onNext }: { step: Extract<Step, { kind: "phrases" }>; onNext: () => void }) {
  const { lang } = useLanguage()
  return (
    <div className="flex flex-col items-center text-center">
      <Prompt text={step.text[lang]} />
      <div className="mt-8 flex w-full flex-col gap-3">
        {step.items.map((item, i) => (
          <PhraseCard key={i} kz={item.kz} sub={item.sub[lang]} audio={item.audio} />
        ))}
      </div>
      <NextButton onClick={onNext} />
    </div>
  )
}

function PhraseCard({ kz, sub, audio }: { kz: string; sub: string; audio: string }) {
  const { isPlaying, play } = useAudioPlayer()
  const { t } = useLanguage()
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl border-2 bg-card px-4 py-3 text-left transition-colors ${
        isPlaying ? "border-primary" : "border-primary/15"
      }`}
    >
      <div className="min-w-0">
        <p className="truncate text-lg font-bold text-foreground">{kz}</p>
        <p className="truncate text-sm text-muted-foreground">{sub}</p>
      </div>
      <div className="flex items-center gap-2">
        <SoundWave active={isPlaying} className="text-primary" />
        <button
          type="button"
          onClick={() => play(audio)}
          aria-label={t("fluent.listen")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-110 active:scale-95"
        >
          <Volume2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

function TrafficStep({ step, onNext }: { step: Extract<Step, { kind: "trafficlight" }>; onNext: () => void }) {
  const { lang } = useLanguage()
  const { play } = useAudioPlayer()
  const [phase, setPhase] = useState(0) // 0 green,1 yellow,2 red
  const [cycles, setCycles] = useState(0)
  const labels = [
    { RU: "Говори спокойно", KZ: "Сабырлы сөйле" },
    { RU: "Пауза", KZ: "Кідіріс" },
    { RU: "Вдох", KZ: "Дем ал" },
  ]

  useEffect(() => {
    const id = setInterval(() => {
      setPhase((p) => {
        const np = (p + 1) % 3
        if (np === 0) setCycles((c) => c + 1)
        return np
      })
      play(step.audio)
    }, 1400)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const colors = ["bg-emerald-500", "bg-amber-400", "bg-destructive"]

  return (
    <div className="flex flex-col items-center text-center">
      <Prompt text={step.text[lang]} />
      <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl bg-foreground/90 p-5">
        {colors.map((c, i) => (
          <span
            key={i}
            className={`h-14 w-14 rounded-full transition-opacity ${c} ${phase === i ? "opacity-100 ring-4 ring-white/40" : "opacity-20"}`}
          />
        ))}
      </div>
      <p className="mt-5 text-lg font-extrabold text-foreground">{labels[phase][lang]}</p>
      {cycles >= 1 && <NextButton onClick={onNext} />}
    </div>
  )
}

function KaraokeStep({ step, onNext }: { step: Extract<Step, { kind: "karaoke" }>; onNext: () => void }) {
  const { lang } = useLanguage()
  const [active, setActive] = useState(-1)
  const done = active >= step.words.length - 1

  useEffect(() => {
    if (done) return
    const id = setTimeout(() => setActive((a) => a + 1), 700)
    return () => clearTimeout(id)
  }, [active, done])

  return (
    <div className="flex flex-col items-center text-center">
      <Prompt text={step.text[lang]} />
      <div className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        {step.words.map((w, i) => (
          <span
            key={i}
            className={`text-2xl font-extrabold transition-colors ${
              i <= active ? "text-primary" : "text-muted-foreground/40"
            } ${i === active ? "scale-110" : ""}`}
          >
            {w}
          </span>
        ))}
      </div>
      {done && <NextButton onClick={onNext} />}
    </div>
  )
}

function RhythmStep({ step, onNext }: { step: Extract<Step, { kind: "rhythm" }>; onNext: () => void }) {
  const { lang } = useLanguage()
  const { isPlaying, play } = useAudioPlayer()
  const [tapped, setTapped] = useState<Set<number>>(new Set())

  function tap(i: number) {
    play(step.audio)
    setTapped((prev) => new Set(prev).add(i))
  }

  return (
    <div className="flex flex-col items-center text-center">
      <Prompt text={step.text[lang]} />
      <div className="mt-8 flex w-full flex-col gap-3">
        {step.cards.map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={() => tap(i)}
            className={`flex items-center justify-center gap-3 rounded-2xl border-2 bg-card py-4 text-xl font-extrabold text-foreground transition-transform active:scale-95 ${
              tapped.has(i) ? "border-primary" : "border-primary/15 hover:scale-[1.02]"
            }`}
          >
            <span className="text-2xl">🥁</span>
            {c}
            {isPlaying && <SoundWave active className="text-primary" />}
          </button>
        ))}
      </div>
      {tapped.size >= step.cards.length && <NextButton onClick={onNext} />}
    </div>
  )
}

function AskStep({ step, onNext }: { step: Extract<Step, { kind: "ask" }>; onNext: () => void }) {
  const { lang } = useLanguage()
  const { isPlaying, play } = useAudioPlayer()

  useEffect(() => {
    play(step.audio)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col items-center text-center">
      <Robot active={isPlaying} />
      <p className="mt-4 text-sm text-muted-foreground">{step.text[lang]}</p>
      <button
        type="button"
        onClick={() => play(step.audio)}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-5 py-3 text-lg font-extrabold text-foreground"
      >
        <Volume2 className="h-5 w-5 text-primary" />
        {step.question}
        <SoundWave active={isPlaying} className="text-primary" />
      </button>
      <MicButton onDone={onNext} think={step.think} />
    </div>
  )
}

function PraiseStep({ step, onNext }: { step: Extract<Step, { kind: "praise" }>; onNext: () => void }) {
  const { t, lang } = useLanguage()
  const { isPlaying, play } = useAudioPlayer()

  useEffect(() => {
    play(step.audio)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col items-center text-center">
      <Robot active={isPlaying} />
      <div className="mt-6 rounded-3xl border-2 border-primary/15 bg-primary/5 p-5">
        <p className="text-xl font-extrabold text-foreground">{step.phrase}</p>
        <p className="mt-2 text-sm text-muted-foreground">{step.text[lang]}</p>
      </div>
      <button
        type="button"
        onClick={() => play(step.audio)}
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-base font-bold text-primary-foreground"
      >
        {isPlaying ? <SoundWave active className="text-primary-foreground" /> : <Volume2 className="h-5 w-5" />}
        {t("fluent.listen")}
      </button>
      <NextButton onClick={onNext} />
    </div>
  )
}

function ChatStep({ step, onNext }: { step: Extract<Step, { kind: "chat" }>; onNext: () => void }) {
  const { lang } = useLanguage()
  const a1 = useAudioPlayer()
  const a2 = useAudioPlayer()
  const [turn, setTurn] = useState(0) // 0: bot1+answer, 1: bot2+answer, 2: done

  useEffect(() => {
    a1.play(step.bot1Audio)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col">
      <p className="text-center text-sm text-muted-foreground">{step.text[lang]}</p>

      <div className="mt-6 flex flex-col gap-4">
        <ChatBubble side="bot" text={step.bot1} onPlay={() => a1.play(step.bot1Audio)} playing={a1.isPlaying} />

        {turn >= 1 && (
          <ChatBubble side="bot" text={step.bot2} onPlay={() => a2.play(step.bot2Audio)} playing={a2.isPlaying} />
        )}
      </div>

      {turn < 2 && (
        <MicButton
          onDone={() => {
            if (turn === 0) {
              setTurn(1)
              a2.play(step.bot2Audio)
            } else {
              setTurn(2)
            }
          }}
        />
      )}
      {turn >= 2 && <NextButton onClick={onNext} />}
    </div>
  )
}

function ChatBubble({ side, text, onPlay, playing }: { side: "bot" | "child"; text: string; onPlay: () => void; playing: boolean }) {
  const isBot = side === "bot"
  return (
    <div className={`flex items-end gap-2 ${isBot ? "justify-start" : "justify-end"}`}>
      {isBot && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-lg text-primary-foreground">🤖</span>
      )}
      <button
        type="button"
        onClick={onPlay}
        className={`flex max-w-[80%] items-center gap-2 rounded-2xl px-4 py-3 text-left text-sm font-semibold shadow-sm ${
          isBot ? "rounded-bl-sm bg-primary/10 text-foreground" : "rounded-br-sm bg-primary text-primary-foreground"
        }`}
      >
        {isBot && <Volume2 className="h-4 w-4 shrink-0 text-primary" />}
        {text}
        <SoundWave active={playing} className="text-primary" />
      </button>
    </div>
  )
}

function PictureStep({ step, onNext }: { step: Extract<Step, { kind: "picture" }>; onNext: () => void }) {
  const { t, lang } = useLanguage()
  const { isPlaying, play } = useAudioPlayer()

  useEffect(() => {
    play(step.audio)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col items-center text-center">
      <Prompt text={step.text[lang]} />
      <div className="mt-6 h-52 w-full overflow-hidden rounded-3xl border-2 border-primary/15 bg-primary/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={step.image || "/placeholder.svg"} alt="" className="h-full w-full object-cover" />
      </div>
      <button
        type="button"
        onClick={() => play(step.audio)}
        className={`mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-base font-bold text-primary-foreground ${
          isPlaying ? "ring-4 ring-primary/30" : ""
        }`}
      >
        {isPlaying ? <SoundWave active className="text-primary-foreground" /> : <Volume2 className="h-5 w-5" />}
        {t("fluent.listen")}
      </button>
      <NextButton onClick={onNext} />
    </div>
  )
}

function RecordStep({ step, onNext }: { step: Extract<Step, { kind: "record" }>; onNext: () => void }) {
  const { lang } = useLanguage()
  return (
    <div className="flex flex-col items-center text-center">
      <Prompt text={step.text[lang]} />
      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-5 py-2 text-sm font-bold text-primary">
        <MessageCircle className="h-4 w-4" />
        {step.prompt[lang]}
      </div>
      <MicButton onDone={onNext} />
    </div>
  )
}

function TopicsStep({ step, onNext }: { step: Extract<Step, { kind: "topics" }>; onNext: () => void }) {
  const { lang } = useLanguage()
  const [picked, setPicked] = useState<number | null>(null)

  function choose(i: number) {
    setPicked(i)
    setTimeout(onNext, 800)
  }

  return (
    <div className="flex flex-col items-center text-center">
      <Prompt text={step.text[lang]} />
      <div className="mt-8 grid w-full grid-cols-2 gap-4">
        {step.options.map((o, i) => (
          <button
            key={i}
            type="button"
            onClick={() => choose(i)}
            className={`flex flex-col items-center gap-2 rounded-3xl border-4 bg-card p-5 transition-all ${
              picked === i ? "scale-105 border-primary bg-primary/10" : "border-primary/15 hover:-translate-y-1 hover:border-primary/40"
            }`}
          >
            <span className="text-4xl">{o.emoji}</span>
            <span className="text-sm font-bold text-foreground">{o.label[lang]}</span>
            {picked === i && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-4 w-4" />
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function PlanStep({ step, onNext }: { step: Extract<Step, { kind: "plan" }>; onNext: () => void }) {
  const { lang } = useLanguage()
  return (
    <div className="flex flex-col items-center text-center">
      <Prompt text={step.text[lang]} />
      <ol className="mt-6 flex w-full flex-col gap-2 text-left">
        {step.items.map((item, i) => (
          <li key={i} className="rounded-2xl border-2 border-primary/15 bg-primary/5 px-4 py-3 text-sm font-bold text-foreground">
            {item[lang]}
          </li>
        ))}
      </ol>
      <MicButton onDone={onNext} />
    </div>
  )
}

function QuestStep({ step, onNext }: { step: Extract<Step, { kind: "quest" }>; onNext: () => void }) {
  const { lang } = useLanguage()
  const [picked, setPicked] = useState<number | null>(null)

  function tap(i: number) {
    setPicked(i)
    setTimeout(onNext, 800)
  }

  return (
    <div className="flex flex-col items-center text-center">
      <Prompt text={step.text[lang]} />
      <div className="mt-8 grid w-full grid-cols-2 gap-4">
        {step.choices.map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={() => tap(i)}
            className={`flex flex-col items-center gap-2 rounded-3xl border-4 bg-card p-5 transition-all ${
              picked === i ? "scale-110 border-emerald-500 bg-emerald-500/15" : "border-primary/15 hover:-translate-y-1 hover:border-primary/40"
            }`}
          >
            <span className="text-4xl">{c.emoji}</span>
            <span className="text-sm font-bold text-foreground">{c.kz}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function SuccessStep({ step, onExit }: { step: Extract<Step, { kind: "success" }>; onExit: () => void }) {
  const { t, lang } = useLanguage()
  const { play } = useAudioPlayer()

  useEffect(() => {
    play(step.audio)
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.4 } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary text-6xl text-primary-foreground shadow-xl animate-in zoom-in duration-700">
        🎉
      </div>
      <h3 className="mt-8 text-balance text-2xl font-extrabold text-foreground">{step.text[lang]}</h3>
      <button
        type="button"
        onClick={onExit}
        className="mt-10 rounded-2xl bg-primary px-8 py-4 text-lg font-bold text-primary-foreground shadow-lg transition-transform hover:scale-105"
      >
        {t("fluent.back")}
      </button>
    </div>
  )
}

function DiplomaStep({ step, onExit }: { step: Extract<Step, { kind: "diploma" }>; onExit: () => void }) {
  const { t } = useLanguage()
  const { play } = useAudioPlayer()

  useEffect(() => {
    play(step.audio)
    const end = Date.now() + 2800
    const colors = ["#0d9488", "#14b8a6", "#facc15", "#ffffff"]
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 70, origin: { x: 0 }, colors })
      confetti({ particleCount: 4, angle: 120, spread: 70, origin: { x: 1 }, colors })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
    confetti({ particleCount: 180, spread: 110, origin: { y: 0.4 }, colors })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative w-full max-w-md animate-in zoom-in-95 duration-700">
        <div className="rounded-3xl border-4 border-primary bg-card p-6 shadow-2xl">
          <div className="rounded-2xl border-2 border-dashed border-primary/50 p-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <Award className="h-9 w-9" />
            </div>
            <p className="mt-4 text-sm font-bold uppercase tracking-[0.3em] text-primary">{t("fluent.diploma.title")}</p>
            <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">{t("fluent.diploma.text")}</p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow">
              <Crown className="h-4 w-4" fill="currentColor" />
              {t("fluent.diploma.level")}
            </div>
          </div>
        </div>
        <span className="absolute -right-3 -top-3 text-4xl">🎉</span>
        <span className="absolute -left-3 -top-2 text-3xl">🎊</span>
      </div>

      <button
        type="button"
        onClick={onExit}
        className="mt-10 rounded-2xl bg-primary px-8 py-4 text-lg font-bold text-primary-foreground shadow-lg transition-transform hover:scale-105"
      >
        {t("fluent.finish")}
      </button>
    </div>
  )
}
