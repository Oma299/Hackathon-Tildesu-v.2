"use client"

import { useEffect, useRef, type RefObject } from "react"

/**
 * «Живой» эквалайзер аудио-волны. Пока идёт запись (active=true), читает
 * частотные данные из AnalyserNode через requestAnimationFrame и анимирует
 * высоту столбиков. Если анализатор недоступен, падает на CSS-анимацию.
 */
export function AudioEqualizer({
  analyserRef,
  active,
  bars = 28,
  className = "",
}: {
  analyserRef: RefObject<AnalyserNode | null>
  active: boolean
  bars?: number
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!active) return
    const analyser = analyserRef.current
    const container = containerRef.current
    if (!container) return

    const spans = Array.from(container.children) as HTMLElement[]

    // Фолбэк без анализатора: используем CSS-анимацию столбиков.
    if (!analyser) {
      spans.forEach((span) => span.classList.add("animate-audiowave"))
      return () => spans.forEach((span) => span.classList.remove("animate-audiowave"))
    }

    const data = new Uint8Array(analyser.frequencyBinCount)
    let raf = 0

    const draw = () => {
      analyser.getByteFrequencyData(data)
      const step = Math.floor(data.length / spans.length) || 1
      spans.forEach((span, i) => {
        const value = data[i * step] ?? 0
        const height = Math.max(12, (value / 255) * 100)
        span.style.height = `${height}%`
        span.style.opacity = `${0.45 + (value / 255) * 0.55}`
      })
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [active, analyserRef])

  return (
    <div
      ref={containerRef}
      className={`flex h-16 items-center justify-center gap-1 ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="w-1.5 rounded-full bg-primary transition-[height,opacity] duration-100 ease-out"
          style={{
            height: "20%",
            animationDelay: `${(i % 7) * 0.12}s`,
            animationDuration: `${0.7 + (i % 5) * 0.12}s`,
          }}
        />
      ))}
    </div>
  )
}
