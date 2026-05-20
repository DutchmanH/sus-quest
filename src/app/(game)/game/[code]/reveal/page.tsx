'use client'

import { use, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { useRoom } from '@/hooks/useRoom'
import { useSyncPlayerFromUrl } from '@/hooks/useSyncPlayerFromUrl'
import { useGameStore } from '@/store/gameStore'
import { createClient } from '@/lib/supabase/client'
import type { Accusation } from '@/types'
import { DEFAULT_ICON } from '@/lib/avatars'
import { apiRoomCodeSegment, readApiErrorMessage } from '@/lib/read-api-error'
import { normalizeRoomCodeParam, playerSessionSuffix } from '@/lib/game-player-query'

interface RevealPageProps {
  params: Promise<{ code: string }>
}

export default function RevealPage({ params }: RevealPageProps) {
  const { code } = use(params)
  const roomCode = normalizeRoomCodeParam(code)
  const router = useRouter()
  const searchParams = useSearchParams()
  useSyncPlayerFromUrl()
  const { playerId, playerName, playerColor, language } = useGameStore()
  const sessionSuffix = useMemo(
    () => playerSessionSuffix(searchParams, { playerId, playerName, playerColor }),
    [searchParams, playerId, playerName, playerColor],
  )
  const effectivePlayerId = playerId ?? searchParams.get('pid') ?? ''
  const { room, players, currentRound, loading } = useRoom(roomCode)
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
  const revealRedirectSkipRef = useRef(false)
  const currentRoundRef = useRef(currentRound)
  useLayoutEffect(() => {
    currentRoundRef.current = currentRound ?? null
  }, [currentRound])

  useEffect(() => {
    if (room?.status === 'lobby') {
      router.push(`/lobby/${roomCode}${sessionSuffix}`)
    }
  }, [room?.status, roomCode, router, sessionSuffix])

  // Debounce: avoid bouncing back to /accuse while `currentRound` is briefly stale after navigating here.
  useEffect(() => {
    if (room?.status === 'lobby') return
    if (!currentRound) return

    if (currentRound.status === 'reveal') {
      revealRedirectSkipRef.current = true
      const t = window.setTimeout(() => {
        revealRedirectSkipRef.current = false
      }, 200)
      return () => clearTimeout(t)
    }

    if (revealRedirectSkipRef.current) return

    const t = window.setTimeout(() => {
      if (revealRedirectSkipRef.current) return
      const latest = currentRoundRef.current
      if (!latest) return
      if (latest.status === 'accuse') {
        router.push(`/game/${roomCode}/accuse${sessionSuffix}`)
        return
      }
      if (latest.status === 'active') {
        router.push(`/game/${roomCode}${sessionSuffix}`)
      }
    }, 120)

    return () => clearTimeout(t)
  }, [room?.status, currentRound?.id, currentRound?.status, roomCode, router, sessionSuffix])

  useEffect(() => {
    if (!currentRound) return
    const roundId = currentRound.id
    const supabase = createClient()
    let cancelled = false

    async function load() {
      const { data } = await supabase
        .from('accusations')
        .select('*')
        .eq('round_id', roundId)
      if (!cancelled) setAccusations((data ?? []) as Accusation[])
    }

    void load()

    const channel = supabase
      .channel(`reveal-accusations-${roundId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'accusations', filter: `round_id=eq.${roundId}` },
        () => {
          void load()
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [currentRound?.id])

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

  const me = players.find(p => p.id === effectivePlayerId)
  const isHost = (me?.is_host ?? false) || isAuthHost

  async function nextRound() {
    if (!room || !currentRound || !isHost || movingNextRound) return
    setMovingNextRound(true)
    setNextRoundError(null)
    try {
      const res = await fetch(`/api/rooms/${apiRoomCodeSegment(code)}/advance`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        setNextRoundError(await readApiErrorMessage(res))
        return
      }
      const data = await res.json().catch(() => ({} as { finished?: boolean }))
      if (data.finished) {
        router.push(`/game/${roomCode}/end${sessionSuffix}`)
        return
      }
      router.push(`/game/${roomCode}${sessionSuffix}`)
    } catch {
      setNextRoundError('Kon geen verbinding maken. Probeer opnieuw.')
    } finally {
      setMovingNextRound(false)
    }
  }

  const voteLeaderboard = useMemo(() => {
    const accByAccuser = new Map(accusations.map(a => [a.accuser_player_id, a]))
    return [...players]
      .sort(
        (a, b) =>
          (b.score ?? 0) - (a.score ?? 0) ||
          a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' }),
      )
      .map((player, index) => {
        const acc = accByAccuser.get(player.id) ?? null
        const accused = acc ? players.find(p => p.id === acc.accused_player_id) ?? null : null
        return { rank: index + 1, player, acc, accused }
      })
  }, [players, accusations])

  const boardTitle = language === 'en' ? 'VOTE SCOREBOARD' : 'STEMSCOREBORD'
  const boardSub = language === 'en' ? 'Sus pick · points this round' : 'Verdachte · punten deze ronde'
  const colTotal = language === 'en' ? 'Total' : 'Totaal'
  const colRound = language === 'en' ? 'This round' : 'Deze ronde'
  const noVote = language === 'en' ? 'No vote' : 'Geen stem'

  if (loading || !currentRound || !room) {
    return (
      <MobileContainer>
        <div className="flex flex-col min-h-screen px-5 pt-8 gap-5">
          <Skeleton className="w-24 h-6 rounded-full self-center" />
          <Skeleton className="w-20 h-20 rounded-full self-center" />
          <Skeleton className="w-40 h-7 self-center" />
          <Skeleton className="w-full h-24 rounded-2xl" />
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </MobileContainer>
    )
  }

  if (
    room.status === 'playing' &&
    (currentRound.status === 'accuse' || currentRound.status === 'active')
  ) {
    const syncLabel = language === 'en' ? 'Syncing round…' : 'Ronde synchroniseren…'
    return (
      <MobileContainer>
        <div className="flex flex-col min-h-screen px-5 items-center justify-center gap-4">
          <div className="w-10 h-10 border-2 border-[var(--mint)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-mono tracking-widest text-[var(--text-muted)] text-center">{syncLabel}</p>
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
                  <p className="text-xs font-mono text-[#0A1914]/70">SIDEQUEST</p>
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

        {/* Vote leaderboard: player → suspected avatar(s) + round score */}
        <div className="bg-[var(--bg-card)] rounded-3xl p-5 mb-4">
          <p className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-1">{boardTitle}</p>
          <p className="text-[10px] font-mono text-[var(--text-muted)]/80 mb-4">{boardSub}</p>
          <div className="flex flex-col gap-3">
            {voteLeaderboard.map(({ rank, player, acc, accused }) => {
              const roundPts = !acc ? '—' : acc.is_correct === true ? '+1' : '0'
              const roundClass =
                acc?.is_correct === true
                  ? 'text-[var(--mint)] border-[var(--mint)]'
                  : 'text-[var(--text-muted)] border-[var(--border)]'

              return (
                <div
                  key={player.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-xs font-mono text-[var(--text-muted)] w-5 shrink-0">{rank}</span>
                      <Avatar
                        name={player.display_name}
                        color={player.avatar_color}
                        icon={player.avatar_icon ?? DEFAULT_ICON}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">{player.display_name}</p>
                        <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)]">{colTotal}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold tabular-nums text-[var(--mint)]">
                        {player.score ?? 0}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--border)]/60 pt-3 pl-8">
                    <div className="flex flex-col gap-1 min-w-0">
                      <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] uppercase">
                        {colRound}
                      </p>
                      <div className="flex items-center gap-2">
                        {accused ? (
                          <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] pl-1 pr-2 py-1">
                            <Avatar
                              name={accused.display_name}
                              color={accused.avatar_color}
                              icon={accused.avatar_icon ?? DEFAULT_ICON}
                              size="sm"
                            />
                            <span className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[120px]">
                              {accused.display_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)] font-mono">{noVote}</span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-sm font-mono font-bold px-2.5 py-1 rounded-full border shrink-0 ${roundClass}`}
                    >
                      {roundPts}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

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
