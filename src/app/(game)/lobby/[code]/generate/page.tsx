'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { GeneratingLoader } from '@/components/game/GeneratingLoader'
import { useGameStore } from '@/store/gameStore'
import { createClient } from '@/lib/supabase/client'
import type { Room, Round } from '@/types'

interface GeneratePageProps {
  params: Promise<{ code: string }>
}

function formatVibeLabel(value: string | null | undefined): string {
  const labels: Record<string, string> = {
    bank: 'Op de bank',
    feest: 'Feest',
    after_midnight: 'After midnight',
    onderweg: 'Onderweg',
  }
  return value ? (labels[value] ?? value) : '-'
}

function formatGroepLabel(value: string | null | undefined): string {
  const labels: Record<string, string> = {
    vrienden: 'Vrienden',
    vreemden: 'Vreemden',
    stelletjes: 'Stelletjes',
    familie: 'Familie',
  }
  return value ? (labels[value] ?? value) : '-'
}

function formatContentLabel(value: string | null | undefined): string {
  const labels: Record<string, string> = {
    gezellig: 'Gezellig',
    blozen: 'Blozen',
    niemand_veilig: 'Niemand is veilig',
  }
  return value ? (labels[value] ?? value) : '-'
}

export default function GeneratePage({ params }: GeneratePageProps) {
  const { code } = use(params)
  const router = useRouter()
  const { language } = useGameStore()

  const [rounds, setRounds] = useState<Round[]>([])
  const [room, setRoom] = useState<Room | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [expired, setExpired] = useState(false)
  const [showQuickSettings, setShowQuickSettings] = useState(false)
  const [updatingSettings, setUpdatingSettings] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [quickRounds, setQuickRounds] = useState(10)
  const [quickVibe, setQuickVibe] = useState('feest')
  const [quickGroep, setQuickGroep] = useState('vrienden')
  const [quickContent, setQuickContent] = useState('blozen')

  const loadRounds = useCallback(async () => {
    const [roundsRes, roomRes] = await Promise.all([
      fetch(`/api/rooms/${code}/rounds`),
      fetch(`/api/rooms/${code}`),
    ])
    const res = roundsRes
    if (res.status === 410) {
      setExpired(true)
      setLoaded(true)
      return { expired: true, roundCount: 0 }
    }
    let roundCount = 0
    if (res.ok) {
      const data = await res.json()
      setRounds(data.rounds ?? [])
      roundCount = Array.isArray(data.rounds) ? data.rounds.length : 0
    }
    if (roomRes.ok) {
      const data = await roomRes.json()
      setRoom(data.room ?? null)
      setQuickRounds(data.room?.rounds_total ?? 10)
      setQuickVibe(data.room?.vibe ?? 'feest')
      setQuickGroep(data.room?.groep ?? 'vrienden')
      setQuickContent(data.room?.content_level ?? 'blozen')
    }
    setLoaded(true)
    return { expired: false, roundCount }
  }, [code])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user)
    })
  }, [])

  const generate = useCallback(async () => {
    setGenerating(true)
    setError(null)
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: code }),
    })
    if (res.status === 410) {
      setExpired(true)
      setGenerating(false)
      return
    }
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Genereren mislukt')
      setGenerating(false)
      return
    }
    await loadRounds()
    setGenerating(false)
  }, [code, loadRounds])

  useEffect(() => {
    async function init() {
      const state = await loadRounds()
      if (!state.expired && state.roundCount === 0) {
        await generate()
      }
    }
    init()
  }, [generate, loadRounds])

  async function regenerateWithNewSettings() {
    setUpdatingSettings(true)
    setError(null)
    const patchRes = await fetch(`/api/rooms/${code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rounds_total: quickRounds,
        vibe: quickVibe,
        groep: quickGroep,
        content_level: quickContent,
      }),
    })
    const patchData = await patchRes.json().catch(() => ({}))
    if (!patchRes.ok) {
      setUpdatingSettings(false)
      setError(patchData.error ?? 'Instellingen opslaan mislukt')
      return
    }
    setRoom(patchData.room ?? null)
    setShowQuickSettings(false)
    setUpdatingSettings(false)
    await generate()
  }

  if (generating) {
    return <GeneratingLoader />
  }

  if (expired) {
    return (
      <MobileContainer>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-4">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-mono tracking-widest border border-[var(--coral)] text-[var(--coral)]">
            GAME VERLOPEN
          </span>
          <h1 className="text-3xl font-bold leading-tight">deze game is verlopen.</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {isLoggedIn
              ? 'Start een nieuwe game vanuit je dashboard.'
              : 'Maak een account aan om zelf een game te starten.'}
          </p>
          {isLoggedIn ? (
            <Button variant="mint" size="lg" onClick={() => router.push('/dashboard')}>
              Naar dashboard →
            </Button>
          ) : (
            <Button variant="mint" size="lg" onClick={() => router.push('/register')}>
              Account aanmaken →
            </Button>
          )}
        </div>
      </MobileContainer>
    )
  }

  if (!loaded) {
    return (
      <MobileContainer>
        <div className="flex-1 flex items-center justify-center px-5">
          <div className="w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-5">
            <p className="text-xs font-mono tracking-widest text-[var(--mint)] mb-2">VOORBEREIDEN</p>
            <h2 className="text-2xl font-bold leading-tight text-[var(--text-primary)] mb-3">
              vragenpreview laden...
            </h2>
            <div className="h-2 rounded-full bg-[var(--bg-primary)] overflow-hidden">
              <div className="h-full w-1/2 bg-[var(--mint)] animate-pulse rounded-full" />
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-3">settings en rondes worden opgehaald</p>
          </div>
        </div>
      </MobileContainer>
    )
  }

  return (
    <MobileContainer>
      <div className="flex flex-col min-h-screen px-5 pt-5 pb-8">

        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/lobby/${code}`)}
            className="mb-3 px-3 py-1 rounded-full text-xs font-mono tracking-widest border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--mint)] transition-colors"
          >
            ← Terug naar lobby
          </button>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-mono tracking-widest border border-[var(--gold)] text-[var(--gold)] mb-4">
            VRAGENPREVIEW
          </span>
          <h1 className="text-4xl font-bold leading-tight">
            dit worden<br />
            <span className="italic text-[var(--mint)]">de vragen.</span>
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-2">
            Check de vragen, kies opnieuw of open de lobby.
          </p>
        </div>

        {error && (
          <p className="text-[var(--coral)] text-sm mb-4">{error}</p>
        )}

        {room && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 mb-4">
            <p className="text-xs font-mono tracking-widest text-[var(--text-muted)] uppercase mb-2">
              Instellingen
            </p>
            <p className="text-sm text-[var(--text-muted)] mb-3">
              Deze vragen zijn gemaakt voor <span className="text-[var(--text-primary)] font-semibold">{formatVibeLabel(room.vibe).toLowerCase()}</span> met <span className="text-[var(--text-primary)] font-semibold">{formatGroepLabel(room.groep).toLowerCase()}</span> vibes.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-mono border border-[var(--border)] text-[var(--text-primary)]">
                {room.rounds_total} rondes
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono border border-[var(--mint)] text-[var(--mint)]">
                {formatVibeLabel(room.vibe)}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono border border-[var(--gold)] text-[var(--gold)]">
                {formatGroepLabel(room.groep)}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono border border-[var(--coral)] text-[var(--coral)]">
                {formatContentLabel(room.content_level)}
              </span>
            </div>
          </div>
        )}

        {/* Question list */}
        <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
          {rounds.map((round) => (
            <div
              key={round.id}
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <span className="text-xs font-mono text-[var(--text-muted)] tracking-widest mb-1 block">
                    RONDE {round.round_number}
                  </span>
                  <p className="text-[var(--text-primary)] font-semibold leading-snug">
                    {language === 'en' ? round.main_question_en : round.main_question_nl}
                  </p>
                </div>
                {round.has_sidequest && (
                  <span className="shrink-0 text-xs font-mono tracking-widest border border-[var(--coral)] text-[var(--coral)] px-2 py-0.5 rounded-full mt-1">
                    SIDEQUEST
                  </span>
                )}
              </div>
              {round.has_sidequest && (
                <div className="mt-3 pt-3 border-t border-[var(--border)]">
                  <p className="text-xs font-mono text-[var(--text-muted)] tracking-widest mb-1">SIDEQUEST OPDRACHT</p>
                  <p className="text-[var(--text-muted)] text-sm italic">
                    {language === 'en' ? round.sidequest_en : round.sidequest_nl}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-6">
          <Button variant="mint" fullWidth size="lg" onClick={() => router.push(`/lobby/${code}`)}>
            Open lobby →
          </Button>
          <div className="pt-2">
            <div className="h-px bg-[var(--border)] mb-2" />
            <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] uppercase text-center">
              Genereren
            </p>
          </div>
          <button
            onClick={generate}
            className="w-full py-3 rounded-2xl border border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)] text-sm font-semibold hover:bg-[var(--gold)]/20 transition-all"
          >
            Opnieuw genereren
          </button>
          <button
            onClick={() => setShowQuickSettings(true)}
            className="w-full py-3 rounded-2xl border border-[var(--coral)] bg-[var(--coral)]/10 text-[var(--coral)] text-sm font-semibold hover:bg-[var(--coral)]/20 transition-all"
          >
            Nieuwe settings
          </button>
        </div>
      </div>

      {showQuickSettings && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => !updatingSettings && setShowQuickSettings(false)} />
          <div className="relative bg-[var(--bg-primary)] rounded-t-3xl px-5 pt-6 pb-10 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 bg-[var(--border)] rounded-full mx-auto mb-1" />
            <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] uppercase">
              Mini onboarding
            </p>
            <h3 className="text-xl font-bold text-[var(--text-primary)]">Nieuwe settings kiezen</h3>
            <p className="text-sm text-[var(--text-muted)]">
              Kies kort je settings, tik op toepassen en we genereren direct opnieuw.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 20].map(value => (
                <button
                  key={value}
                  onClick={() => setQuickRounds(value)}
                  className={`py-2 rounded-xl border text-sm ${quickRounds === value ? 'border-[var(--mint)] text-[var(--mint)]' : 'border-[var(--border)] text-[var(--text-muted)]'}`}
                >
                  {value}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select value={quickVibe} onChange={e => setQuickVibe(e.target.value)} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)]">
                <option value="bank">Op de bank</option>
                <option value="feest">Feest</option>
                <option value="after_midnight">After midnight</option>
                <option value="onderweg">Onderweg</option>
              </select>
              <select value={quickGroep} onChange={e => setQuickGroep(e.target.value)} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)]">
                <option value="vrienden">Vrienden</option>
                <option value="vreemden">Vreemden</option>
                <option value="stelletjes">Stelletjes</option>
                <option value="familie">Familie</option>
              </select>
            </div>
            <select value={quickContent} onChange={e => setQuickContent(e.target.value)} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)]">
              <option value="gezellig">Gezellig</option>
              <option value="blozen">Blozen</option>
              <option value="niemand_veilig">Niemand veilig</option>
            </select>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowQuickSettings(false)}
                disabled={updatingSettings}
                className="flex-1 py-3 rounded-2xl border border-[var(--border)] text-[var(--text-muted)] text-sm font-semibold hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
              >
                Annuleren
              </button>
              <button
                onClick={regenerateWithNewSettings}
                disabled={updatingSettings}
                className="flex-1 py-3 rounded-2xl bg-[var(--coral)] text-[var(--bg-primary)] text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {updatingSettings ? 'Genereren…' : 'Toepassen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileContainer>
  )
}
