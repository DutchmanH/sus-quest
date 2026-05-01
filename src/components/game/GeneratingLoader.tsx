'use client'

import { useEffect, useState } from 'react'

const COPY = {
  nl: {
    systemActive: 'GEHEIM SYSTEEM — ACTIEF',
    caseFile: 'Case file',
    headlineTop: 'de zaak',
    headlineBottom: 'wordt opgebouwd.',
    progress: 'Voortgang',
    phase: 'Fase',
    almostDone: 'bijna klaar — laatste checks...',
    suspectTitle: 'Verdachten in beeld',
    funny: [
      'micro-expressies aan het ontleden...',
      'alibi-consistentie op scherp zetten...',
      'dramameter: maximaal.',
      'sociale spanning finetunen...',
      'een speler wordt straks heftig verdacht...',
    ],
    lines: [
      'VERDACHTEN PROFILEREN',
      'GROEPSDYNAMIEK INLADEN',
      'HOOFDVRAGEN CUREREN',
      'SIDEQUESTS CALIBREREN',
      'DOSSIER VERZEGELEN',
    ],
  },
  en: {
    systemActive: 'SECRET SYSTEM — ACTIVE',
    caseFile: 'Case file',
    headlineTop: 'building',
    headlineBottom: 'the case.',
    progress: 'Progress',
    phase: 'Phase',
    almostDone: 'almost done — final checks...',
    suspectTitle: 'Suspects on radar',
    funny: [
      'reading suspicious micro-reactions...',
      'checking alibi consistency...',
      'chaos level: maximum.',
      'tuning social tension...',
      'someone is about to look very guilty...',
    ],
    lines: [
      'PROFILING SUSPECTS',
      'LOADING GROUP DYNAMICS',
      'CURATING MAIN QUESTIONS',
      'CALIBRATING SIDEQUESTS',
      'SEALING CASE FILE',
    ],
  },
} as const

const DEFAULT_TOTAL_MS = 12000

export function GeneratingLoader({
  language = 'nl',
  estimatedDurationMs = DEFAULT_TOTAL_MS,
}: {
  language?: 'nl' | 'en'
  estimatedDurationMs?: number
}) {
  const copy = COPY[language]
  const [visibleCount, setVisibleCount] = useState(0)
  const [progress, setProgress] = useState(0)
  const [tick, setTick] = useState(0)
  const [funnyIndex, setFunnyIndex] = useState(0)
  const [pulseIndex, setPulseIndex] = useState(0)

  useEffect(() => {
    const totalMs = Math.max(7000, estimatedDurationMs)
    const lineInterval = (totalMs * 0.7) / copy.lines.length
    copy.lines.forEach((_, i) => {
      setTimeout(() => setVisibleCount(i + 1), (i + 1) * lineInterval)
    })

    const cursorTimer = setInterval(() => setTick(t => t + 1), 320)
    const funnyTimer = setInterval(() => {
      setFunnyIndex(i => (i + 1) % copy.funny.length)
    }, 900)
    const pulseTimer = setInterval(() => {
      setPulseIndex(i => (i + 1) % 3)
    }, 500)

    let frame: number
    const start = performance.now()
    function step(now: number) {
      const elapsed = now - start
      const t = Math.min(elapsed / totalMs, 1)

      // More natural progress: slower build-up, less "instant 90% then wait".
      let nextProgress: number
      if (t < 0.88) {
        const phase = t / 0.88
        nextProgress = Math.round(Math.pow(phase, 1.15) * 88)
      } else {
        const phase = (t - 0.88) / 0.12
        const eased = 1 - Math.pow(1 - phase, 1.8)
        nextProgress = 88 + Math.round(eased * 6)
      }

      setProgress(Math.min(nextProgress, 94))
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)

    return () => {
      clearInterval(cursorTimer)
      clearInterval(funnyTimer)
      clearInterval(pulseTimer)
      cancelAnimationFrame(frame)
    }
  }, [copy.funny.length, copy.lines, estimatedDurationMs])

  const cursor = tick % 2 === 0 ? '█' : ' '
  const phase = Math.max(1, Math.min(5, Math.ceil((progress / 100) * 5)))

  return (
    <div className="fixed inset-0 bg-[var(--bg-primary)] flex justify-center overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(255,127,107,0.22) 0%, rgba(255,127,107,0) 70%)' }}
        />
      </div>
      <div className="w-full max-w-[460px] min-h-screen flex flex-col px-6 pt-12 pb-10 relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--coral)] opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--coral)]" />
            </span>
            <span className="text-[10px] font-mono tracking-[0.25em] text-[var(--coral)]">
              {copy.systemActive}
            </span>
          </div>
          <span className="px-2 py-1 rounded-md border border-[var(--coral)]/60 text-[9px] font-mono tracking-widest text-[var(--coral)] uppercase rotate-[2deg]">
            top secret
          </span>
        </div>

        <div className="mb-6">
          <p className="text-[10px] font-mono tracking-[0.2em] text-[var(--text-muted)] mb-3 uppercase">
            {copy.caseFile}
          </p>
          <h2 className="text-4xl font-bold leading-tight text-[var(--text-primary)]">
            {copy.headlineTop}<br />
            <span className="italic text-[var(--coral)]">{copy.headlineBottom}</span>
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`rounded-xl border px-2 py-2 transition-all ${
                pulseIndex === i
                  ? 'border-[var(--mint)] bg-[var(--mint)]/10'
                  : 'border-[var(--border)] bg-[var(--bg-card)]'
              }`}
            >
              <p className="text-[10px] font-mono tracking-wider text-[var(--text-muted)] uppercase mb-1">
                {copy.suspectTitle}
              </p>
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                #{i + 1} {pulseIndex === i ? '●' : '○'}
              </p>
            </div>
          ))}
        </div>

        <p className="text-xs font-mono tracking-wider text-[var(--mint)] mb-6">
          {copy.funny[funnyIndex]}
        </p>

        <div className="flex-1 flex flex-col gap-3.5">
          {copy.lines.map((line, i) => {
            const visible = i < visibleCount
            const isActive = i === visibleCount - 1
            const isDone = i < visibleCount - 1

            return (
              <div
                key={line}
                className={`flex items-center gap-3 transition-all duration-300 ${
                  visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'
                }`}
              >
                <span className={`text-xs font-mono w-4 shrink-0 ${
                  isDone ? 'text-[var(--mint)]' : 'text-[var(--coral)]'
                }`}>
                  {isDone ? '✓' : '>'}
                </span>
                <span className={`text-sm font-mono tracking-widest ${
                  isDone
                    ? 'text-[var(--text-muted)]'
                    : 'text-[var(--text-primary)]'
                }`}>
                  {line}
                  {isActive && (
                    <span className="text-[var(--coral)] ml-0.5">{cursor}</span>
                  )}
                </span>
              </div>
            )
          })}
        </div>

        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-mono tracking-[0.2em] text-[var(--text-muted)] uppercase">
              {copy.progress}
            </span>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">
              {copy.phase} {phase}/5 · {progress}%
            </span>
          </div>
          <div className="h-1.5 bg-[var(--border)]/60 relative overflow-hidden rounded-full">
            <div
              className="absolute inset-y-0 left-0 bg-[var(--coral)] transition-all duration-200 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] opacity-60 mt-3 text-center">
            {copy.almostDone}
          </p>
        </div>
      </div>
    </div>
  )
}
