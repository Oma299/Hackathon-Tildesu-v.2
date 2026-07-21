/**
 * Надёжное хранение голосовых записей и результатов тестов речи.
 *
 * ИСТОЧНИК ПРАВДЫ — таблица Supabase `public.screening_results`.
 * После каждого завершения анализа речи полный результат (score, risk_level,
 * transcription, audio_url в Base64, word_count, error_count, speech_rate,
 * recommendations) отправляется в БД через клиент Supabase.
 *
 * HYBRID MODE (безопасность): если Supabase не настроен (нет
 * NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) или запрос упал
 * из-за сети — данные пишутся/читаются из localStorage, чтобы приложение
 * никогда не падало и не теряло записи. Все функции обёрнуты в try/catch и
 * возвращают безопасные значения (false / null / []) вместо исключений.
 *
 * Аудио хранится как устойчивая Base64 (data URL) строка — она сериализуется,
 * переживает перезагрузку страницы и проигрывается в любом плеере
 * (<audio src="data:...">), без зависимости от временных blob-URL.
 */

import { createClient } from "@/lib/supabase/client"

/** Ключ localStorage для результатов скрининга/тестов речи (fallback). */
const LOCAL_RESULTS_KEY = "local_screening_results"

/** Имя таблицы результатов скрининга в Supabase. */
const TABLE = "screening_results"

/**
 * Строка результата скрининга — точное отражение таблицы
 * `public.screening_results`. Все поля, кроме id/created_at, могут быть null,
 * поэтому интерфейс отражает это для безопасного рендера в кабинете родителя.
 */
export interface ScreeningResultRow {
  id: string
  child_id: string | null
  score: number | null
  risk_level: string | null
  transcription: string | null
  /** Base64 (data URL) запись речи для проигрывания в плеере. */
  audio_url: string | null
  word_count: number | null
  error_count: number | null
  speech_rate: number | null
  recommendations: string | null
  created_at: string
}

/** Полезная нагрузка для сохранения одного результата анализа речи. */
export interface SaveScreeningPayload {
  childId?: string | null
  score: number | null
  riskLevel: string | null
  transcription: string | null
  /** Base64 (data URL) запись речи. */
  audioUrl: string | null
  wordCount: number | null
  errorCount: number | null
  speechRate: number | null
  recommendations: string | null
}

// ---------------------------------------------------------------------------
// Вспомогательные функции (безопасные, никогда не бросают исключений).
// ---------------------------------------------------------------------------

// Читаем сохранённые результаты из localStorage (безопасно, без падений).
function readLocalResults(): ScreeningResultRow[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(LOCAL_RESULTS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as ScreeningResultRow[]) : []
  } catch (err) {
    console.log("[v0] Не удалось прочитать локальные результаты:", err)
    return []
  }
}

// Пишем результаты в localStorage (безопасно, без падений).
function writeLocalResults(rows: ScreeningResultRow[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(LOCAL_RESULTS_KEY, JSON.stringify(rows))
  } catch (err) {
    // Частая причина — переполнение localStorage длинными Base64-строками.
    console.log("[v0] Не удалось сохранить локальные результаты:", err)
  }
}

// Конвертирует Blob в data URL (Base64) для долговременного хранения аудио.
function blobToDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader()
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    } catch {
      resolve(null)
    }
  })
}

function makeId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  } catch {}
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

