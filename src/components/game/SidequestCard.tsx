'use client'

import { Button } from '@/components/ui/Button'

interface SidequestCardProps {
  isSus: boolean
  text: string
  missionLabel: string
  onClose: () => void
  closeLabel: string
  succeededLabel: string
  caughtLabel: string
  readFastLabel: string
  missionNumber: number
}

export function SidequestCard({
  text,
  onClose,
  closeLabel,
  succeededLabel,
  caughtLabel,
  readFastLabel,
  missionNumber,
}: SidequestCardProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="w-full max-w-[390px] mx-auto">
        {/* Header */}
        <div className="px-6 py-3 flex items-center gap-2">
          <span className="text-xs font-mono tracking-widest text-[var(--text-muted)]">
            🔒 JUST FOR YOU · NIEMAND KIJKT MEE
          </span>
        </div>

        {/* Card */}
        <div className="mx-4 mb-4 rounded-3xl p-6" style={{ background: 'var(--mint)' }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-xs font-mono tracking-widest text-[var(--bg-primary)] opacity-70">
                MISSIE · R{String(missionNumber).padStart(2, '0')}
              </span>
              <h2 className="text-2xl font-bold text-[var(--bg-primary)] mt-1">
                sidequest ✦
              </h2>
            </div>
            <span className="text-2xl">★</span>
          </div>

          <p className="text-[var(--bg-primary)] text-xl font-semibold leading-snug mb-6">
            {text}
          </p>

          <div className="border-t border-[var(--bg-primary)] border-opacity-20 pt-4 flex justify-between">
            <span className="text-sm font-mono text-[var(--bg-primary)]">
              {succeededLabel} → +1
            </span>
            <span className="text-sm font-mono text-[var(--bg-primary)] opacity-60">
              {caughtLabel} → 0
            </span>
          </div>
        </div>

        {/* Bottom hint */}
        <p className="text-center text-sm text-[var(--text-muted)] mb-4 px-6">
          {readFastLabel}
        </p>

        <div className="px-4 mb-8">
          <Button variant="dark" fullWidth onClick={onClose} size="lg">
            ← {closeLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
