'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { useRoom } from '@/hooks/useRoom'
import { useGameStore } from '@/store/gameStore'
import { createClient } from '@/lib/supabase/client'
import type { Accusation } from '@/types'

interface RevealPageProps {
  params: Promise<{ code: string }>
}

export default function RevealPage({ params }: RevealPageProps) {
  const { code } = use(params)
  const router = useRouter()
  const { playerId, language } = useGameStore()
  const { room, players, currentRound, loading } = useRoom(code)
  const [accusations, setAccusations] = useState<Accusation[]>([])
  const [fallbackRevealSidequest, setFallbackRevealSidequest] = useState<{
    playerId: string | null
    sidequestNl: string | null
    sidequestEn: string | null
  } | null>(null)
  /** Gate (accuse/reveal) rounds have no sidequest_player_id on the row — fetch prior play round */
  const [revealSidequestFallbackDone, setRevealSidequestFallbackDone] = useState(false)
  const [movingNextRound, setMovingNextRound] = useState(false)
  const [nextRoundError, setNextRoundError] = useState<string | null>(null)
  const [isAuthHost, setIsAuthHost] = useState(false)

  useEffect(() => {
    if (room?.status === 'lobby') {
      router.push(`/lobby/${code}`)
    }
    if (currentRound?.status === 'active') {
      router.push(`/game/${code}`)
    }
    if (currentRound?.status === 'accuse') {
      router.push(`/game/${code}/accuse`)
    }
  }, [room?.status, currentRound?.status, code, router])

  useEffect(() => {
    if (!currentRound) return
    const supabase = createClient()
    supabase
      .from('accusations')
      .select('*')
      .eq('round_id', currentRound.id)
      .then(({ data }) => setAccusations((data ?? []) as Accusation[]))
  }, [currentRound])

  useEffect(() => {
    if (!currentRound) return
    const round = currentRound
    let cancelled = false
    const supabase = createClient()

    async function run() {
      setFallbackRevealSidequest(null)

      const hasRowSidequest =
        !!round.sidequest_player_id?.trim() &&
        !!round.sidequest_nl?.trim() &&
        !!round.sidequest_en?.trim()

      if (hasRowSidequest) {
        setRevealSidequestFallbackDone(true)
        return
      }

      setRevealSidequestFallbackDone(false)

      const { data } = await supabase
        .from('rounds')
        .select('sidequest_player_id, sidequest_nl, sidequest_en')
        .eq('room_id', round.room_id)
        .lt('round_number', round.round_number)
        .not('sidequest_player_id', 'is', null)
        .order('round_number', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cancelled) return
      if (data) {
        setFallbackRevealSidequest({
          playerId: data.sidequest_player_id ?? null,
          sidequestNl: data.sidequest_nl ?? null,
          sidequestEn: data.sidequest_en ?? null,
        })
      }
      setRevealSidequestFallbackDone(true)
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [currentRound])

  useEffect(() => {
    if (!room) return
    const supabase = createClient()
    let cancelled = false
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return
      setIsAuthHost((data.user?.id ?? null) === room.host_id)
    })
    return () => {
      cancelled = true
    }
  }, [room?.id, room?.host_id])

  const me = players.find(p => p.id === playerId)
  const isHost = (me?.is_host ?? false) || isAuthHost

  async function nextRound() {
    if (!room || !currentRound || !isHost || movingNextRound) return
    setMovingNextRound(true)
    setNextRoundError(null)
    try {
      const res = await fetch(`/api/rooms/${code}/advance`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setNextRoundError(data.error ?? 'Volgende ronde starten mislukt')
        setMovingNextRound(false)
        return
      }
      setMovingNextRound(false)
      if (data.finished) {
        router.push(`/game/${code}/end`)
        return
      }
      router.push(`/game/${code}`)
    } catch {
      setNextRoundError('Volgende ronde starten mislukt')
      setMovingNextRound(false)
    }
  }

  if (loading || !currentRound || !room) {
    return (
      <MobileContainer>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--mint)] border-t-transparent rounded-full animate-spin" />
        </div>
      </MobileContainer>
    )
  }

  const revealSidequestPlayerId =
    currentRound.sidequest_player_id ?? fallbackRevealSidequest?.playerId ?? null
  const revealSidequestText =
    language === 'en'
      ? (currentRound.sidequest_en?.trim() ||
          fallbackRevealSidequest?.sidequestEn?.trim() ||
          null)
      : (currentRound.sidequest_nl?.trim() ||
          fallbackRevealSidequest?.sidequestNl?.trim() ||
          null)
  const susPlayer = players.find(p => p.id === revealSidequestPlayerId)
  const hasSus = !!susPlayer
  const sidequestRowComplete =
    !!currentRound.sidequest_player_id?.trim() &&
    !!currentRound.sidequest_nl?.trim() &&
    !!currentRound.sidequest_en?.trim()
  const waitingRevealSidequest = !sidequestRowComplete && !revealSidequestFallbackDone
  const questionsPerCycle = Math.max(1, Number(room.questions_per_cycle ?? 4))
  const playCycles = Math.max(1, Number(room.play_cycles ?? Math.ceil((room.rounds_total ?? 10) / questionsPerCycle)))
  const indexAfterIntro = Math.max(0, room.current_round - 2)
  const currentCycleIndex = Math.min(playCycles - 1, Math.max(0, Math.floor(indexAfterIntro / (questionsPerCycle + 1))))
  const earlyBonus = Math.max(0, playCycles - currentCycleIndex - 1)
  const correctPointsLabel = `+${1 + earlyBonus}`

  return (
    <MobileContainer>
      <div className="flex flex-col min-h-screen px-5 pt-5">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-mono tracking-widest border border-[var(--border)] text-[var(--text-muted)]">
            RONDE {room.current_round} · REVEAL
          </span>
          <span className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] uppercase">
            {isHost ? 'host' : 'guest'}
          </span>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold leading-tight">
            something <span className="italic text-[var(--mint)]">felt</span>
            <br />
            off <span className="text-[var(--text-muted)]">tbh…</span>
          </h1>
        </div>

        {/* Sus reveal card — dark text on mint so light theme (--bg-primary is light) stays readable */}
        <div className="bg-[var(--mint)] rounded-3xl p-5 mb-4">
          <p className="text-xs font-mono tracking-widest text-[#0A1914]/70 mb-3">
            THE SUS WAS
          </p>
          {waitingRevealSidequest ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-[#0A1914]/30 border-t-[#0A1914] rounded-full animate-spin" />
            </div>
          ) : hasSus ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <Avatar
                  name={susPlayer!.display_name}
                  color={susPlayer!.avatar_color}
                  icon={susPlayer!.avatar_icon ?? undefined}
                  size="lg"
                />
                <div className="min-w-0">
                  <p className="text-xl font-bold text-[#0A1914] truncate">{susPlayer!.display_name}</p>
                  <p className="text-xs font-mono text-[#0A1914]/70">MISSIE GELUKT · +1</p>
                </div>
              </div>
              <div className="rounded-2xl border border-[#0A1914]/15 bg-[#0A1914]/10 px-4 py-3">
                <p className="text-[#0A1914] italic text-sm leading-relaxed break-words">
                  &ldquo;{revealSidequestText ?? 'Geen sidequesttekst gevonden.'}&rdquo;
                </p>
              </div>
            </>
          ) : (
            <p className="text-[#0A1914] font-semibold">Geen sus deze ronde.</p>
          )}
        </div>

        {/* Accusations */}
        {accusations.length > 0 && (
          <div className="bg-[var(--bg-card)] rounded-3xl p-5 mb-4">
            <p className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-3">⚑ BESCHULDIGINGEN</p>
            <div className="flex flex-col gap-2">
              {accusations.map(acc => {
                const accuser = players.find(p => p.id === acc.accuser_player_id)
                const accused = players.find(p => p.id === acc.accused_player_id)
                return (
                  <div key={acc.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {accuser && (
                        <Avatar
                          name={accuser.display_name}
                          color={accuser.avatar_color}
                          icon={accuser.avatar_icon ?? undefined}
                          size="sm"
                        />
                      )}
                      <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                        {accuser?.display_name ?? 'Onbekend'}
                      </span>
                      <span className="text-xs font-mono tracking-widest text-[var(--gold)]">VERDENKT</span>
                      {accused && (
                        <Avatar
                          name={accused.display_name}
                          color={accused.avatar_color}
                          icon={accused.avatar_icon ?? undefined}
                          size="sm"
                        />
                      )}
                      <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                        {accused?.display_name ?? 'Onbekend'}
                      </span>
                    </div>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${
                      acc.is_correct === null
                        ? 'border-[var(--border)] text-[var(--text-muted)]'
                        : acc.is_correct
                          ? 'border-[var(--mint)] text-[var(--mint)]'
                          : 'border-[var(--coral)] text-[var(--coral)]'
                    }`}>
                      {acc.is_correct === null ? 'GEEN SUS · 0' : acc.is_correct ? `BOOM · ${correctPointsLabel}` : 'NEIN · -1'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex-1" />

        {/* CTA */}
        <div className="py-6">
          {nextRoundError && (
            <p className="text-center text-[var(--coral)] text-sm mb-3">{nextRoundError}</p>
          )}
          {isHost ? (
            <Button variant="mint" fullWidth size="lg" onClick={nextRound} disabled={movingNextRound}>
              {movingNextRound ? 'Volgende starten…' : 'Volgende →'}
            </Button>
          ) : (
            <p className="text-center text-[var(--text-muted)] text-sm font-mono">
              wacht op de host…
            </p>
          )}
        </div>
      </div>
    </MobileContainer>
  )
}