// Приводит произвольную строку из БД к форме ScreeningResultRow (без падений).
function normalizeRow(raw: Record<string, unknown> | null | undefined): ScreeningResultRow | null {
  if (!raw || typeof raw !== "object") return null
  const num = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null
  const str = (v: unknown): string | null => (typeof v === "string" ? v : v == null ? null : String(v))
  return {
    id: str(raw.id) ?? makeId(),
    child_id: str(raw.child_id),
    score: num(raw.score),
    risk_level: str(raw.risk_level),
    transcription: str(raw.transcription),
    audio_url: str(raw.audio_url),
    word_count: num(raw.word_count),
    error_count: num(raw.error_count),
    speech_rate: num(raw.speech_rate),
    recommendations: str(raw.recommendations),
    created_at: str(raw.created_at) ?? new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Публичный API.
// ---------------------------------------------------------------------------

/**
 * Переводит записанный аудио-Blob в устойчивую Base64 (data URL) строку.
 * Возвращает готовую к проигрыванию строку `data:audio/...;base64,...`.
 * При ошибке возвращает null (интерфейс продолжит работать без записи).
 */
export async function uploadRecording(blob: Blob): Promise<string | null> {
  if (!blob || blob.size === 0) return null
  const dataUrl = await blobToDataUrl(blob)
  if (!dataUrl) console.log("[v0] Не удалось конвертировать запись в Base64")
  return dataUrl
}

/**
 * СОХРАНЕНИЕ. Отправляет результат анализа речи в таблицу
 * `screening_results` через клиент Supabase. При отсутствии клиента или сетевой
 * ошибке безопасно откатывается на localStorage. Возвращает true при успехе.
 */
export async function saveScreeningResult(payload: SaveScreeningPayload): Promise<boolean> {
  // Готовим запись в формате колонок таблицы (безопасные значения по умолчанию).
  const record = {
    child_id: payload.childId ?? null,
    score: payload.score ?? null,
    risk_level: payload.riskLevel ?? null,
    transcription: payload.transcription ?? null,
    audio_url: payload.audioUrl ?? null,
    word_count: payload.wordCount ?? null,
    error_count: payload.errorCount ?? null,
    speech_rate: payload.speechRate ?? null,
    recommendations: payload.recommendations ?? null,
  }

  try {
    const supabase = createClient()
    if (supabase) {
      const { error } = await supabase.from(TABLE).insert(record)
      if (error) {
        console.log("[v0] Ошибка записи в Supabase, откат на localStorage:", error.message)
      } else {
        return true
      }
    }
  } catch (err) {
    console.log("[v0] Исключение при сохранении в Supabase, откат на localStorage:", err)
  }

  // Fallback: пишем в localStorage, чтобы не потерять результат.
  try {
    const rows = readLocalResults()
    rows.push({
      id: makeId(),
      ...record,
      created_at: new Date().toISOString(),
    })
    writeLocalResults(rows)
    return true
  } catch (err) {
    console.log("[v0] Исключение при локальном сохранении результата:", err)
    return false
  }
}

/**
 * Возвращает последний сохранённый результат с аудиозаписью
 * для плеера на карточке отчёта в кабинете родителя. Никогда не бросает.
 */
export async function fetchLatestRecording(): Promise<ScreeningResultRow | null> {
  try {
    const supabase = createClient()
    if (supabase) {
      const { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .not("audio_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
      if (error) {
        console.log("[v0] Ошибка чтения последней записи из Supabase:", error.message)
      } else {
        const row = normalizeRow(Array.isArray(data) ? data[0] : null)
        if (row) return row
      }
    }
  } catch (err) {
    console.log("[v0] Исключение при чтении последней записи:", err)
  }

  // Fallback: последняя запись с аудио из localStorage.
  const withAudio = readLocalResults().filter((row) => !!row.audio_url)
  return withAudio.length > 0 ? withAudio[withAudio.length - 1] : null
}

/**
 * ЛИЧНЫЙ КАБИНЕТ. Возвращает ВСЮ историю сохранённых результатов (новые сверху)
 * из таблицы `screening_results` для раздела «История скринингов».
 * При недоступности Supabase читает историю из localStorage. Никогда не бросает.
 */
export async function fetchAllRecordings(): Promise<ScreeningResultRow[]> {
  try {
    const supabase = createClient()
    if (supabase) {
      const { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .order("created_at", { ascending: false })
      if (error) {
        console.log("[v0] Ошибка чтения истории из Supabase:", error.message)
      } else if (Array.isArray(data)) {
        return data.map((r) => normalizeRow(r as Record<string, unknown>)).filter((r): r is ScreeningResultRow => !!r)
      }
    }
  } catch (err) {
    console.log("[v0] Исключение при чтении истории:", err)
  }

  // Fallback: локальная история, новые сверху.
  return [...readLocalResults()].reverse()
}
