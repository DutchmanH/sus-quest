'use client'

import { useEffect, useState } from 'react'

const LINES = [
  'VERDACHTEN IDENTIFICEREN',
  'GROEPSGEDRAG ANALYSEREN',
  'VRAGEN SAMENSTELLEN',
  'SIDEQUESTS CODEREN',
  'DOSSIER VERSLEUTELEN',
]

const TOTAL_MS = 13000

export function GeneratingLoader() {
  const [visibleCount, setVisibleCount] = useState(0)
  const [progress, setProgress] = useState(0)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    // Lines appear spread over 70% of the expected time
    const lineInterval = (TOTAL_MS * 0.7) / LINES.length
    LINES.forEach((_, i) => {
      setTimeout(() => setVisibleCount(i + 1), (i + 1) * lineInterval)
    })

    // Blinking cursor tick
    const cursorTimer = setInterval(() => setTick(t => t + 1), 530)

    // Progress bar: eases in quickly then crawls near 90%
    let frame: number
    const start = performance.now()
    function step(now: number) {
      const elapsed = now - start
      const t = Math.min(elapsed / TOTAL_MS, 0.92)
      // ease-out curve: fast early, slow near end
      const eased = 1 - Math.pow(1 - t, 2.5)
      setProgress(Math.round(eased * 92))
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)

    return () => {
      clearInterval(cursorTimer)
      cancelAnimationFrame(frame)
    }
  }, [])

  const cursor = tick % 2 === 0 ? '█' : ' '

  return (
    <div className="fixed inset-0 bg-[var(--bg-primary)] flex flex-col px-6 pt-14 pb-10">

      {/* REC indicator */}
      <div className="flex items-center gap-2 mb-10">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--coral)] opacity-60" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--coral)]" />
        </span>
        <span className="text-[10px] font-mono tracking-[0.25em] text-[var(--coral)]">
          GEHEIM SYSTEEM — ACTIEF
        </span>
      </div>

      {/* Title */}
      <div className="mb-10">
        <p className="text-[10px] font-mono tracking-[0.2em] text-[var(--text-muted)] mb-3 uppercase">
          Opdracht
        </p>
        <h2 className="text-4xl font-bold leading-tight text-[var(--text-primary)]">
          dossier<br />
          <span className="italic text-[var(--coral)]">samenstellen.</span>
        </h2>
      </div>

      {/* Terminal lines */}
      <div className="flex-1 flex flex-col gap-3.5">
        {LINES.map((line, i) => {
          const visible = i < visibleCount
          const isActive = i === visibleCount - 1
          const isDone = i < visibleCount - 1

          return (
            <div
              key={line}
              className={`flex items-center gap-3 transition-all duration-500 ${
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

      {/* Progress */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-mono tracking-[0.2em] text-[var(--text-muted)] uppercase">
            Voortgang
          </span>
          <span className="text-[10px] font-mono text-[var(--text-muted)]">
            {progress}%
          </span>
        </div>
        <div className="h-px bg-[var(--border)] relative overflow-hidden rounded-full">
          <div
            className="absolute inset-y-0 left-0 bg-[var(--coral)] transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] opacity-40 mt-3 text-center">
          even geduld — dit duurt ~10 seconden
        </p>
      </div>

    </div>
  )
}
