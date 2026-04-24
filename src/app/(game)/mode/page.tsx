'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { Tag } from '@/components/ui/Tag'
import type { GameMode } from '@/types'

export default function ModePage() {
  const router = useRouter()
  const [selected, setSelected] = useState<GameMode>('multiplayer')

  return (
    <MobileContainer>
      <div className="flex flex-col min-h-screen px-5 pt-5">
        {/* Step indicator */}
        <div className="mb-6">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-mono tracking-widest border border-[var(--gold)] text-[var(--gold)]">
            STAP 1 / 5
          </span>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold leading-tight">
            pick your<br />
            <span className="italic text-[var(--coral)]">poison.</span>
          </h1>
        </div>

        {/* Mode cards */}
        <div className="flex flex-col gap-4 flex-1">
          {/* Multiplayer */}
          <button
            onClick={() => setSelected('multiplayer')}
            className={`
              relative text-left p-5 rounded-2xl border transition-all duration-150
              ${selected === 'multiplayer'
                ? 'border-[var(--mint)] bg-[var(--bg-card)]'
                : 'border-[var(--border)] bg-[var(--bg-card)] opacity-70'
              }
            `}
          >
            {selected === 'multiplayer' && (
              <div className="absolute -top-3 right-4 px-3 py-1 rounded-full text-xs font-mono tracking-widest bg-[var(--coral)] text-white">
                ✨ de juiste keuze
              </div>
            )}
            <span className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-2 block">MODE 01</span>
            <h2 className="text-2xl font-bold text-[var(--mint)] mb-2">Multiplayer</h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              iedereen op eigen telefoon. sidequests, verdenkingen, groepsfoto&apos;s die je niet wil zien.
            </p>
            <div className="flex gap-2 mt-3">
              <Tag>SIDEQUESTS</Tag>
              <Tag>ACCUSE</Tag>
              <Tag>3–10</Tag>
            </div>
          </button>

          {/* Single Device */}
          <button
            onClick={() => setSelected('single_device')}
            className={`
              text-left p-5 rounded-2xl border transition-all duration-150
              ${selected === 'single_device'
                ? 'border-[var(--mint)] bg-[var(--bg-card)]'
                : 'border-[var(--border)] bg-[var(--bg-card)] opacity-70'
              }
            `}
          >
            <span className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-2 block">MODE 02</span>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Single Device</h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              één scherm doorgeven. voor als jullie telefoons dood zijn (typisch).
            </p>
          </button>
        </div>

        {/* CTA */}
        <div className="py-6">
          <Button
            variant="mint"
            fullWidth
            size="lg"
            onClick={() => router.push(selected === 'multiplayer' ? '/create' : '/settings/single')}
          >
            Next →
          </Button>
        </div>
      </div>
    </MobileContainer>
  )
}
