"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Volume2 } from "lucide-react"

/**
 * Plays an HTML5 Audio file and exposes an `isPlaying` flag that stays true
 * for ~2.5s (or the audio duration) so the UI can show a sound wave.
 * Missing files fail gracefully — the visual wave still plays.
 */
export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const play = useCallback((src: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setIsPlaying(true)
    try {
      const audio = new Audio(src)
      audioRef.current = audio
      // ignore promise rejection when the file is missing
      void audio.play().catch(() => {})
    } catch {
      // no-op: keep the visual feedback even if audio can't load
    }
    timerRef.current = setTimeout(() => setIsPlaying(false), 2500)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      audioRef.current?.pause()
    }
  }, [])

  return { isPlaying, play }
}

/** Three pulsing vertical bars shown while audio is playing. */
export function SoundWave({ active, className = "" }: { active: boolean; className?: string }) {
  if (!active) return null
  return (
    <span className={`flex items-end gap-0.5 ${className}`} aria-hidden="true">
      <span className="h-2 w-1 animate-pulse rounded-full bg-current [animation-delay:-0.2s]" />
      <span className="h-4 w-1 animate-pulse rounded-full bg-current" />
      <span className="h-3 w-1 animate-pulse rounded-full bg-current [animation-delay:-0.4s]" />
    </span>
  )
}

/** Round speaker button that plays audio and shows the sound wave while active. */
export function SpeakerButton({
  src,
  label,
  size = "md",
  className = "",
}: {
  src: string
  label: string
  size?: "sm" | "md"
  className?: string
}) {
  const { isPlaying, play } = useAudioPlayer()
  const dim = size === "sm" ? "h-9 w-9" : "h-11 w-11"
  const icon = size === "sm" ? "h-4 w-4" : "h-5 w-5"
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => play(src)}
        aria-label={label}
        className={`flex ${dim} shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-110 active:scale-95 ${
          isPlaying ? "ring-4 ring-primary/30" : ""
        } ${className}`}
      >
        <Volume2 className={icon} />
      </button>
      <SoundWave active={isPlaying} className="text-primary" />
    </span>
  )
}
