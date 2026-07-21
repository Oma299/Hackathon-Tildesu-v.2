"use client"

import { useEffect, useRef, useState } from "react"
import { Play, Pause, AudioLines, Loader2 } from "lucide-react"

// Форматирует секунды в вид m:ss.
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, "0")}`
}

/**
 * Стильный аудиоплеер сохранённой записи (по ссылке audio_url).
 * Play/Pause + перетаскиваемый ползунок времени и таймкоды.
 */
export function AudioPlayer({
  src,
  title = "Запись речи",
  className = "",
}: {
  src: string
  title?: string
  className?: string
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onLoaded = () => {
      // Некоторые webm-записи не сообщают длительность сразу — тогда 0.
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
    }
    const onTime = () => setCurrentTime(audio.currentTime)
    const onEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audio.addEventListener("loadedmetadata", onLoaded)
    audio.addEventListener("durationchange", onLoaded)
    audio.addEventListener("timeupdate", onTime)
    audio.addEventListener("ended", onEnded)
    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded)
      audio.removeEventListener("durationchange", onLoaded)
      audio.removeEventListener("timeupdate", onTime)
      audio.removeEventListener("ended", onEnded)
    }
  }, [src])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      void audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false))
    }
  }

  function handleSeek(event: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current
    if (!audio) return
    const time = Number(event.target.value)
    audio.currentTime = time
    setCurrentTime(time)
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  // crossOrigin=anonymous нужен только для удалённых ссылок (Supabase Storage).
  // Для локальных blob:/data: URL из Hybrid Mode он лишний и может ломать
  // воспроизведение — поэтому не задаём его для локальных источников.
  const isRemote = /^https?:/i.test(src)

  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 ${className}`}
    >
      <audio ref={audioRef} src={src} preload="metadata" crossOrigin={isRemote ? "anonymous" : undefined} />

      <button
        type="button"
        onClick={togglePlay}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105 active:scale-95"
        aria-label={isPlaying ? "Пауза" : "Воспроизвести запись"}
      >
        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-0.5" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <AudioLines className="h-4 w-4 shrink-0 text-primary" />
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        </div>

        <div className="mt-2 flex items-center gap-3">
          <div className="relative flex-1">
            {/* Заполненная дорожка прогресса */}
            <div className="pointer-events-none absolute inset-y-0 my-auto h-2 w-full overflow-hidden rounded-full bg-primary/15">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
            {/* Реальный ползунок поверх дорожки */}
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.01}
              value={currentTime}
              onChange={handleSeek}
              aria-label="Позиция воспроизведения"
              className="relative z-10 h-2 w-full cursor-pointer appearance-none bg-transparent accent-primary [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow"
            />
          </div>
          <span className="w-16 shrink-0 text-right font-mono text-xs text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  )
}
