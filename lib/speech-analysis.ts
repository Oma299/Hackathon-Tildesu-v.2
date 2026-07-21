/**
 * Алгоритм ИИ-анализа речи по транскрипции (медицинские биомаркеры заикания).
 *
 * Whisper возвращает только текст, поэтому маркеры заикания вычисляются на
 * основе анализа этого текста: повторы слов и слогов, «Индекс плавности речи»,
 * темп речи, уровень риска и рекомендация ИИ.
 *
 * Модуль изоморфный (не зависит от Node/DOM), поэтому типы и функции можно
 * импортировать и на сервере (API route), и на клиенте (для типизации ответа).
 */

export type RiskLevel = "Низкий" | "Средний" | "Высокий"

export interface AnalyzedWord {
  /** Слово так, как его вернул Whisper. */
  text: string
  /** true — обнаружен повтор слова или слога (речевая запинка). */
  stumble: boolean
  /** Тип запинки для подсказки в интерфейсе. */
  kind?: "word" | "syllable"
}

export interface SpeechAnalysis {
  /** Полная распознанная транскрипция. */
  transcript: string
  /** Слова с отметками запинок для текстового разбора. */
  words: AnalyzedWord[]
  /** Всего слов в транскрипции. */
  wordCount: number
  /** Кол-во обнаруженных запинок (повторов слов/слогов). */
  stumbleCount: number
  /** Индекс плавности речи, 0–100 (выше — плавнее). */
  fluencyIndex: number
  /** Вероятность темпо-ритмического нарушения, 0–100. */
  riskPercentage: number
  /** Темп речи в словах в минуту (null, если длительность неизвестна). */
  speechRate: number | null
  /** Итоговый уровень риска. */
  riskLevel: RiskLevel
  /** Краткая рекомендация ИИ. */
  recommendation: string
}

/** Нормализует слово: нижний регистр, без знаков препинания. */
function normalize(word: string): string {
  return word.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, "")
}

/**
 * Определяет, содержит ли слово повтор слога/звука внутри себя.
 * Примеры: "при-привет", "ппривет", "ба-барабан".
 */
function hasSyllableRepeat(word: string): boolean {
  const w = normalize(word)
  if (!w) return false

  // Явный повтор через дефис: первый сегмент — начало второго ("при-привет").
  if (w.includes("-")) {
    const parts = w.split("-").filter(Boolean)
    for (let i = 0; i < parts.length - 1; i++) {
      const a = parts[i]
      const b = parts[i + 1]
      if (a.length >= 1 && (b.startsWith(a) || a.startsWith(b) || a === b)) return true
    }
  }

  const clean = w.replace(/-/g, "")
  // Повтор первой буквы 2+ раза подряд ("ппривет", "ссстол").
  if (/^(\p{L})\1{1,}/u.test(clean)) return true
  // Повтор начального слога 2–3 символа ("прапривет" -> "пра"+"привет"? нет;
  // ловим "барбара", "момомама": начальный слог сразу повторяется).
  if (/^(\p{L}{2,3})\1/u.test(clean)) return true

  return false
}

/**
 * Основной анализатор транскрипции.
 * @param transcript текст, распознанный Whisper.
 * @param durationSec длительность аудио в секундах (для темпа речи).
 */
export function analyzeTranscript(transcript: string, durationSec?: number): SpeechAnalysis {
  const clean = (transcript || "").trim()
  const rawWords = clean.length > 0 ? clean.split(/\s+/).filter(Boolean) : []

  const words: AnalyzedWord[] = []
  let stumbleCount = 0
  let prevNorm = ""

  for (const raw of rawWords) {
    const norm = normalize(raw)
    let stumble = false
    let kind: AnalyzedWord["kind"]

    // Повтор слова подряд ("я я", "мама мама").
    if (norm && norm === prevNorm) {
      stumble = true
      kind = "word"
    } else if (hasSyllableRepeat(raw)) {
      // Повтор слога/звука внутри слова.
      stumble = true
      kind = "syllable"
    }

    if (stumble) stumbleCount++
    words.push({ text: raw, stumble, kind })
    prevNorm = norm
  }

  const wordCount = rawWords.length

  // Индекс плавности: доля «чистых» слов, усиленная штрафом за запинки.
  let fluencyIndex = 100
  if (wordCount > 0) {
    const ratio = stumbleCount / wordCount
    fluencyIndex = Math.round(Math.max(0, Math.min(100, (1 - ratio * 1.5) * 100)))
  }

  const riskPercentage = Math.max(0, Math.min(100, 100 - fluencyIndex))

  // Темп речи (слов в минуту).
  const speechRate =
    typeof durationSec === "number" && durationSec > 0 ? Math.round(wordCount / (durationSec / 60)) : null

  let riskLevel: RiskLevel
  let recommendation: string
  if (fluencyIndex >= 85) {
    riskLevel = "Низкий"
    recommendation =
      "Речь плавная, выраженных признаков заикания не выявлено. Рекомендуется профилактическое наблюдение и регулярные речевые упражнения."
  } else if (fluencyIndex >= 65) {
    riskLevel = "Средний"
    recommendation =
      "Обнаружены отдельные запинки и повторы. Рекомендуются профилактические дыхательные и речевые упражнения; при сохранении симптомов — консультация логопеда."
  } else {
    riskLevel = "Высокий"
    recommendation =
      "Выявлены выраженные маркеры темпо-ритмических нарушений речи. Рекомендуется очная консультация логопеда для верификации диагноза."
  }

  return {
    transcript: clean,
    words,
    wordCount,
    stumbleCount,
    fluencyIndex,
    riskPercentage,
    speechRate,
    riskLevel,
    recommendation,
  }
}

