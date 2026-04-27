'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { DEFAULT_ICON } from '@/lib/avatars'
import { generateFunnyGameName } from '@/lib/funny-game-name'
import { useGameStore } from '@/store/gameStore'
import type { Setting, Groep, Boldness, SeasonalTheme } from '@/types'

const SETTINGS: { value: Setting; emoji: string; label: string; sub: string }[] = [
  { value: 'bank',           emoji: '🛋️', label: 'Op de bank',    sub: 'thuis, ontspannen, lekker lui' },
  { value: 'feest',          emoji: '🎉', label: 'Op een feest',   sub: 'muziek aan, iemand al weg' },
  { value: 'after_midnight', emoji: '🌙', label: 'After midnight', sub: 'remmen los, alles mag' },
  { value: 'onderweg',       emoji: '✈️', label: 'Onderweg',       sub: 'bus, trein of vliegtuig' },
]

const GROEPEN: { value: Groep; emoji: string; label: string; sub: string }[] = [
  { value: 'vrienden',   emoji: '🐺', label: 'Oude vrienden',    sub: 'jullie kennen elkaars geheimen' },
  { value: 'vreemden',   emoji: '🤝', label: 'Nieuwe mensen',    sub: 'icebreaker energy' },
  { value: 'stelletjes', emoji: '💕', label: 'Stelletjes erbij', sub: 'relationship tension welcome' },
  { value: 'familie',    emoji: '😬', label: 'Familie',          sub: 'het is een familieavond…' },
]

const BOLDNESS_OPTIONS: { value: Boldness; emoji: string; label: string; sub: string; color: string }[] = [
  { value: 'gezellig',       emoji: '😊', label: 'Gewoon gezellig',      sub: 'fun voor iedereen, geen slachtoffers',         color: 'var(--mint)' },
  { value: 'blozen',         emoji: '🌶️', label: 'Iemand gaat blozen',   sub: 'licht provocerend, voor volwassenen',           color: 'var(--gold)' },
  { value: 'niemand_veilig', emoji: '🔥', label: 'Niemand is veilig',    sub: 'volledig ongecensureerd — jullie zijn gewaarschuwd', color: 'var(--coral)' },
]

const SEASONAL_THEME_OPTIONS: { value: SeasonalTheme; emoji: string; label: string; sub: string }[] = [
  { value: 'koningsdag', emoji: '🧡', label: 'Koningsdag', sub: 'oranje chaos en feestvibes' },
  { value: 'sinterklaas', emoji: '🎁', label: 'Sinterklaas', sub: 'surprises en ondeugende hints' },
  { value: 'kerst', emoji: '🎄', label: 'Kerst', sub: 'gezellig, scherp en familieproof-ish' },
  { value: 'oud_en_nieuw', emoji: '🎆', label: 'Oud & Nieuw', sub: 'resoluties, vuurwerk en chaos' },
  { value: 'carnaval', emoji: '🎭', label: 'Carnaval', sub: 'verkleed, uitbundig, beetje fout' },
]

const STEP_LABELS = ['MODE', 'LOCATIE', 'GROEP', 'INTENSITEIT', 'THEMA', 'RONDES', 'GAME NAAM']
const TOTAL_STEPS = 7

