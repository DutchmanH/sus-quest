'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { GeneratingLoader } from '@/components/game/GeneratingLoader'
import { useGameStore } from '@/store/gameStore'
import { createClient } from '@/lib/supabase/client'
import {
  PARTY_VIBE_OPTIONS,
  PARTY_GROEP_OPTIONS,
  PARTY_BOLDNESS_OPTIONS,
  PARTY_SEASONAL_THEME_OPTIONS,
  getQuestionsPerCycleCopy,
} from '@/lib/party-wizard-config'
import { readApiErrorMessage } from '@/lib/read-api-error'
import type { Room, Round, SeasonalTheme } from '@/types'

interface LobbyPeekPageProps {
  params: Promise<{ code: string }>
}

function pickVibe(raw: string | null | undefined) {
  return (
    PARTY_VIBE_OPTIONS.find(o => o.value === raw) ?? {
      emoji: '✨',
      label: raw && raw.length > 0 ? raw : '—',
      sub: '',
    }
  )
}

function pickGroep(raw: string | null | undefined) {
  return (
    PARTY_GROEP_OPTIONS.find(o => o.value === raw) ?? {
      emoji: '✨',
      label: raw && raw.length > 0 ? raw : '—',
      sub: '',
    }
  )
}

function pickBoldness(raw: string | null | undefined) {
  return (
    PARTY_BOLDNESS_OPTIONS.find(o => o.value === raw) ?? {
      emoji: '✨',
      label: raw && raw.length > 0 ? raw : '—',
      sub: '',
      color: 'var(--mint)',
    }
  )
}

function pickSeasonal(theme: SeasonalTheme | null | undefined) {
  if (!theme) {
    return { emoji: '🧩', label: 'Geen thema', sub: 'Geen vaste seizoensstijl, standaard mix.' }
  }
  return (
    PARTY_SEASONAL_THEME_OPTIONS.find(o => o.value === theme) ?? {
      emoji: '✨',
      label: String(theme),
      sub: '',
    }
  )
}

function pickMode(mode: string | null | undefined) {
  if (mode === 'single_device') {
    return { emoji: '📲', label: 'Single device', sub: 'Eén scherm dat je doorgeeft.' }
  }
  return { emoji: '📱', label: 'Multiplayer', sub: 'Iedereen op eigen telefoon, realtime.' }
}

function estimateGenerationDurationMs(roundsTotal?: number | null, contentLevel?: string | null): number {
  const rounds = roundsTotal ?? 10
  const baseByRounds: Record<number, number> = {
    5: 9500,
    10: 12500,
    20: 17000,
  }
  const base = baseByRounds[rounds] ?? 12500
  const intensityBoost =
    contentLevel === 'niemand_veilig'
      ? 1400
      : contentLevel === 'blozen'
        ? 700
        : 0
  return base + intensityBoost
}

