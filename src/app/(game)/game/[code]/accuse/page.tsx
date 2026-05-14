'use client'

import { use, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { PlayerRow } from '@/components/game/PlayerRow'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { useRoom } from '@/hooks/useRoom'
import { useSyncPlayerFromUrl } from '@/hooks/useSyncPlayerFromUrl'
import { useGameStore } from '@/store/gameStore'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_ICON } from '@/lib/avatars'
import { apiRoomCodeSegment, readApiErrorMessage } from '@/lib/read-api-error'
import { normalizeRoomCodeParam, playerSessionSuffix } from '@/lib/game-player-query'

interface AccusePageProps {
  params: Promise<{ code: string }>
}

const ACCUSE_TIMER_SECONDS = 15

export default function AccusePage({ params }: AccusePageProps) {
  const { code } = use(params)
  const roomCode = normalizeRoomCodeParam(code)
  const router = useRouter()
  const searchParams = useSearchParams()
  useSyncPlayerFromUrl()
  const { playerId, playerName, playerColor } = useGameStore()
  const sessionSuffix = useMemo(
    () => playerSessionSuffix(searchParams, { playerId, playerName, playerColor }),
    [searchParams, playerId, playerName, playerColor],
  )
  const effectivePlayerId = playerId ?? searchParams.get('pid') ?? ''
  const { room, players, currentRound, loading } = useRoom(roomCode)
  const [selected, setSelected] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [resolvingRound, setResolvingRound] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [loadingExistingAccusation, setLoadingExistingAccusation] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(ACCUSE_TIMER_SECONDS)
  const [isAuthHost, setIsAuthHost] = useState(false)
  const [votedPlayerIds, setVotedPlayerIds] = useState<string[]>([])
  const timerTriggeredRef = useRef(false)

  useEffect(() => {
    if (room?.status === 'lobby') {
      router.push(`/lobby/${roomCode}${sessionSuffix}`)
      return
    }
    if (currentRound?.status === 'reveal') {
      router.push(`/game/${roomCode}/reveal${sessionSuffix}`)
    }
  }, [room?.status, currentRound?.status, roomCode, router, sessionSuffix])

  useEffect(() => {
    if (!currentRound || !effectivePlayerId) return

    const round = currentRound
    let cancelled = false
    const supabase = createClient()

    async function loadExistingAccusation() {
      setLoadingExistingAccusation(true)
      const { data, error } = await supabase
        .from('accusations')
        .select('accused_player_id')
        .eq('round_id', round.id)
        .eq('accuser_player_id', effectivePlayerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        setActionError('Eerdere beschuldiging ophalen mislukt')
        setLoadingExistingAccusation(false)
        return
      }

      if (data?.accused_player_id) {
        setSelected(data.accused_player_id)
        setSubmitted(true)
      } else {
        setSelected(null)
        setSubmitted(false)
      }

      setLoadingExistingAccusation(false)
    }

    void loadExistingAccusation()

    return () => {
      cancelled = true
    }
  }, [currentRound?.id, effectivePlayerId])

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

  useEffect(() => {
    if (!currentRound) return

    const supabase = createClient()
    let cancelled = false

    async function loadVoteStatus() {
      const { data, error } = await supabase
        .from('accusations')
        .select('accuser_player_id')
        .eq('round_id', currentRound!.id)

      if (cancelled) return
      if (error) return

      const unique = Array.from(new Set((data ?? []).map(row => row.accuser_player_id)))
      setVotedPlayerIds(unique)
    }

    void loadVoteStatus()

    const channel = supabase
      .channel(`accuse-votes-${currentRound.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'accusations', filter: `round_id=eq.${currentRound.id}` },
        () => {
          void loadVoteStatus()
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [currentRound?.id])

  async function handleAccuse() {
    if (!selected || !currentRound || !effectivePlayerId) return
    setActionError(null)
    const supabase = createClient()

    const { data: existing, error: existingError } = await supabase
      .from('accusations')
      .select('id')
      .eq('round_id', currentRound.id)
      .eq('accuser_player_id', effectivePlayerId)
      .maybeSingle()
    if (existingError) {
      setActionError('Huidige keuze ophalen mislukt')
      return
    }

    if (existing?.id) {
      const { error } = await supabase
        .from('accusations')
        .update({ accused_player_id: selected })
        .eq('id', existing.id)
      if (error) {
        setActionError('Keuze aanpassen mislukt')
        return
      }
      setSubmitted(true)
      return
    }

    const { error } = await supabase.from('accusations').insert({
      room_id: room!.id,
      round_id: currentRound.id,
      accuser_player_id: effectivePlayerId,
      accused_player_id: selected,
    })
    if (error) {
      setActionError('Beschuldiging indienen mislukt')
      return
    }
    setSubmitted(true)
  }

  const me = players.find(p => p.id === effectivePlayerId)
  const isHost = (me?.is_host ?? false) || isAuthHost
  const otherPlayers = players.filter(p => p.id !== effectivePlayerId)
  const hasVoted = (id: string) => votedPlayerIds.includes(id) || (submitted && id === effectivePlayerId)

  const moveToReveal = useCallback(async () => {
    if (!currentRound || !isHost || resolvingRound) return
    setResolvingRound(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/rooms/${apiRoomCodeSegment(code)}/reveal`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        setActionError(await readApiErrorMessage(res))
      }
    } catch {
      setActionError('Kon geen verbinding maken. Probeer opnieuw.')
    } finally {
      setResolvingRound(false)
    }
  }, [code, currentRound, isHost, resolvingRound])

  useEffect(() => {
    // Timer reset when round changes — intentional sync with external round state
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSecondsLeft(ACCUSE_TIMER_SECONDS)
    timerTriggeredRef.current = false
  }, [currentRound?.id])

  useEffect(() => {
    if (!currentRound) return
    const intervalId = setInterval(() => {
      setSecondsLeft(prev => (prev <= 0 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(intervalId)
  }, [currentRound?.id])

  useEffect(() => {
    if (!isHost || !currentRound) return
    if (secondsLeft > 0 || timerTriggeredRef.current) return
    timerTriggeredRef.current = true
    void moveToReveal()
  }, [secondsLeft, isHost, currentRound, moveToReveal])

  if (loading || !currentRound || loadingExistingAccusation) {
    return (
      <MobileContainer>
        <div className="flex flex-col min-h-screen px-5 pt-5">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="w-36 h-6 rounded-full" />
            <Skeleton className="w-14 h-8 rounded-full" />
          </div>
          <Skeleton className="w-full h-10 mb-6 rounded-2xl" />
          <div className="grid grid-cols-2 gap-3 flex-1">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        </div>
      </MobileContainer>
    )
  }

  return (
    <MobileContainer>
      <div className="flex flex-col min-h-screen px-5 pt-5">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-mono tracking-widest border border-[var(--coral)] text-[var(--coral)]">
            ⚑ ACCUSE · KIES 1
          </span>
          <span className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] uppercase">
            {isHost ? 'host' : 'guest'}
          </span>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold leading-tight">
            you sure<br />
            <span className="italic text-[var(--coral)]">about that?</span>
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            fout? jij drinkt. goed? +1 punt 🔍
          </p>
        </div>

        {/* Player list */}
        <div className="flex flex-col gap-2 flex-1">
          <div className="mb-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl px-4 py-3">
            <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] uppercase mb-2">
              Stemstatus deze ronde
            </p>
            <div className="flex flex-wrap gap-3">
              {players.map(player => (
                <div key={`vote-${player.id}`} className="flex flex-col items-center gap-1 w-[58px]">
                  <div className="relative">
                    <Avatar
                      name={player.display_name}
                      color={player.avatar_color}
                      icon={player.avatar_icon ?? DEFAULT_ICON}
                      size="md"
                    />
                    <span
                      className={`absolute -right-1 -bottom-1 w-5 h-5 rounded-full border text-[10px] flex items-center justify-center ${
                        hasVoted(player.id)
                          ? 'bg-[var(--mint)] text-[var(--bg-primary)] border-[var(--bg-primary)]'
                          : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border)]'
                      }`}
                      title={hasVoted(player.id) ? 'Heeft gestemd' : 'Nog niet gestemd'}
                    >
                      {hasVoted(player.id) ? '✓' : '…'}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] text-center truncate w-full ${
                      player.id === effectivePlayerId ? 'text-[var(--mint)] font-semibold' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {player.id === effectivePlayerId ? 'jij' : player.display_name}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {otherPlayers.map(player => (
            <PlayerRow
              key={player.id}
              player={player}
              icon={player.avatar_icon ?? DEFAULT_ICON}
              selectable
              selected={selected === player.id}
              showHostTag={false}
              onSelect={() => setSelected(player.id)}
            />
          ))}
        </div>

        {/* CTAs */}
        <div className="py-6 flex flex-col gap-3">
          <p className="text-center text-xs font-mono tracking-widest text-[var(--text-muted)]">
            Reveal over {secondsLeft}s
          </p>
          <Button
            variant="ghost"
            fullWidth
            size="md"
            onClick={() => router.push(`/game/${roomCode}${sessionSuffix}`)}
          >
            ← Terug naar vraag
          </Button>
          {actionError && (
            <p className="text-[var(--coral)] text-sm text-center">{actionError}</p>
          )}
          <Button
            variant="coral"
            fullWidth
            size="lg"
            disabled={!selected}
            onClick={handleAccuse}
          >
            {!submitted ? 'Call the sus! 🚨' : 'Keuze aanpassen'}
          </Button>
          {submitted && (
            <div className="text-center py-1 text-[var(--text-muted)] text-xs font-mono">
              je kunt je keuze nog wijzigen tot reveal start
            </div>
          )}

          {isHost && (
            <Button variant="dark" fullWidth size="md" onClick={moveToReveal} disabled={resolvingRound}>
              {resolvingRound ? 'Reveal starten…' : '→ Reveal (host only)'}
            </Button>
          )}
        </div>
      </div>
    </MobileContainer>
  )
}
