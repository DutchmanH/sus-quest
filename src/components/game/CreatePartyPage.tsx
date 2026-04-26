'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { Tag } from '@/components/ui/Tag'
import { useGameStore } from '@/store/gameStore'
import type { ContentLevel, GameMode, Vibe } from '@/types'

export function CreatePartyPage() {
  const router = useRouter()
  const { setPlayer } = useGameStore()
  const [step, setStep] = useState<1 | 2>(1)
  const [selected, setSelected] = useState<GameMode>('multiplayer')
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

  async function handleCreateParty() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rounds_total: rounds, vibe, content_level: content, mode: selected }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Room aanmaken mislukt')
        return
      }
      const { room, player } = await res.json()
      setPlayer(player.id, player.display_name, player.avatar_color)
      router.push(`/lobby/${room.code}/generate`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verbindingsfout — check je internet')
    } finally {
      setLoading(false)
    }
  }

  return (
    <MobileContainer>
      <div className="flex flex-col min-h-screen px-5 pt-5">
        {step === 2 && (
          <button
            onClick={() => {
              setError(null)
              setStep(1)
            }}
            className="text-[var(--text-muted)] text-sm mb-6 self-start hover:text-[var(--text-primary)]"
          >
            ← terug
          </button>
        )}

        <div className="mb-6">
          <span className="inline-block px-4 py-1 rounded-full text-xs font-mono font-bold tracking-widest bg-[var(--coral)] text-[var(--bg-primary)]">
            {step === 1 ? 'STAP 1 / 2' : 'STAP 2 / 2'}
          </span>
        </div>

        {step === 1 && (
          <>
            <div className="mb-8">
              <h1 className="text-5xl font-bold leading-tight text-[var(--text-primary)]">
                pick your
                <br />
                <span className="italic text-[var(--mint)]">poison.</span>
              </h1>
            </div>

            <div className="flex flex-col gap-4 flex-1">
              <button
                onClick={() => setSelected('multiplayer')}
                className={`
                  relative text-left p-5 rounded-3xl border transition-all duration-150
                  ${selected === 'multiplayer'
                    ? 'border-transparent bg-[var(--mint)]'
                    : 'border-[var(--border)] border-dashed bg-[var(--bg-card)] opacity-70'
                  }
                `}
              >
                {selected === 'multiplayer' && (
                  <div className="absolute -top-3 right-4 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-widest bg-[var(--coral)] text-[var(--bg-primary)] rotate-[4deg]">
                    ✨ de juiste keuze
                  </div>
                )}
                <span className={`text-xs font-mono tracking-widest mb-2 block ${selected === 'multiplayer' ? 'text-[var(--bg-primary)] opacity-70' : 'text-[var(--text-muted)]'}`}>
                  MODE 01
                </span>
                <h2 className={`text-5xl font-bold leading-none mb-2 ${selected === 'multiplayer' ? 'text-[var(--bg-primary)]' : 'text-[var(--text-primary)]'}`}>
                  Multiplayer
                </h2>
                <p className={`text-sm leading-relaxed max-w-[28ch] ${selected === 'multiplayer' ? 'text-[var(--bg-primary)] opacity-80' : 'text-[var(--text-muted)]'}`}>
                  iedereen op eigen telefoon. sidequests, verdenkingen, groepsfoto&apos;s die je niet wil zien.
                </p>
                <div className="flex gap-2 mt-4">
                  <Tag>SIDEQUESTS</Tag>
                  <Tag>ACCUSE</Tag>
                  <Tag>3-10</Tag>
                </div>
              </button>

              <button
                onClick={() => setSelected('single_device')}
                className={`
                  text-left p-5 rounded-3xl border border-dashed transition-all duration-150
                  ${selected === 'single_device'
                    ? 'border-[var(--mint)] bg-[var(--bg-card)]'
                    : 'border-[var(--border)] bg-[var(--bg-card)] opacity-80'
                  }
                `}
              >
                <span className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-2 block">
                  MODE 02
                </span>
                <h2 className="text-5xl font-bold leading-none text-[var(--text-primary)] mb-2">
                  Single Device
                </h2>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-[30ch]">
                  een scherm doorgeven. voor als jullie telefoons dood zijn (typisch).
                </p>
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="mb-8">
              <h1 className="text-4xl font-bold leading-tight">
                hoe erg loopt
                <br />
                het <span className="italic text-[var(--coral)]">uit de hand?</span>
              </h1>
            </div>

            <div className="flex flex-col gap-6 flex-1">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="font-semibold text-[var(--text-primary)]">rondes</span>
                  <span className="text-xs font-mono text-[var(--text-muted)]">→ {rounds}</span>
                </div>
                <div className="flex gap-2">
                  {([5, 10, 20] as const).map((roundOption) => (
                    <button
                      key={roundOption}
                      onClick={() => setRounds(roundOption)}
                      className={`
                        flex-1 py-2 rounded-full font-semibold text-sm transition-all
                        ${rounds === roundOption
                          ? 'bg-[var(--mint)] text-[var(--bg-primary)]'
                          : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)]'
                        }
                      `}
                    >
                      {roundOption}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="font-semibold text-[var(--text-primary)]">vibe</span>
                  <span className="text-xs font-mono text-[var(--text-muted)]">→ {vibe}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {vibes.map((vibeOption) => (
                    <button
                      key={vibeOption.value}
                      onClick={() => setVibe(vibeOption.value)}
                      className={`
                        px-4 py-2 rounded-full text-sm font-semibold transition-all
                        ${vibe === vibeOption.value
                          ? 'bg-[var(--coral)] text-white'
                          : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)]'
                        }
                      `}
                    >
                      {vibeOption.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="font-semibold text-[var(--text-primary)]">content</span>
                  <span className="text-xs font-mono text-[var(--text-muted)]">→ {content.replace('_', ' ')}</span>
                </div>
                <div className="flex gap-2">
                  {contents.map((contentOption) => (
                    <button
                      key={contentOption.value}
                      onClick={() => setContent(contentOption.value)}
                      className={`
                        flex-1 py-2 rounded-full text-sm font-semibold transition-all
                        ${content === contentOption.value
                          ? 'bg-[var(--gold)] text-[var(--bg-primary)]'
                          : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)]'
                        }
                      `}
                    >
                      {contentOption.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-[var(--coral)] text-sm">{error}</p>}
            </div>
          </>
        )}

        <div className="py-6">
          {step === 1 ? (
            <Button
              variant="mint"
              fullWidth
              size="lg"
              onClick={() => setStep(2)}
            >
              Next →
            </Button>
          ) : (
            <Button
              variant="mint"
              fullWidth
              size="lg"
              disabled={loading}
              onClick={handleCreateParty}
            >
              {loading ? 'Room aanmaken…' : 'Nodig suspects uit →'}
            </Button>
          )}
        </div>
      </div>
    </MobileContainer>
  )
}
