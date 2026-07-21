"use client"

import { useEffect, useState } from "react"
import confetti from "canvas-confetti"
import { ArrowLeft, Mic, Star, Check, Loader2, Play, Crown, Award } from "lucide-react"
import { useLanguage } from "@/lib/i18n"
import { useAudioPlayer, SoundWave } from "@/components/audio-controls"

/* ---------------------------------- Data ---------------------------------- */

/** A bilingual string: pure RU when Russian is selected, pure KZ when Kazakh. */
type Loc = { RU: string; KZ: string }

interface Choice {
  emoji: string
  /** Kazakh target word being taught (stays the same in both languages) */
  word: string
  /** localized helper label */
  label: Loc
  correct: boolean
}

interface Lesson {
  id: number
  title: Loc
  emoji: string
  color: string
  audio: string // speaker audio for the learn phrase
  learn: { emoji: string; word: string; sub: Loc }[]
  learnPhrase: string // Kazakh phrase spoken by the character
  gamePrompt: Loc
  gameType?: "choice" | "tap"
  choices: Choice[]
  practiceQuestion: Loc
  rewardText: Loc
  finale?: boolean
}

const LESSONS: Lesson[] = [
  {
    id: 1,
    title: { RU: "Привет, друг!", KZ: "Сәлем, досым!" },
    emoji: "🌟",
    color: "bg-red-500",
    audio: "/audio/kids_salem.mp3",
    learn: [{ emoji: "🦊", word: "Сәлем!", sub: { RU: "Привет!", KZ: "Сәлемдесу!" } }],
    learnPhrase: "Сәлем!",
    gamePrompt: { RU: "Кто сказал «Сәлем»?", KZ: "«Сәлем» деп кім айтты?" },
    choices: [
      { emoji: "🦊", word: "Түлкі", label: { RU: "Лисёнок", KZ: "Түлкі" }, correct: true },
      { emoji: "🪨", word: "Тас", label: { RU: "Камень", KZ: "Тас" }, correct: false },
    ],
    practiceQuestion: { RU: "Как тебя зовут? (Атың кім?)", KZ: "Атың кім?" },
    rewardText: { RU: "Керемет! Ты выучил первые слова!", KZ: "Керемет! Алғашқы сөздерді үйрендің!" },
  },
  {
    id: 2,
    title: { RU: "Моя семья", KZ: "Менің отбасым" },
    emoji: "👨‍👩‍👧‍👦",
    color: "bg-orange-500",
    audio: "/audio/kids_family.mp3",
    learn: [
      { emoji: "👩", word: "Ана", sub: { RU: "Мама", KZ: "Ана" } },
      { emoji: "👨", word: "Әке", sub: { RU: "Папа", KZ: "Әке" } },
    ],
    learnPhrase: "Ана, Әке",
    gamePrompt: { RU: "Покажи маму (Ананы көрсет)", KZ: "Ананы көрсет" },
    choices: [
      { emoji: "👩", word: "Ана", label: { RU: "Мама", KZ: "Ана" }, correct: true },
      { emoji: "👨", word: "Әке", label: { RU: "Папа", KZ: "Әке" }, correct: false },
    ],
    practiceQuestion: { RU: "Кто это? 👩 (Бұл кім?)", KZ: "Бұл кім? 👩" },
    rewardText: { RU: "Тамаша! Награда: Знаток Семьи 📜", KZ: "Тамаша! Сыйлық: Отбасы білгірі 📜" },
  },
  {
    id: 3,
    title: { RU: "Мир цветов", KZ: "Түстер әлемі" },
    emoji: "🎨",
    color: "bg-red-500",
    audio: "/audio/kids_colors.mp3",
    learn: [
      { emoji: "🔴", word: "Қызыл", sub: { RU: "Красный", KZ: "Қызыл түс" } },
      { emoji: "🔵", word: "Көк", sub: { RU: "Синий", KZ: "Көк түс" } },
      { emoji: "🟡", word: "Сары", sub: { RU: "Жёлтый", KZ: "Сары түс" } },
    ],
    learnPhrase: "Қызыл, Көк, Сары",
    gamePrompt: { RU: "Выбери красный (Қызылды таңда)", KZ: "Қызыл түсті таңда" },
    choices: [
      { emoji: "🔴", word: "Қызыл", label: { RU: "Красный", KZ: "Қызыл" }, correct: true },
      { emoji: "🔵", word: "Көк", label: { RU: "Синий", KZ: "Көк" }, correct: false },
      { emoji: "🟡", word: "Сары", label: { RU: "Жёлтый", KZ: "Сары" }, correct: false },
    ],
    practiceQuestion: { RU: "Какой это цвет? 🔴 (Бұл қандай түс?)", KZ: "Бұл қандай түс? 🔴" },
    rewardText: { RU: "Керемет! Награда: Мастер Цветов 🎨", KZ: "Керемет! Сыйлық: Түс шебері 🎨" },
  },
  {
    id: 4,
    title: { RU: "Мир животных", KZ: "Жануарлар әлемі" },
    emoji: "🦁",
    color: "bg-orange-500",
    audio: "/audio/kids_animals.mp3",
    learn: [
      { emoji: "🐱", word: "Мысық", sub: { RU: "Кошка", KZ: "Мысық" } },
      { emoji: "🐶", word: "Ит", sub: { RU: "Собака", KZ: "Ит" } },
      { emoji: "🐮", word: "Сиыр", sub: { RU: "Корова", KZ: "Сиыр" } },
    ],
    learnPhrase: "Мысық, Ит, Сиыр",
    gamePrompt: { RU: "Угадай по звуку: «Мяу»", KZ: "Дыбысынан тап: «Мяу»" },
    choices: [
      { emoji: "🐱", word: "Мысық", label: { RU: "Кошка", KZ: "Мысық" }, correct: true },
      { emoji: "🐶", word: "Ит", label: { RU: "Собака", KZ: "Ит" }, correct: false },
      { emoji: "🐮", word: "Сиыр", label: { RU: "Корова", KZ: "Сиыр" }, correct: false },
    ],
    practiceQuestion: { RU: "Какое животное тебе нравится? (Қай жануар ұнайды?)", KZ: "Саған қай жануар ұнайды?" },
    rewardText: { RU: "Керемет! Награда: Друг Животных 🦁", KZ: "Керемет! Сыйлық: Жануарлар досы 🦁" },
  },
  {
    id: 5,
    title: { RU: "Что делает?", KZ: "Не істеп жатыр?" },
    emoji: "🏃",
    color: "bg-red-500",
    audio: "/audio/kids_actions.mp3",
    learn: [
      { emoji: "🏃‍♂️", word: "Жүгіру", sub: { RU: "Бежать", KZ: "Жүгіру" } },
      { emoji: "⚽", word: "Ойнау", sub: { RU: "Играть", KZ: "Ойнау" } },
      { emoji: "🛏️", word: "Ұйықтау", sub: { RU: "Спать", KZ: "Ұйықтау" } },
    ],
    learnPhrase: "Жүгіру, Ойнау, Ұйықтау",
    gamePrompt: { RU: "Что делает мальчик? ⚽ (Бала не істеп жатыр?)", KZ: "Бала не істеп жатыр? ⚽" },
    choices: [
      { emoji: "🏃‍♂️", word: "Жүгіру", label: { RU: "Бежать", KZ: "Жүгіру" }, correct: false },
      { emoji: "⚽", word: "Ойнау", label: { RU: "Играть", KZ: "Ойнау" }, correct: true },
      { emoji: "📖", word: "Оқу", label: { RU: "Читать", KZ: "Оқу" }, correct: false },
    ],
    practiceQuestion: { RU: "Что делает девочка? 🎨 (Қыз не істеп жатыр?)", KZ: "Қыз не істеп жатыр? 🎨" },
    rewardText: { RU: "Тамаша! Награда: Мастер Действий ⚡", KZ: "Тамаша! Сыйлық: Әрекет шебері ⚡" },
  },
  {
    id: 6,
    title: { RU: "Обо мне", KZ: "Мен туралы" },
    emoji: "🙋",
    color: "bg-orange-500",
    audio: "/audio/kids_aboutme.mp3",
    learn: [
      { emoji: "🎂", word: "Неше жастасың?", sub: { RU: "Сколько тебе лет?", KZ: "Жасыңды айт" } },
      { emoji: "🧸", word: "Қандай ойыншық ұнайды?", sub: { RU: "Какая игрушка нравится?", KZ: "Ұнататын ойыншық" } },
    ],
    learnPhrase: "Мен туралы",
    gamePrompt: { RU: "Сколько тебе лет? Выбери возраст!", KZ: "Неше жастасың? Жасыңды таңда!" },
    gameType: "tap",
    choices: [
      { emoji: "3️⃣", word: "3 жас", label: { RU: "3 года", KZ: "3 жас" }, correct: true },
      { emoji: "4️⃣", word: "4 жас", label: { RU: "4 года", KZ: "4 жас" }, correct: true },
      { emoji: "5️⃣", word: "5 жас", label: { RU: "5 лет", KZ: "5 жас" }, correct: true },
      { emoji: "6️⃣", word: "6 жас", label: { RU: "6 лет", KZ: "6 жас" }, correct: true },
    ],
    practiceQuestion: { RU: "Расскажи о себе голосом! (Өзің туралы айт)", KZ: "Өзің туралы айтып бер!" },
    rewardText: { RU: "Керемет! Награда: Супер Собеседник 💬", KZ: "Керемет! Сыйлық: Супер әңгімеші 💬" },
  },
  {
    id: 7,
    title: { RU: "Рассказ по картинке", KZ: "Сурет бойынша әңгіме" },
    emoji: "📖",
    color: "bg-red-500",
    audio: "/audio/kids_story.mp3",
    learn: [
      { emoji: "🌅", word: "Оянды", sub: { RU: "Проснулся", KZ: "Оянды" } },
      { emoji: "🍳", word: "Тамақ ішті", sub: { RU: "Позавтракал", KZ: "Тамақ ішті" } },
      { emoji: "🌳", word: "Серуендеді", sub: { RU: "Пошёл гулять", KZ: "Серуендеді" } },
    ],
    learnPhrase: "Оянды → Тамақ ішті → Серуендеді",
    gamePrompt: { RU: "Что было сначала? (Алдымен не болды?)", KZ: "Алдымен не болды?" },
    choices: [
      { emoji: "🌅", word: "Оянды", label: { RU: "Проснулся", KZ: "Оянды" }, correct: true },
      { emoji: "🌳", word: "Серуендеді", label: { RU: "Гулял", KZ: "Серуендеді" }, correct: false },
    ],
    practiceQuestion: { RU: "Что было сначала, а что потом? 🌅🍳🌳", KZ: "Алдымен не болды? Кейін не болды? 🌅🍳🌳" },
    rewardText: { RU: "Умница! Награда: Сказочник 📚", KZ: "Ақылдым! Сыйлық: Әңгімеші 📚" },
  },
  {
    id: 8,
    title: { RU: "Финальный квест!", KZ: "Финалдық квест!" },
    emoji: "🏆",
    color: "bg-red-600",
    audio: "/audio/kids_final.mp3",
    learn: [
      { emoji: "👋", word: "Сәлем", sub: { RU: "Приветствие", KZ: "Сәлемдесу" } },
      { emoji: "👨‍👩‍👧", word: "Отбасы", sub: { RU: "Семья", KZ: "Отбасы" } },
      { emoji: "🎨", word: "Түстер", sub: { RU: "Цвета", KZ: "Түстер" } },
      { emoji: "🦁", word: "Жануарлар", sub: { RU: "Животные", KZ: "Жануарлар" } },
    ],
    learnPhrase: "Мен сөйлей аламын!",
    gamePrompt: { RU: "Блиц! Нажимай быстро!", KZ: "Блиц! Тез бас!" },
    gameType: "tap",
    choices: [
      { emoji: "🐱", word: "Мысық", label: { RU: "Кошка", KZ: "Мысық" }, correct: true },
      { emoji: "🔴", word: "Қызыл", label: { RU: "Красный", KZ: "Қызыл" }, correct: true },
      { emoji: "👋", word: "Сәлем", label: { RU: "Привет", KZ: "Сәлем" }, correct: true },
      { emoji: "👩", word: "Ана", label: { RU: "Мама", KZ: "Ана" }, correct: true },
    ],
    practiceQuestion: { RU: "Финальное приветствие! Чему ты научился?", KZ: "Финалдық сәлемдесу! Не үйрендің?" },
    rewardText: { RU: "Победа! Курс завершён!", KZ: "Жеңіс! Курс аяқталды!" },
    finale: true,
  },
]

