'use client'

import { Button } from '@/components/ui/Button'
import { useState } from 'react'

interface SidequestCardProps {
  isSus: boolean
  hasSidequest: boolean
  text: string
  missionNumber: number
  onClose: () => void
}

export function SidequestCard({ isSus, hasSidequest, text, missionNumber, onClose }: SidequestCardProps) {
  const [flipped, setFlipped] = useState(false)
  const headerTone = isSus ? 'text-[var(--coral)]' : hasSidequest ? 'text-[var(--gold)]' : 'text-[var(--mint)]'
  const backBg = isSus ? 'var(--coral)' : hasSidequest ? 'var(--gold)' : 'var(--mint)'
  const roundTag = `R${String(missionNumber).padStart(2, '0')}`
  const title = isSus
    ? 'jij bent de sus.'
    : hasSidequest
      ? 'jij bent safe.'
      : 'iedereen heeft een kaart.'
  const subtitle = isSus
    ? `GEHEIME MISSIE · ${roundTag}`
    : hasSidequest
      ? `JOUW KAART · ${roundTag}`
      : `FUN KAART · ${roundTag}`
  const hint = isSus
    ? 'lees snel — sluit af — act normal.'
    : hasSidequest
      ? 'iemand speelt niet eerlijk. zoek wie.'
      : 'blijf scherp. iedereen kan verdacht zijn.'

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="w-full max-w-[460px] mx-auto px-4 pb-8">
        <div className="px-2 py-3 flex items-center justify-center gap-2">
          <span className={`text-[10px] font-mono tracking-[0.25em] uppercase ${headerTone}`}>
            alleen jij mag dit zien
          </span>
        </div>

        <div
          className="relative w-full h-[58vh] min-h-[360px] max-h-[520px]"
          style={{ perspective: '1400px' }}
        >
          <button
            onClick={() => setFlipped(v => !v)}
            className="relative w-full h-full rounded-3xl"
            aria-label="Draai kaart om"
            style={{ transformStyle: 'preserve-3d', transition: 'transform 500ms ease', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
          >
            <div
              className="absolute inset-0 rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 flex flex-col justify-between"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div>
                <p className="text-[10px] font-mono tracking-[0.2em] text-[var(--text-muted)] uppercase">
                  prive kaart
                </p>
                <h2 className="text-3xl font-bold text-[var(--text-primary)] mt-2 leading-tight">
                  tap om te
                  <br />
                  bekijken
                </h2>
              </div>
              <div className="rounded-2xl border border-[var(--border)] px-4 py-3 text-left">
                <p className="text-sm text-[var(--text-muted)]">
                  Houd je scherm dicht bij jezelf en draai de kaart pas als niemand meekijkt.
                </p>
              </div>
            </div>

            <div
              className="absolute inset-0 rounded-3xl p-6 flex flex-col justify-between"
              style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', background: backBg }}
            >
              <div>
                <p className="text-[10px] font-mono tracking-[0.2em] text-[var(--bg-primary)] opacity-75 uppercase">
                  {subtitle}
                </p>
                <h2 className="text-3xl font-bold text-[var(--bg-primary)] mt-2 leading-tight">
                  {title}
                </h2>
              </div>
              <div className="rounded-2xl bg-[var(--bg-primary)]/15 px-4 py-3">
                <p className="text-xl font-semibold leading-snug text-[var(--bg-primary)]">
                  {text}
                </p>
              </div>
              <p className="text-sm font-mono text-[var(--bg-primary)]/75">
                {hint}
              </p>
            </div>
          </button>
        </div>

        <div className="px-1 pt-4 flex gap-2">
          <button
            onClick={() => setFlipped(v => !v)}
            className="flex-1 py-3 rounded-2xl border border-[var(--border)] text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            {flipped ? 'Verberg kaart' : 'Toon kaart'}
          </button>
          <div className="flex-1">
            <Button variant="dark" fullWidth onClick={onClose} size="lg">
              sluit kaart
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
