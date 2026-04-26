'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { useGameStore } from '@/store/gameStore'
import type { Setting, Groep, Boldness } from '@/types'

// ── Setting ──────────────────────────────────────────────────────────────────
const SETTINGS: { value: Setting; emoji: string; label: string; sub: string }[] = [
  { value: 'bank',           emoji: '🛋️', label: 'Op de bank',     sub: 'thuis, ontspannen' },
  { value: 'feest',          emoji: '🎉', label: 'Op een feest',    sub: 'muziek aan, iemand al weg' },
  { value: 'after_midnight', emoji: '🌙', label: 'After midnight',  sub: 'remmen los, alles mag' },
  { value: 'onderweg',       emoji: '✈️', label: 'Onderweg',        sub: 'geen props, portable' },
]

// ── Groep ─────────────────────────────────────────────────────────────────────
const GROEPEN: { value: Groep; emoji: string; label: string; sub: string }[] = [
  { value: 'vrienden',   emoji: '🐺', label: 'Oude vrienden',    sub: 'jullie kennen elkaars geheimen' },
  { value: 'vreemden',   emoji: '🤝', label: 'Nieuwe mensen',    sub: 'icebreaker energy' },
  { value: 'stelletjes', emoji: '💕', label: 'Stelletjes erbij', sub: 'relationship tension welcome' },
  { value: 'familie',    emoji: '😬', label: 'Familie',          sub: 'het is een familieavond…' },
]

// ── Boldness ──────────────────────────────────────────────────────────────────
const BOLDNESS_OPTIONS: { value: Boldness; emoji: string; label: string; sub: string; color: string }[] = [
  {
    value: 'gezellig',
    emoji: '😊',
    label: 'Gewoon gezellig',
    sub: 'fun voor iedereen, geen slachtoffers',
    color: 'var(--mint)',
  },
  {
    value: 'blozen',
    emoji: '🌶️',
    label: 'Iemand gaat blozen',
    sub: 'licht provocerend, voor volwassenen',
    color: 'var(--gold)',
  },
  {
    value: 'niemand_veilig',
    emoji: '🔥',
    label: 'Niemand is veilig',
    sub: 'volledig ongecensureerd, jullie zijn gewaarschuwd',
    color: 'var(--coral)',
  },
]