/* ------------------------------- Main player ------------------------------ */

export function KidsGame() {
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)

  if (!activeLesson) {
    return <LessonRoadmap onPick={setActiveLesson} />
  }

  return <LessonPlayer lesson={activeLesson} onExit={() => setActiveLesson(null)} />
}

/* --------------------------- Lesson roadmap (red) ------------------------- */

const W = 320
const TOP = 90
const SPACING = 150
const AMP = 95

function getPoint(i: number) {
  return {
    x: W / 2 + Math.sin(i * 0.9) * AMP,
    y: TOP + i * SPACING,
  }
}

function LessonRoadmap({ onPick }: { onPick: (l: Lesson) => void }) {
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
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-red-500/20 bg-card shadow-xl">
      <div className="flex items-center justify-between gap-3 bg-red-500 px-5 py-4 text-white">
        <div className="min-w-0">
          <p className="text-xs font-medium text-white/80">{t("kids.roadmap.label")}</p>
          <h3 className="truncate text-base font-bold leading-tight">{t("kids.roadmap.title")}</h3>
        </div>
        <span className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">{`0 / ${LESSONS.length}`}</span>
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
        <div className="absolute inset-0 bg-red-500/35" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-b from-orange-400/20 to-red-600/30" aria-hidden="true" />

        <div className="relative mx-auto" style={{ width: W, height }}>
          <svg width={W} height={height} className="absolute left-0 top-0" fill="none" aria-hidden="true">
            <path d={d} stroke="white" strokeOpacity="0.5" strokeWidth={16} strokeLinecap="round" />
            <path d={d} stroke="white" strokeWidth={6} strokeLinecap="round" strokeDasharray="1 26" />
          </svg>

          {LESSONS.map((lesson, i) => {
            const p = points[i]
            const labelSide = p.x > W / 2 ? "left" : "right"
            return (
              <RoadmapLessonNode
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
        <p className="text-center text-sm font-semibold text-foreground/70">{t("kids.roadmap.hint")}</p>
      </div>
    </div>
  )
}

function RoadmapLessonNode({
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
        aria-label={`${t("kids.lesson")} ${lesson.id}: ${title}`}
        className={`relative flex items-center justify-center rounded-[1.75rem] border-4 border-white text-white shadow-lg ring-4 ring-white/40 transition-transform hover:scale-110 active:scale-95 ${
          isFinale ? "bg-amber-400 text-amber-950" : lesson.color
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
        <span className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-card text-xs font-extrabold text-red-600 shadow">
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

/* -------------------------------- The player ------------------------------ */

function LessonPlayer({ lesson, onExit }: { lesson: Lesson; onExit: () => void }) {
  const { t } = useLanguage()
  const [step, setStep] = useState(0)
  const progress = ((step + 1) / 4) * 100

  const steps = [
    <StepLearn key="learn" lesson={lesson} onNext={() => setStep(1)} />,
    <StepGame key="game" lesson={lesson} onNext={() => setStep(2)} />,
    <StepPractice key="practice" lesson={lesson} onNext={() => setStep(3)} />,
    <StepReward key="reward" lesson={lesson} onExit={onExit} />,
  ]

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onExit}
          aria-label={t("kids.back")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600 transition-colors hover:bg-red-500/20"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-red-500/15">
          <div
            className="h-full rounded-full bg-red-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div key={step} className="mt-8 animate-in fade-in zoom-in-95 duration-500">
        {steps[step]}
      </div>
    </div>
  )
}

/* --------------------------------- Steps ---------------------------------- */

function StepLearn({ lesson, onNext }: { lesson: Lesson; onNext: () => void }) {
  const { t, lang } = useLanguage()
  const [popped, setPopped] = useState<number | null>(null)
  const { isPlaying, play } = useAudioPlayer()

  return (
    <div className="flex flex-col items-center text-center">
      <StepBadge label={t("kids.step.learn")} />
      <div className="mt-6 flex h-40 w-40 items-center justify-center rounded-[2.5rem] bg-red-500 text-7xl text-white shadow-lg">
        {lesson.learn[0].emoji}
      </div>
      <p className="mt-6 text-balance text-3xl font-extrabold text-foreground">{lesson.learnPhrase}</p>

      <div className="mt-4 flex flex-wrap justify-center gap-3">
        {lesson.learn.map((item, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setPopped(i)}
            className={`flex flex-col items-center gap-1 rounded-3xl border-2 border-red-500/15 bg-card px-5 py-3 transition-transform ${
              popped === i ? "scale-110 border-red-500" : "hover:scale-105"
            }`}
          >
            <span className="text-3xl">{item.emoji}</span>
            <span className="text-base font-bold text-foreground">{item.word}</span>
            <span className="text-xs text-muted-foreground">{item.sub[lang]}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => play(lesson.audio)}
        className={`mt-8 inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 text-base font-bold text-white shadow-sm transition-transform hover:scale-105 ${
          isPlaying ? "ring-4 ring-orange-500/30" : ""
        }`}
      >
        {isPlaying ? <SoundWave active className="text-white" /> : <span className="text-xl">🔊</span>}
        {t("kids.repeat")}
      </button>

      <NextButton onClick={onNext} />
    </div>
  )
}

function StepGame({ lesson, onNext }: { lesson: Lesson; onNext: () => void }) {
  const { t, lang } = useLanguage()
  const isTap = lesson.gameType === "tap"
  const [picked, setPicked] = useState<number | null>(null)
  const [wrong, setWrong] = useState<number | null>(null)

  function choose(i: number, correct: boolean) {
    if (isTap || correct) {
      setPicked(i)
      setWrong(null)
      setTimeout(onNext, 900)
    } else {
      setWrong(i)
      setTimeout(() => setWrong(null), 600)
    }
  }

  return (
    <div className="flex flex-col items-center text-center">
      <StepBadge label={t("kids.step.game")} />
      <h3 className="mt-6 text-balance text-2xl font-extrabold text-foreground">{lesson.gamePrompt[lang]}</h3>

      <div className="mt-8 grid w-full grid-cols-2 gap-4 sm:grid-cols-3">
        {lesson.choices.map((c, i) => {
          const isCorrect = picked === i
          const isWrong = wrong === i
          return (
            <button
              key={i}
              type="button"
              onClick={() => choose(i, c.correct)}
              className={`flex flex-col items-center gap-2 rounded-3xl border-4 bg-card p-5 transition-all ${
                isCorrect
                  ? "scale-110 border-emerald-500 bg-emerald-500/15"
                  : isWrong
                    ? "animate-shake border-destructive"
                    : "border-red-500/15 hover:-translate-y-1 hover:border-red-500/40"
              }`}
            >
              <span className="text-5xl">{c.emoji}</span>
              <span className="text-base font-bold text-foreground">{c.word}</span>
              <span className="text-xs text-muted-foreground">{c.label[lang]}</span>
              {isCorrect && (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check className="h-5 w-5" />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StepPractice({ lesson, onNext }: { lesson: Lesson; onNext: () => void }) {
  const { t, lang } = useLanguage()
  const [state, setState] = useState<"idle" | "recording" | "checking">("idle")

  function press() {
    if (state === "checking") return
    if (state === "idle") {
      setState("recording")
      return
    }
    // recording -> stop and run AI check
    setState("checking")
    setTimeout(onNext, 1500)
  }

  return (
    <div className="flex flex-col items-center text-center">
      <StepBadge label={t("kids.step.practice")} />
      <h3 className="mt-6 text-balance text-2xl font-extrabold text-foreground">{lesson.practiceQuestion[lang]}</h3>

      <div className="relative mt-12 flex h-48 w-48 items-center justify-center">
        {state === "recording" && (
          <>
            <span className="absolute inset-0 animate-ping rounded-full bg-red-500/30" />
            <span className="absolute inset-4 animate-pulse rounded-full bg-red-500/20" />
          </>
        )}
        <button
          type="button"
          onClick={press}
          disabled={state === "checking"}
          aria-label={t("kids.hold")}
          className={`relative flex h-32 w-32 items-center justify-center rounded-full text-white shadow-xl transition-transform ${
            state === "recording" ? "animate-pulse bg-red-600" : "bg-red-500 hover:scale-105 active:scale-95"
          }`}
        >
          {state === "checking" ? <Loader2 className="h-12 w-12 animate-spin" /> : <Mic className="h-12 w-12" />}
        </button>
      </div>

      <p className="mt-8 text-lg font-bold text-foreground">
        {state === "idle" && t("kids.hold")}
        {state === "recording" && t("kids.recording")}
        {state === "checking" && t("kids.check")}
      </p>
    </div>
  )
}

function StepReward({ lesson, onExit }: { lesson: Lesson; onExit: () => void }) {
  const { t, lang } = useLanguage()

  if (lesson.finale) {
    return <StepFinale onExit={onExit} />
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative">
        <div className="flex h-36 w-36 items-center justify-center rounded-full bg-amber-400 shadow-xl animate-in zoom-in duration-700">
          <Star className="h-20 w-20 text-amber-950" fill="currentColor" />
        </div>
        <span className="absolute -right-2 -top-2 text-4xl animate-in zoom-in duration-1000">✨</span>
        <span className="absolute -left-3 bottom-2 text-3xl animate-in zoom-in duration-1000">⭐</span>
      </div>

      <h3 className="mt-8 text-balance text-2xl font-extrabold text-foreground">{lesson.rewardText[lang]}</h3>

      <button
        type="button"
        onClick={onExit}
        className="mt-10 inline-flex items-center gap-2 rounded-2xl bg-red-500 px-8 py-4 text-lg font-bold text-white shadow-lg transition-transform hover:scale-105"
      >
        {t("kids.back")}
      </button>
    </div>
  )
}

function StepFinale({ onExit }: { onExit: () => void }) {
  const { t } = useLanguage()
  const { play } = useAudioPlayer()

  useEffect(() => {
    play("/audio/success.mp3")
    const end = Date.now() + 2500
    const colors = ["#ef4444", "#f97316", "#facc15", "#ffffff"]
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 70, origin: { x: 0 }, colors })
      confetti({ particleCount: 4, angle: 120, spread: 70, origin: { x: 1 }, colors })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
    confetti({ particleCount: 160, spread: 100, origin: { y: 0.4 }, colors })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative w-full max-w-md animate-in zoom-in-95 duration-700">
        <div className="rounded-3xl border-4 border-amber-400 bg-card p-6 shadow-2xl">
          <div className="rounded-2xl border-2 border-dashed border-amber-400/60 p-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow-lg">
              <Award className="h-9 w-9" />
            </div>
            <p className="mt-4 text-sm font-bold uppercase tracking-[0.3em] text-amber-500">{t("kids.diploma.title")}</p>
            <p className="mt-3 text-xl font-extrabold text-foreground">{t("kids.diploma.name")}</p>
            <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">{t("kids.diploma.text")}</p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-bold text-white shadow">
              <Crown className="h-4 w-4" fill="currentColor" />
              {t("kids.diploma.level")}
            </div>
          </div>
        </div>
        <span className="absolute -right-3 -top-3 text-4xl">🎉</span>
        <span className="absolute -left-3 -top-2 text-3xl">🎊</span>
      </div>

      <button
        type="button"
        onClick={onExit}
        className="mt-10 inline-flex items-center gap-2 rounded-2xl bg-red-500 px-8 py-4 text-lg font-bold text-white shadow-lg transition-transform hover:scale-105"
      >
        {t("kids.back")}
      </button>
    </div>
  )
}

/* -------------------------------- Helpers --------------------------------- */

function StepBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-red-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-red-600">
      {label}
    </span>
  )
}

function NextButton({ onClick }: { onClick: () => void }) {
  const { t } = useLanguage()
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-6 w-full rounded-2xl border-2 border-red-500/20 py-3 text-base font-bold text-red-600 transition-colors hover:bg-red-500/10"
    >
      {t("kids.next")}
    </button>
  )
}
