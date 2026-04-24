'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { useRoom } from '@/hooks/useRoom'
import { useGameStore } from '@/store/gameStore'
import { createClient } from '@/lib/supabase/client'
import type { Vibe, ContentLevel } from '@/types'

interface SettingsPageProps {
  params: Promise<{ code: string }>
}

export default function SettingsPage({ params }: SettingsPageProps) {
  const { code } = use(params)
  const router = useRouter()
  const { playerId } = useGameStore()
  const { room, players, loading } = useRoom(code)

  const [rounds, setRounds] = useState<5 | 10 | 20>(10)
  const [vibe, setVibe] = useState<Vibe>('chaos')
  const [content, setContent] = useState<ContentLevel>('spicy')
  const [generating, setGenerating] = useState(false)

  // Navigate when game starts
  useEffect(() => {
    if (room?.status === 'playing') {
      router.push(`/game/${code}`)
    }
  }, [room?.status, code, router])

  const me = players.find(p => p.id === playerId)
  const isHost = me?.is_host ?? false

  async function handleGenerate() {
    if (!room || !isHost) return
    setGenerating(true)

    const supabase = createClient()
    await supabase
      .from('rooms')
      .update({ rounds_total: rounds, vibe, content_level: content, status: 'settings' })
      .eq('id', room.id)

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: code }),
    })

    if (!res.ok) {
      setGenerating(false)
      alert('Genereren mislukt, probeer opnieuw')
    }
  }

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

  if (loading) {
    return (
      <MobileContainer>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--mint)] border-t-transparent rounded-full animate-spin" />
        </div>
      </MobileContainer>
    )
  }

  return (
    <MobileContainer>
      <div className="flex flex-col min-h-screen px-5 pt-5">
        {/* Step */}
        <div className="mb-6">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-mono tracking-widest border border-[var(--gold)] text-[var(--gold)]">
            STAP 4 / 5
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
                  onClick={() => isHost && setRounds(r)}
                  disabled={!isHost}
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
                  onClick={() => isHost && setVibe(v.value)}
                  disabled={!isHost}
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
                  onClick={() => isHost && setContent(c.value)}
                  disabled={!isHost}
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

          {!isHost && (
            <p className="text-[var(--text-muted)] text-sm text-center mt-4">
              Wacht op de host om te starten…
            </p>
          )}
        </div>

        {/* CTA */}
        {isHost && (
          <div className="py-6">
            <Button
              variant="coral"
              fullWidth
              size="lg"
              disabled={generating}
              onClick={handleGenerate}
            >
              {generating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Genereren…
                </>
              ) : 'Generate quest ✨'}
            </Button>
          </div>
        )}
      </div>
    </MobileContainer>
  )
}
