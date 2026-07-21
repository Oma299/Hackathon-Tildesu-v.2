import { createBrowserClient } from "@supabase/ssr"

/**
 * Синглтон браузерного клиента Supabase (Hybrid Mode).
 *
 * Клиент создаётся ТОЛЬКО если заданы переменные окружения
 * NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * Если их нет, они пустые или создание клиента бросает исключение —
 * функция возвращает `null`, а приложение продолжает работать
 * в оффлайн-режиме через localStorage (см. lib/speech-recordings.ts).
 * Это гарантирует, что импорт модуля никогда не уронит приложение.
 */
type SupabaseBrowserClient = ReturnType<typeof createBrowserClient>

// undefined — ещё не пытались создать; null — создать невозможно (нет ключей/ошибка).
let client: SupabaseBrowserClient | null | undefined

/**
 * Проверяет, что оба обязательных ключа Supabase присутствуют и непустые.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return (
    typeof url === "string" &&
    url.trim().length > 0 &&
    typeof key === "string" &&
    key.trim().length > 0
  )
}

/**
 * Возвращает браузерный клиент Supabase или `null`, если конфигурация
 * отсутствует либо инициализация завершилась ошибкой. Никогда не бросает.
 */
export function createClient(): SupabaseBrowserClient | null {
  // Возвращаем закешированный результат (клиент или null).
  if (client !== undefined) return client

  if (!isSupabaseConfigured()) {
    console.log("[v0] Supabase не настроен — включён localStorage режим (Hybrid Mode).")
    client = null
    return client
  }

  try {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    )
  } catch (err) {
    console.log("[v0] Не удалось создать клиент Supabase, переключаемся на localStorage:", err)
    client = null
  }
  return client
}
