"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Хук записи речи с микрофона на базе HTML5 MediaRecorder API.
 *
 * Отдельно от старта записи вынесен метод `prepare()` — он запрашивает доступ
 * к микрофону (getUserMedia) и поднимает AudioContext + AnalyserNode, чтобы
 * компонент мог рисовать «живую» анимацию аудио-волны (эквалайзер).
 *
 * Возвращаемый `analyserRef` содержит AnalyserNode: визуализатор читает из него
 * частотные данные через requestAnimationFrame, пока идёт запись.
 */
export type RecorderError = "unsupported" | "denied" | null

export function useSpeechRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<RecorderError>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  const isSupported =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined"

  const cleanup = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      void audioCtxRef.current.close().catch(() => {})
    }
    audioCtxRef.current = null
    analyserRef.current = null
    recorderRef.current = null
  }, [])

  // Запрос доступа к микрофону + настройка анализатора частот для эквалайзера.
  const prepare = useCallback(async (): Promise<boolean> => {
    setError(null)
    if (!isSupported) {
      setError("unsupported")
      return false
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new AudioCtx()
      audioCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 64
      analyser.smoothingTimeConstant = 0.75
      source.connect(analyser)
      analyserRef.current = analyser
      return true
    } catch {
      setError("denied")
      cleanup()
      return false
    }
  }, [isSupported, cleanup])

  // Старт записи. Требует предварительно успешного prepare().
  const start = useCallback(() => {
    const stream = streamRef.current
    if (!stream) return
    chunksRef.current = []
    const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]
    const mimeType = preferred.find((type) => MediaRecorder.isTypeSupported(type))
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    }
    recorderRef.current = recorder
    recorder.start()
    setIsRecording(true)
  }, [])

  // Остановка записи. Возвращает готовый Blob с аудио (или null).
  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current
      if (!recorder || recorder.state === "inactive") {
        resolve(null)
        return
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })
        cleanup()
        setIsRecording(false)
        resolve(blob.size > 0 ? blob : null)
      }
      recorder.stop()
    })
  }, [cleanup])

  // Гарантированно освобождаем микрофон при размонтировании.
  useEffect(() => cleanup, [cleanup])

  return { isRecording, error, isSupported, prepare, start, stop, analyserRef }
}