// --- Пословное сравнение с эталонной фразой (регулярный тест) -----------------

/** Статус слова эталона после сравнения с распознанной речью. */
export type WordStatus = "correct" | "error"

export interface ComparedWord {
  /** Слово эталонной фразы (как его должен был прочитать ребёнок). */
  text: string
  /** correct — слово произнесено верно; error — пропущено/заменено/запинка. */
  status: WordStatus
}

export interface ReferenceAnalysis {
  /** Эталонная фраза, которую нужно было прочитать. */
  reference: string
  /** Распознанный Whisper текст. */
  transcript: string
  /** Слова эталона с отметкой правильности (для подсветки ошибок). */
  referenceWords: ComparedWord[]
  /** Всего слов в эталонной фразе. */
  totalWords: number
  /** Количество ошибок/запинок (слов эталона, которые не распознаны верно). */
  errorCount: number
  /** Индекс плавности речи, 0–100 = ((Всего − Ошибки) / Всего) × 100. */
  fluencyIndex: number
  /** Вероятность речевого отклонения, 0–100. */
  riskPercentage: number
  /** Темп речи, слов/мин (null, если длительность/речь недоступны). */
  speechRate: number | null
  /** Итоговый уровень риска. */
  riskLevel: RiskLevel
  /** Рекомендация ИИ для родителя. */
  recommendation: string
}

/** Разбивает строку на слова (без пустых элементов). */
function tokenize(text: string): string[] {
  const clean = (text || "").trim()
  return clean.length > 0 ? clean.split(/\s+/).filter(Boolean) : []
}

/**
 * Пословное сравнение эталонной фразы с распознанной речью.
 *
 * Используется выравнивание по наибольшей общей подпоследовательности (LCS):
 * слова эталона, попавшие в LCS с распознанным текстом, считаются
 * произнесёнными верно; остальные — ошибками (пропуск, замена, запинка).
 * Все вычисления безопасны при пустом аудио/тексте (нет деления на ноль).
 *
 * @param reference эталонная фраза (что нужно было прочитать).
 * @param transcript распознанный Whisper текст.
 * @param durationSec длительность аудио в секундах (для темпа речи).
 */
export function compareToReference(
  reference: string,
  transcript: string,
  durationSec?: number,
): ReferenceAnalysis {
  const refRaw = tokenize(reference)
  const recRaw = tokenize(transcript)
  const refNorm = refRaw.map(normalize)
  const recNorm = recRaw.map(normalize)

  const n = refNorm.length
  const m = recNorm.length

  // DP-таблица длин LCS: dp[i][j] — LCS суффиксов ref[i..] и rec[j..].
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (refNorm[i] !== "" && refNorm[i] === recNorm[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1])
      }
    }
  }

  // Обратный проход: отмечаем индексы слов эталона, вошедших в LCS (верные).
  const matched = new Set<number>()
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (refNorm[i] !== "" && refNorm[i] === recNorm[j]) {
      matched.add(i)
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++
    } else {
      j++
    }
  }

  const referenceWords: ComparedWord[] = refRaw.map((text, idx) => ({
    text,
    status: matched.has(idx) ? "correct" : "error",
  }))

  const totalWords = refRaw.length
  const errorCount = totalWords - matched.size

  // Индекс плавности = ((Всего − Ошибки) / Всего) × 100. Защита от деления на ноль.
  const fluencyIndex = totalWords > 0 ? Math.round(((totalWords - errorCount) / totalWords) * 100) : 0

  const riskPercentage = Math.max(0, Math.min(100, 100 - fluencyIndex))

  // Темп речи по количеству реально распознанных слов и длительности записи.
  const speechRate =
    typeof durationSec === "number" && durationSec > 0 && m > 0 ? Math.round(m / (durationSec / 60)) : null

  let riskLevel: RiskLevel
  let recommendation: string
  if (totalWords === 0) {
    riskLevel = "Высокий"
    recommendation = "Речь не распознана. Повторите тест в тихом помещении ближе к микрофону."
  } else if (fluencyIndex >= 85) {
    riskLevel = "Низкий"
    recommendation =
      "Ребёнок прочитал фразу чётко, отклонений не выявлено. Консультация логопеда не требуется, достаточно профилактических занятий."
  } else if (fluencyIndex >= 60) {
    riskLevel = "Средний"
    recommendation =
      "Обнаружены отдельные ошибки и запинки при чтении. Рекомендуются регулярные речевые упражнения; при сохранении — плановая консультация логопеда."
  } else {
    riskLevel = "Высокий"
    recommendation =
      "Выявлено много ошибок произношения и пропусков слов. Рекомендуется очная консультация логопеда для оценки речевого развития."
  }

  return {
    reference: (reference || "").trim(),
    transcript: (transcript || "").trim(),
    referenceWords,
    totalWords,
    errorCount,
    fluencyIndex,
    riskPercentage,
    speechRate,
    riskLevel,
    recommendation,
  }
}