export function CreatePartyPage() {
  const router = useRouter()
  const { setPlayer } = useGameStore()
  const [step, setStep] = useState<1 | 2>(1)

  // Step 1
  const [selected, setSelected] = useState<'multiplayer' | 'single_device'>('multiplayer')

  // Step 2
  const [rounds, setRounds] = useState<5 | 10 | 20>(10)
  const [setting, setSetting] = useState<Setting>('feest')
  const [groep, setGroep] = useState<Groep>('vrienden')
  const [boldness, setBoldness] = useState<Boldness>('blozen')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreateParty() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rounds_total: rounds,
          vibe: setting,
          content_level: boldness,
          groep,
          mode: selected,
        }),
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

        {/* Back button (step 2 only) */}
        {step === 2 && (
          <button
            onClick={() => { setError(null); setStep(1) }}
            className="text-[var(--text-muted)] text-sm mb-6 self-start hover:text-[var(--text-primary)]"
          >
            ← terug
          </button>
        )}

        {/* Step badge */}
        <div className="mb-6">
          <span className="inline-block px-4 py-1 rounded-full text-xs font-mono font-bold tracking-widest bg-[var(--coral)] text-[var(--bg-primary)]">
            STAP {step} / 2
          </span>
        </div>

        {/* ── STEP 1: Mode ─────────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <div className="mb-8">
              <h1 className="text-5xl font-bold leading-tight text-[var(--text-primary)]">
                pick your<br />
                <span className="italic text-[var(--mint)]">poison.</span>
              </h1>
            </div>

            <div className="flex flex-col gap-4 flex-1">
              <button
                onClick={() => setSelected('multiplayer')}
                className={`relative text-left p-5 rounded-3xl border transition-all duration-150 ${
                  selected === 'multiplayer'
                    ? 'border-transparent bg-[var(--mint)]'
                    : 'border-[var(--border)] border-dashed bg-[var(--bg-card)] opacity-70'
                }`}
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
              </button>

              <button
                onClick={() => setSelected('single_device')}
                className={`text-left p-5 rounded-3xl border border-dashed transition-all duration-150 ${
                  selected === 'single_device'
                    ? 'border-[var(--mint)] bg-[var(--bg-card)]'
                    : 'border-[var(--border)] bg-[var(--bg-card)] opacity-80'
                }`}
              >
                <span className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-2 block">MODE 02</span>
                <h2 className="text-5xl font-bold leading-none text-[var(--text-primary)] mb-2">Single Device</h2>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-[30ch]">
                  een scherm doorgeven. voor als jullie telefoons dood zijn (typisch).
                </p>
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2: Settings ─────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <div className="mb-7">
              <h1 className="text-4xl font-bold leading-tight">
                stel de<br />
                <span className="italic text-[var(--coral)]">avond in.</span>
              </h1>
            </div>

            <div className="flex flex-col gap-7 flex-1 overflow-y-auto pb-2">

              {/* Locatie */}
              <div>
                <label className="text-[10px] font-mono tracking-[0.2em] text-[var(--text-muted)] mb-3 block uppercase">
                  Waar zijn jullie?
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {SETTINGS.map(s => (
                    <button
                      key={s.value}
                      onClick={() => setSetting(s.value)}
                      className={`
                        text-left p-4 rounded-2xl border transition-all duration-150
                        ${setting === s.value
                          ? 'border-[var(--mint)] bg-[var(--mint)]/10'
                          : 'border-[var(--border)] bg-[var(--bg-card)]'
                        }
                      `}
                    >
                      <span className="text-2xl block mb-2">{s.emoji}</span>
                      <span className={`text-sm font-bold block leading-tight ${setting === s.value ? 'text-[var(--mint)]' : 'text-[var(--text-primary)]'}`}>
                        {s.label}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block leading-snug">
                        {s.sub}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Groep */}
              <div>
                <label className="text-[10px] font-mono tracking-[0.2em] text-[var(--text-muted)] mb-3 block uppercase">
                  Wie zitten er bij?
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {GROEPEN.map(g => (
                    <button
                      key={g.value}
                      onClick={() => setGroep(g.value)}
                      className={`
                        text-left p-4 rounded-2xl border transition-all duration-150
                        ${groep === g.value
                          ? 'border-[var(--gold)] bg-[var(--gold)]/10'
                          : 'border-[var(--border)] bg-[var(--bg-card)]'
                        }
                      `}
                    >
                      <span className="text-2xl block mb-2">{g.emoji}</span>
                      <span className={`text-sm font-bold block leading-tight ${groep === g.value ? 'text-[var(--gold)]' : 'text-[var(--text-primary)]'}`}>
                        {g.label}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block leading-snug">
                        {g.sub}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Intensiteit */}
              <div>
                <label className="text-[10px] font-mono tracking-[0.2em] text-[var(--text-muted)] mb-3 block uppercase">
                  Hoe ver gaan we?
                </label>
                <div className="flex flex-col gap-2">
                  {BOLDNESS_OPTIONS.map(b => (
                    <button
                      key={b.value}
                      onClick={() => setBoldness(b.value)}
                      className={`
                        flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-150
                        ${boldness === b.value
                          ? 'border-[var(--border)]'
                          : 'border-[var(--border)] bg-[var(--bg-card)] opacity-60'
                        }
                      `}
                      style={boldness === b.value ? { borderColor: b.color, background: `color-mix(in srgb, ${b.color} 10%, transparent)` } : {}}
                    >
                      <span className="text-2xl shrink-0">{b.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <span
                          className="text-sm font-bold block"
                          style={boldness === b.value ? { color: b.color } : { color: 'var(--text-primary)' }}
                        >
                          {b.label}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] block mt-0.5 leading-snug">
                          {b.sub}
                        </span>
                      </div>
                      {boldness === b.value && (
                        <span className="text-xs font-mono shrink-0" style={{ color: b.color }}>✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rondes */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[10px] font-mono tracking-[0.2em] text-[var(--text-muted)] uppercase">
                    Aantal rondes
                  </label>
                  <span className="text-xs font-mono text-[var(--text-muted)]">→ {rounds}</span>
                </div>
                <div className="flex gap-2">
                  {([5, 10, 20] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setRounds(r)}
                      className={`flex-1 py-2 rounded-full font-semibold text-sm transition-all ${
                        rounds === r
                          ? 'bg-[var(--mint)] text-[var(--bg-primary)]'
                          : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)]'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-[var(--coral)] text-sm">{error}</p>}
            </div>
          </>
        )}

        {/* CTA */}
        <div className="py-6">
          {step === 1 ? (
            <Button variant="mint" fullWidth size="lg" onClick={() => setStep(2)}>
              Next →
            </Button>
          ) : (
            <Button variant="mint" fullWidth size="lg" disabled={loading} onClick={handleCreateParty}>
              {loading ? 'Room aanmaken…' : 'Vragen genereren →'}
            </Button>
          )}
        </div>

      </div>
    </MobileContainer>
  )
}