export default function LobbyPeekPage({ params }: LobbyPeekPageProps) {
  const { code } = use(params)
  const router = useRouter()
  const { language } = useGameStore()

  const [rounds, setRounds] = useState<Round[]>([])
  const [room, setRoom] = useState<Room | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [expired, setExpired] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [expandedPreviewSetState, setExpandedPreviewSetState] = useState<{
    key: string
    values: number[]
  }>({ key: '', values: [] })
  const [revealedSetSidequestState, setRevealedSetSidequestState] = useState<{
    key: string
    values: number[]
  }>({ key: '', values: [] })
  const questionsPerCycle = Math.max(1, Number(room?.questions_per_cycle ?? 4))
  const playCycles = Math.max(1, Number(room?.play_cycles ?? Math.ceil((room?.rounds_total ?? 10) / questionsPerCycle)))
  const derivedTotalQuestions = questionsPerCycle * playCycles
  const sortedRounds = [...rounds].sort((a, b) => a.round_number - b.round_number)
  const playRounds = sortedRounds.filter(r => !r.round_kind || r.round_kind === 'play')
  const accuseGateRounds = sortedRounds.filter(r => r.round_kind === 'accuse_gate')
  const previewStateKey = [
    room?.id ?? 'no-room',
    room?.play_cycles ?? 'default-cycles',
    room?.questions_per_cycle ?? 'default-questions',
    rounds.length,
  ].join(':')
  const expandedPreviewSets = expandedPreviewSetState.key === previewStateKey
    ? expandedPreviewSetState.values
    : []
  const revealedSetSidequests = revealedSetSidequestState.key === previewStateKey
    ? revealedSetSidequestState.values
    : []

  function toggleSetReveal(setIndex: number) {
    setRevealedSetSidequestState(prev => {
      const values = prev.key === previewStateKey ? prev.values : []
      return {
        key: previewStateKey,
        values: values.includes(setIndex)
          ? values.filter(index => index !== setIndex)
          : [...values, setIndex],
      }
    })
  }

  function togglePreviewSet(setIndex: number) {
    setExpandedPreviewSetState(prev => {
      const values = prev.key === previewStateKey ? prev.values : []
      return {
        key: previewStateKey,
        values: values.includes(setIndex)
          ? values.filter(index => index !== setIndex)
          : [...values, setIndex],
      }
    })
  }

  const previewSets = Array.from({ length: playCycles }, (_, index) => {
    const cycleStart = index * questionsPerCycle
    const questions = playRounds.slice(cycleStart, cycleStart + questionsPerCycle)
    const sidequestRound = questions.find(q => q.has_sidequest) ?? questions[0] ?? null
    return {
      index,
      questions,
      hasSidequest: questions.some(q => q.has_sidequest),
      sidequestRound,
      accuseGate: accuseGateRounds[index] ?? null,
    }
  })
  const playQuestionCount = previewSets.reduce((sum, set) => sum + set.questions.length, 0) || derivedTotalQuestions
  const nonQuestionCount = playCycles

  const vibeCard = room ? pickVibe(room.vibe) : null
  const groepCard = room ? pickGroep(room.groep) : null
  const boldCard = room ? pickBoldness(room.content_level) : null
  const seasonalCard = room ? pickSeasonal(room.seasonal_theme ?? null) : null
  const modeCard = room ? pickMode(room.mode) : null
  const qpcCopy = getQuestionsPerCycleCopy(questionsPerCycle)

  const loadRounds = useCallback(async (options?: { deferLoaded?: boolean }) => {
    const deferLoaded = options?.deferLoaded ?? false
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
    }
    if (!deferLoaded) {
      setLoaded(true)
    }
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
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code }),
      })
      if (res.status === 410) {
        setExpired(true)
        setLoaded(true)
        setGenerating(false)
        return
      }
      if (!res.ok) {
        setError(await readApiErrorMessage(res))
        setLoaded(true)
        setGenerating(false)
        return
      }
      setGenerating(false)
      await loadRounds()
    } catch {
      setError('Verbindingsfout')
      setLoaded(true)
      setGenerating(false)
    }
  }, [code, loadRounds])

  useEffect(() => {
    let cancelled = false
    async function init() {
      const state = await loadRounds({ deferLoaded: true })
      if (cancelled) {
        setLoaded(true)
        return
      }
      if (state.expired) return
      if (state.roundCount === 0) {
        await generate()
        return
      }
      setLoaded(true)
    }
    init()
    return () => { cancelled = true }
  }, [generate, loadRounds])

  if (generating) {
    return (
      <GeneratingLoader
        language={language}
        estimatedDurationMs={estimateGenerationDurationMs(derivedTotalQuestions, room?.content_level)}
      />
    )
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
      <div className="flex flex-col min-h-screen px-5 pt-5 pb-8" style={{ animation: 'screenFadeIn 0.35s ease-out' }}>

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

        {room && vibeCard && groepCard && boldCard && seasonalCard && modeCard && (
          <section className="mb-6">
            <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] uppercase mb-2">
              Jullie keuzes uit de wizard
            </p>
            <h2 className="text-2xl font-bold leading-tight text-[var(--text-primary)]">
              dit is de basis<br />
              <span className="italic text-[var(--gold)]">waarop we hebben gebouwd.</span>
            </h2>

            {room.game_name && (
              <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 flex items-center gap-3">
                <span className="text-2xl shrink-0" aria-hidden>🎯</span>
                <div className="min-w-0">
                  <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] uppercase">Game naam</p>
                  <p className="text-base font-bold text-[var(--text-primary)] truncate">{room.game_name}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-4 text-center">
                <span className="block text-4xl font-bold font-mono text-[var(--mint)] leading-none">{playCycles}</span>
                <span className="mt-2 block text-[10px] font-mono tracking-widest text-[var(--text-muted)] uppercase">
                  speelrondes
                </span>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-4 text-center">
                <span className="block text-4xl font-bold font-mono text-[var(--mint)] leading-none">{questionsPerCycle}</span>
                <span className="mt-1 block text-xs font-semibold text-[var(--text-primary)] leading-tight">{qpcCopy.title}</span>
                <span className="mt-1 block text-[10px] text-[var(--text-muted)] leading-snug px-0.5">{qpcCopy.sub}</span>
                <span className="mt-1.5 block text-[10px] font-mono tracking-widest text-[var(--text-muted)] uppercase">
                  vragen per ronde
                </span>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-card)]/80 px-4 py-3 flex gap-3">
              <span className="text-2xl shrink-0" aria-hidden>{modeCard.emoji}</span>
              <div className="min-w-0">
                <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] uppercase">Mode</p>
                <p className="text-sm font-bold text-[var(--text-primary)]">{modeCard.label}</p>
                <p className="text-xs text-[var(--text-muted)] leading-snug">{modeCard.sub}</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 flex gap-3">
                <span className="text-3xl shrink-0" aria-hidden>{vibeCard.emoji}</span>
                <div className="min-w-0">
                  <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] uppercase">Locatie</p>
                  <p className="text-base font-bold text-[var(--text-primary)]">{vibeCard.label}</p>
                  {vibeCard.sub ? <p className="text-xs text-[var(--text-muted)] leading-snug mt-0.5">{vibeCard.sub}</p> : null}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 flex gap-3">
                <span className="text-3xl shrink-0" aria-hidden>{groepCard.emoji}</span>
                <div className="min-w-0">
                  <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] uppercase">Groep</p>
                  <p className="text-base font-bold text-[var(--text-primary)]">{groepCard.label}</p>
                  {groepCard.sub ? <p className="text-xs text-[var(--text-muted)] leading-snug mt-0.5">{groepCard.sub}</p> : null}
                </div>
              </div>

              <div
                className="rounded-2xl border px-4 py-3 flex gap-3"
                style={{
                  borderColor: boldCard.color,
                  background: `color-mix(in srgb, ${boldCard.color} 8%, var(--bg-card))`,
                }}
              >
                <span className="text-3xl shrink-0" aria-hidden>{boldCard.emoji}</span>
                <div className="min-w-0">
                  <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] uppercase">Intensiteit</p>
                  <p className="text-base font-bold" style={{ color: boldCard.color }}>{boldCard.label}</p>
                  {boldCard.sub ? <p className="text-xs text-[var(--text-muted)] leading-snug mt-0.5">{boldCard.sub}</p> : null}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 flex gap-3">
                <span className="text-3xl shrink-0" aria-hidden>{seasonalCard.emoji}</span>
                <div className="min-w-0">
                  <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] uppercase">Seizoens-thema</p>
                  <p className="text-base font-bold text-[var(--text-primary)]">{seasonalCard.label}</p>
                  {seasonalCard.sub ? <p className="text-xs text-[var(--text-muted)] leading-snug mt-0.5">{seasonalCard.sub}</p> : null}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-4 py-3">
              <span className="text-xs font-mono tracking-widest text-[var(--text-muted)] uppercase">Totaal hoofdvragen</span>
              <span className="text-xl font-bold font-mono text-[var(--gold)]">{derivedTotalQuestions}</span>
            </div>
          </section>
        )}

        {/* Question list */}
        <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
          <div className="pt-1 pb-1">
            <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] uppercase">Gegenereerde inhoud</p>
            <p className="text-lg font-bold text-[var(--text-primary)] mt-1">de vragen per ronde</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {playQuestionCount} vragen verdeeld over {nonQuestionCount} speelsets — klap per set open.
            </p>
          </div>

          {previewSets.map(set => {
            const isExpanded = expandedPreviewSets.includes(set.index)
            return (
              <div
                key={`set-${set.index}`}
                className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl px-4 py-4"
              >
                <button
                  onClick={() => togglePreviewSet(set.index)}
                  className="w-full flex items-center justify-between gap-3 text-left"
                >
                  <div>
                    <p className="text-xs font-mono text-[var(--text-muted)] tracking-widest">
                      RONDE {set.index + 1}
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {set.questions.length} vraag{set.questions.length === 1 ? '' : 'en'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`shrink-0 text-xs font-mono tracking-widest border px-2 py-0.5 rounded-full ${
                      set.hasSidequest
                        ? 'border-[var(--coral)] text-[var(--coral)]'
                        : 'border-[var(--border)] text-[var(--text-muted)]'
                    }`}>
                      {set.hasSidequest ? '1 SIDEQUEST IN DEZE RONDE' : 'GEEN SIDEQUEST'}
                    </span>
                    <span className="text-[var(--mint)] text-xs font-mono tracking-widest">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <>
                    <div className="flex flex-col gap-2 mt-3">
                      {set.questions.map((round, questionIndex) => (
                        <div key={round.id} className="rounded-xl border border-[var(--border)] px-3 py-2">
                          <span className="text-[10px] font-mono text-[var(--text-muted)] tracking-widest mb-1 block">
                            VRAAG {questionIndex + 1}
                          </span>
                          <p className="text-[var(--text-primary)] font-semibold leading-snug">
                            {language === 'en' ? round.main_question_en : round.main_question_nl}
                          </p>
                          {(language === 'en' ? round.suspicious_fact_en : round.suspicious_fact_nl) && (
                            <p className="text-[10px] font-mono text-[var(--text-muted)] italic mt-1.5 leading-snug">
                              {language === 'en' ? round.suspicious_fact_en : round.suspicious_fact_nl}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 pt-3 border-t border-[var(--border)]">
                      <button
                        onClick={() => toggleSetReveal(set.index)}
                        className="w-full text-left text-xs font-mono tracking-widest text-[var(--mint)] hover:opacity-80 transition-opacity"
                      >
                        {revealedSetSidequests.includes(set.index) ? '▼ VERBERG SIDEQUEST' : '▶ TOON SIDEQUEST'}
                      </button>
                      {revealedSetSidequests.includes(set.index) && (
                        <div className="mt-2 rounded-xl border border-[var(--border)] px-3 py-2">
                          {set.sidequestRound ? (
                            <>
                              <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] mb-1">
                                SIDEQUEST OPDRACHT
                              </p>
                              <p className="text-sm text-[var(--text-muted)] italic">
                                {language === 'en' ? set.sidequestRound.sidequest_en : set.sidequestRound.sidequest_nl}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-[var(--text-muted)]">Geen sidequest gevonden voor deze ronde.</p>
                          )}
                        </div>
                      )}
                    </div>

                    {set.accuseGate && (
                      <div className="mt-3 pt-3 border-t border-[var(--border)]">
                        <p className="text-xs font-mono tracking-widest text-[var(--gold)]">
                          BESCHULDIG-MOMENT NA DEZE RONDE
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* Actions */}
        <div className="pt-6">
          <Button variant="mint" fullWidth size="lg" onClick={() => router.push(`/lobby/${code}`)}>
            Open lobby →
          </Button>
        </div>
      </div>

    </MobileContainer>
  )
}
