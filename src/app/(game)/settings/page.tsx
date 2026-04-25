'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { useGameStore } from '@/store/gameStore'
import type { Vibe, ContentLevel } from '@/types'

export default function SettingsPage() {
  const router = useRouter()
  const { setPlayer } = useGameStore()

  const [rounds, setRounds] = useState<5 | 10 | 20>(10)
  const [vibe, setVibe] = useState<Vibe>('chaos')
  const [content, setContent] = useState<ContentLevel>('spicy')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const vibes: { value: Vibe; label: string }[] = [
    { value: 'chill', label: 'chill' },
    { value: 'chaos', label: 'chaos' },
    { value: 'awkward', label: 'awkward' },
    { value: 'spicy', label: 'spicy' },
    { value: 'comp', label: 'comp.' },
  ]

  const contents: { value: ContentLevel; label: string }[] = [
    { value: 'safe', label: 'safe' },
    { value: 'spicy', label: 'spicy' },
    { value: 'extra_spicy', label: 'extra spicy' },
  ]

  async function handleNext() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rounds_total: rounds, vibe, content_level: content }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Room aanmaken mislukt')
        return
      }
      const { room, player } = await res.json()
      setPlayer(player.id, player.display_name, player.avatar_color)
      router.push(`/lobby/${room.code}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verbindingsfout — check je internet')
    } finally {
      setLoading(false)
    }
  }

  return (
    <MobileContainer>
      <div className="flex flex-col min-h-screen px-5 pt-5">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="text-[var(--text-muted)] text-sm mb-6 self-start hover:text-[var(--text-primary)]"
        >
          ← terug
        </button>

        {/* Step */}
        <div className="mb-6">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-mono tracking-widest border border-[var(--gold)] text-[var(--gold)]">
            STAP 2 / 3
          </span>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold leading-tight">
            hoe erg loopt<br />
            het <span className="italic text-[var(--coral)]">uit de hand?</span>
          </h1>
        </div>

        {/* Settings */}
        <div className="flex flex-col gap-6 flex-1">
          {/* Rounds */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="font-semibold text-[var(--text-primary)]">rondes</span>
              <span className="text-xs font-mono text-[var(--text-muted)]">→ {rounds}</span>
            </div>
            <div className="flex gap-2">
              {([5, 10, 20] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRounds(r)}
                  className={`
                    flex-1 py-2 rounded-full font-semibold text-sm transition-all
                    ${rounds === r
                      ? 'bg-[var(--mint)] text-[var(--bg-primary)]'
                      : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)]'
                    }
                  `}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Vibe */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="font-semibold text-[var(--text-primary)]">vibe</span>
              <span className="text-xs font-mono text-[var(--text-muted)]">→ {vibe}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {vibes.map(v => (
                <button
                  key={v.value}
                  onClick={() => setVibe(v.value)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-semibold transition-all
                    ${vibe === v.value
                      ? 'bg-[var(--coral)] text-white'
                      : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)]'
                    }
                  `}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="font-semibold text-[var(--text-primary)]">content</span>
              <span className="text-xs font-mono text-[var(--text-muted)]">→ {content.replace('_', ' ')}</span>
            </div>
            <div className="flex gap-2">
              {contents.map(c => (
                <button
                  key={c.value}
                  onClick={() => setContent(c.value)}
                  className={`
                    flex-1 py-2 rounded-full text-sm font-semibold transition-all
                    ${content === c.value
                      ? 'bg-[var(--gold)] text-[var(--bg-primary)]'
                      : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)]'
                    }
                  `}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-[var(--coral)] text-sm">{error}</p>}
        </div>

        {/* CTA */}
        <div className="py-6">
          <Button variant="mint" fullWidth size="lg" disabled={loading} onClick={handleNext}>
            {loading ? 'Room aanmaken…' : 'Nodig suspects uit →'}
          </Button>
        </div>
      </div>
    </MobileContainer>
  )
}