export function CreatePartyPage() {
  const router = useRouter()
  const { setPlayer } = useGameStore()
  const [step, setStep] = useState(1)

  const [mode, setMode]       = useState<'multiplayer' | 'single_device'>('multiplayer')
  const [setting, setSetting] = useState<Setting>('feest')
  const [groep, setGroep]     = useState<Groep>('vrienden')
  const [boldness, setBoldness] = useState<Boldness>('blozen')
  const [seasonalTheme, setSeasonalTheme] = useState<SeasonalTheme | null>(null)
  const [rounds, setRounds]   = useState<5 | 10 | 20>(10)
  const [gameName, setGameName] = useState(() => generateFunnyGameName())

  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  function prev() { setError(null); setStep(s => Math.max(1, s - 1)) }
  function next() { setStep(s => Math.min(TOTAL_STEPS, s + 1)) }

  async function handleCreate() {
    if (!gameName.trim()) {
      setError('Game naam is verplicht')
      return
    }
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
          seasonal_theme: seasonalTheme,
          mode,
          game_name: gameName,
          avatar_icon: typeof window !== 'undefined'
            ? (localStorage.getItem('susquest-avatar-icon') ?? DEFAULT_ICON)
            : DEFAULT_ICON,
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
      setError(err instanceof Error ? err.message : 'Verbindingsfout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <MobileContainer>
      <div className="flex flex-col min-h-screen px-5 pt-5">

        {/* Back + progress */}
        <div className="flex items-center gap-4 mb-6">
          {step === 1 ? (
            <button
              onClick={() => router.push('/dashboard')}
              className="text-[var(--text-muted)] text-sm hover:text-[var(--text-primary)] transition-colors shrink-0"
            >
              ←
            </button>
          ) : (
            <button
              onClick={prev}
              className="text-[var(--text-muted)] text-sm hover:text-[var(--text-primary)] transition-colors shrink-0"
            >
              ←
            </button>
          )}
          <div className="flex gap-1.5 flex-1">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{ background: i < step ? 'var(--mint)' : 'var(--border)' }}
              />
            ))}
          </div>
          <span className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] shrink-0">
            {step}/{TOTAL_STEPS}
          </span>
        </div>

        {/* Step label */}
        <div className="mb-6">
          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest bg-[var(--coral)] text-[var(--bg-primary)]">
            {STEP_LABELS[step - 1]}
          </span>
        </div>

        {/* ── Step 1: Mode ─────────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <div className="mb-8">
              <h1 className="text-5xl font-bold leading-tight">
                pick your<br />
                <span className="italic text-[var(--mint)]">poison.</span>
              </h1>
            </div>
            <div className="flex flex-col gap-4 flex-1">
              <button
                onClick={() => setMode('multiplayer')}
                className={`relative text-left p-5 rounded-3xl border transition-all ${
                  mode === 'multiplayer'
                    ? 'border-transparent bg-[var(--mint)]'
                    : 'border-[var(--border)] border-dashed bg-[var(--bg-card)] opacity-70'
                }`}
              >
                {mode === 'multiplayer' && (
                  <div className="absolute -top-3 right-4 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-widest bg-[var(--coral)] text-[var(--bg-primary)] rotate-[4deg]">
                    ✨ de juiste keuze
                  </div>
                )}
                <span className={`text-xs font-mono tracking-widest mb-2 block ${mode === 'multiplayer' ? 'text-[var(--bg-primary)] opacity-70' : 'text-[var(--text-muted)]'}`}>
                  MODE 01
                </span>
                <h2 className={`text-5xl font-bold leading-none mb-2 ${mode === 'multiplayer' ? 'text-[var(--bg-primary)]' : 'text-[var(--text-primary)]'}`}>
                  Multiplayer
                </h2>
                <p className={`text-sm leading-relaxed max-w-[28ch] ${mode === 'multiplayer' ? 'text-[var(--bg-primary)] opacity-80' : 'text-[var(--text-muted)]'}`}>
                  iedereen op eigen telefoon. sidequests, verdenkingen, groepsfoto&apos;s die je niet wil zien.
                </p>
              </button>
              <button
                onClick={() => setMode('single_device')}
                className={`text-left p-5 rounded-3xl border border-dashed transition-all ${
                  mode === 'single_device'
                    ? 'border-transparent bg-[var(--mint)]'
                    : 'border-[var(--border)] bg-[var(--bg-card)] opacity-80'
                }`}
              >
                <span className={`text-xs font-mono tracking-widest mb-2 block ${mode === 'single_device' ? 'text-[var(--bg-primary)] opacity-70' : 'text-[var(--text-muted)]'}`}>
                  MODE 02
                </span>
                <h2 className={`text-5xl font-bold leading-none mb-2 ${mode === 'single_device' ? 'text-[var(--bg-primary)]' : 'text-[var(--text-primary)]'}`}>
                  Single Device
                </h2>
                <p className={`text-sm leading-relaxed max-w-[30ch] ${mode === 'single_device' ? 'text-[var(--bg-primary)] opacity-80' : 'text-[var(--text-muted)]'}`}>
                  een scherm doorgeven. voor als jullie telefoons dood zijn (typisch).
                </p>
              </button>
            </div>
          </>
        )}

        {/* ── Step 2: Locatie ───────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <div className="mb-8">
              <h1 className="text-4xl font-bold leading-tight">
                waar zijn<br />
                <span className="italic text-[var(--mint)]">jullie?</span>
              </h1>
            </div>
            <div className="flex flex-col gap-3 flex-1">
              {SETTINGS.map(s => (
                <button
                  key={s.value}
                  onClick={() => setSetting(s.value)}
                  className={`flex items-center gap-5 p-5 rounded-3xl border text-left transition-all ${
                    setting === s.value
                      ? 'border-[var(--mint)] bg-[var(--mint)]/10'
                      : 'border-[var(--border)] bg-[var(--bg-card)]'
                  }`}
                >
                  <span className="text-4xl shrink-0">{s.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <span className={`text-lg font-bold block ${setting === s.value ? 'text-[var(--mint)]' : 'text-[var(--text-primary)]'}`}>
                      {s.label}
                    </span>
                    <span className="text-sm text-[var(--text-muted)]">{s.sub}</span>
                  </div>
                  {setting === s.value && (
                    <span className="text-[var(--mint)] text-lg shrink-0">✓</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 3: Groep ─────────────────────────────────────────────── */}
        {step === 3 && (
          <>
            <div className="mb-8">
              <h1 className="text-4xl font-bold leading-tight">
                wie zitten<br />
                <span className="italic text-[var(--gold)]">er bij?</span>
              </h1>
            </div>
            <div className="flex flex-col gap-3 flex-1">
              {GROEPEN.map(g => (
                <button
                  key={g.value}
                  onClick={() => setGroep(g.value)}
                  className={`flex items-center gap-5 p-5 rounded-3xl border text-left transition-all ${
                    groep === g.value
                      ? 'border-[var(--gold)] bg-[var(--gold)]/10'
                      : 'border-[var(--border)] bg-[var(--bg-card)]'
                  }`}
                >
                  <span className="text-4xl shrink-0">{g.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <span className={`text-lg font-bold block ${groep === g.value ? 'text-[var(--gold)]' : 'text-[var(--text-primary)]'}`}>
                      {g.label}
                    </span>
                    <span className="text-sm text-[var(--text-muted)]">{g.sub}</span>
                  </div>
                  {groep === g.value && (
                    <span className="text-[var(--gold)] text-lg shrink-0">✓</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 4: Intensiteit ──────────────────────────────────────── */}
        {step === 4 && (
          <>
            <div className="mb-8">
              <h1 className="text-4xl font-bold leading-tight">
                hoe ver<br />
                <span className="italic text-[var(--coral)]">gaan we?</span>
              </h1>
            </div>
            <div className="flex flex-col gap-3 flex-1">
              {BOLDNESS_OPTIONS.map(b => (
                <button
                  key={b.value}
                  onClick={() => setBoldness(b.value)}
                  className={`flex items-center gap-5 p-5 rounded-3xl border text-left transition-all ${
                    boldness === b.value
                      ? 'border-[var(--border)]'
                      : 'border-[var(--border)] bg-[var(--bg-card)] opacity-60'
                  }`}
                  style={boldness === b.value
                    ? { borderColor: b.color, background: `color-mix(in srgb, ${b.color} 10%, transparent)` }
                    : {}
                  }
                >
                  <span className="text-4xl shrink-0">{b.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <span
                      className="text-lg font-bold block"
                      style={{ color: boldness === b.value ? b.color : 'var(--text-primary)' }}
                    >
                      {b.label}
                    </span>
                    <span className="text-sm text-[var(--text-muted)] leading-snug">{b.sub}</span>
                  </div>
                  {boldness === b.value && (
                    <span className="text-lg shrink-0" style={{ color: b.color }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 5: Thema ─────────────────────────────────────────────── */}
        {step === 5 && (
          <>
            <div className="mb-8">
              <h1 className="text-4xl font-bold leading-tight">
                extra <br />
                <span className="italic text-[var(--gold)]">seizoenssmaak?</span>
              </h1>
            </div>
            <div className="flex flex-col gap-3 flex-1">
              <button
                onClick={() => setSeasonalTheme(null)}
                className={`flex items-center gap-5 p-5 rounded-3xl border text-left transition-all ${
                  seasonalTheme === null
                    ? 'border-[var(--mint)] bg-[var(--mint)]/10'
                    : 'border-[var(--border)] bg-[var(--bg-card)]'
                }`}
              >
                <span className="text-4xl shrink-0">🧩</span>
                <div className="flex-1 min-w-0">
                  <span className={`text-lg font-bold block ${seasonalTheme === null ? 'text-[var(--mint)]' : 'text-[var(--text-primary)]'}`}>
                    Geen vast thema
                  </span>
                  <span className="text-sm text-[var(--text-muted)]">Laat het model eventueel seizoensdagen detecteren.</span>
                </div>
                {seasonalTheme === null && <span className="text-[var(--mint)] text-lg shrink-0">✓</span>}
              </button>
              {SEASONAL_THEME_OPTIONS.map(theme => (
                <button
                  key={theme.value}
                  onClick={() => setSeasonalTheme(theme.value)}
                  className={`flex items-center gap-5 p-5 rounded-3xl border text-left transition-all ${
                    seasonalTheme === theme.value
                      ? 'border-[var(--gold)] bg-[var(--gold)]/10'
                      : 'border-[var(--border)] bg-[var(--bg-card)]'
                  }`}
                >
                  <span className="text-4xl shrink-0">{theme.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <span className={`text-lg font-bold block ${seasonalTheme === theme.value ? 'text-[var(--gold)]' : 'text-[var(--text-primary)]'}`}>
                      {theme.label}
                    </span>
                    <span className="text-sm text-[var(--text-muted)]">{theme.sub}</span>
                  </div>
                  {seasonalTheme === theme.value && <span className="text-[var(--gold)] text-lg shrink-0">✓</span>}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 6: Rondes ────────────────────────────────────────────── */}
        {step === 6 && (
          <>
            <div className="mb-8">
              <h1 className="text-4xl font-bold leading-tight">
                hoeveel<br />
                <span className="italic text-[var(--mint)]">rondes?</span>
              </h1>
            </div>
            <div className="flex flex-col gap-4 flex-1">
              {([5, 10, 20] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRounds(r)}
                  className={`flex items-center gap-5 p-6 rounded-3xl border text-left transition-all ${
                    rounds === r
                      ? 'border-[var(--mint)] bg-[var(--mint)]/10'
                      : 'border-[var(--border)] bg-[var(--bg-card)]'
                  }`}
                >
                  <span className={`text-5xl font-bold font-mono ${rounds === r ? 'text-[var(--mint)]' : 'text-[var(--text-muted)]'}`}>
                    {r}
                  </span>
                  <div className="flex-1">
                    <span className={`text-lg font-bold block ${rounds === r ? 'text-[var(--mint)]' : 'text-[var(--text-primary)]'}`}>
                      {r === 5 ? 'Snelle ronde' : r === 10 ? 'Standaard avond' : 'Lange nacht'}
                    </span>
                    <span className="text-sm text-[var(--text-muted)]">
                      {r === 5 ? 'in en uit, ~15 min' : r === 10 ? 'de klassieker, ~30 min' : 'niemand gaat vroeg naar huis'}
                    </span>
                  </div>
                  {rounds === r && <span className="text-[var(--mint)] text-lg shrink-0">✓</span>}
                </button>
              ))}
            </div>
            {error && <p className="text-[var(--coral)] text-sm mt-4">{error}</p>}
          </>
        )}

        {/* ── Step 7: Game naam ─────────────────────────────────────────── */}
        {step === 7 && (
          <>
            <div className="mb-8">
              <h1 className="text-4xl font-bold leading-tight">
                geef je game<br />
                <span className="italic text-[var(--coral)]">een legendarische naam.</span>
              </h1>
            </div>
            <div className="flex flex-col gap-4 flex-1">
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-5">
                <label className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-2 block uppercase">
                  Game naam
                </label>
                <input
                  value={gameName}
                  onChange={e => setGameName(e.target.value)}
                  maxLength={50}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl px-4 py-3 text-[var(--text-primary)] font-semibold focus:outline-none focus:border-[var(--mint)]"
                />
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  Dit zien spelers in de lobby.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => setGameName(generateFunnyGameName())}
                  className="w-full py-3 rounded-2xl border border-[var(--border)] text-[var(--text-muted)] text-sm font-semibold hover:text-[var(--text-primary)] hover:border-[var(--mint)] transition-all"
                >
                  🎲 Randomize naam
                </button>
                <button
                  onClick={() => setGameName(generateFunnyGameName())}
                  className="w-full py-3 rounded-2xl border border-dashed border-[var(--border)] text-[var(--text-muted)] text-sm font-semibold hover:text-[var(--coral)] hover:border-[var(--coral)] transition-all"
                >
                  ✨ Nog gekker
                </button>
              </div>
            </div>
            {error && <p className="text-[var(--coral)] text-sm mt-4">{error}</p>}
          </>
        )}

        {/* CTA */}
        <div className="py-6">
          {step < TOTAL_STEPS ? (
            <Button variant="mint" fullWidth size="lg" onClick={next}>
              Volgende →
            </Button>
          ) : (
            <Button variant="mint" fullWidth size="lg" disabled={loading} onClick={handleCreate}>
              {loading ? 'Room aanmaken…' : 'Vragen genereren →'}
            </Button>
          )}
        </div>

      </div>
    </MobileContainer>
  )
}
