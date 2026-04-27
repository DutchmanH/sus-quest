'use client'

import { use, useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { PlayerRow } from '@/components/game/PlayerRow'
import { useRoom } from '@/hooks/useRoom'
import { useGameStore } from '@/store/gameStore'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_ICON } from '@/lib/avatars'

interface AccusePageProps {
  params: Promise<{ code: string }>
}

const ACCUSE_TIMER_SECONDS = 15

export default function AccusePage({ params }: AccusePageProps) {
  const { code } = use(params)
  const router = useRouter()
  const { playerId } = useGameStore()
  const { room, players, currentRound, loading } = useRoom(code)
  const [selected, setSelected] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [resolvingRound, setResolvingRound] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [loadingExistingAccusation, setLoadingExistingAccusation] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(ACCUSE_TIMER_SECONDS)
  const [isAuthHost, setIsAuthHost] = useState(false)
  const timerTriggeredRef = useRef(false)

  useEffect(() => {
    if (room?.status === 'lobby') {
      router.push(`/lobby/${code}`)
    }
    if (currentRound?.status === 'reveal') {
      router.push(`/game/${code}/reveal`)
    }
  }, [room?.status, currentRound?.status, code, router])

  useEffect(() => {
    if (!currentRound || !playerId) return

    const round = currentRound
    let cancelled = false
    const supabase = createClient()

    async function loadExistingAccusation() {
      setLoadingExistingAccusation(true)
      const { data, error } = await supabase
        .from('accusations')
        .select('accused_player_id')
        .eq('round_id', round.id)
        .eq('accuser_player_id', playerId)
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
  }, [currentRound?.id, playerId])

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

  async function handleAccuse() {
    if (!selected || !currentRound || !playerId || submitted) return
    setSubmitted(true)
    setActionError(null)
    const supabase = createClient()
    const { error } = await supabase.from('accusations').insert({
      room_id: room!.id,
      round_id: currentRound.id,
      accuser_player_id: playerId,
      accused_player_id: selected,
    })
    if (error) {
      setActionError('Beschuldiging indienen mislukt')
      setSubmitted(false)
    }
  }

  const me = players.find(p => p.id === playerId)
  const isHost = (me?.is_host ?? false) || isAuthHost
  const otherPlayers = players.filter(p => p.id !== playerId)

  const moveToReveal = useCallback(async () => {
    if (!currentRound || !isHost || resolvingRound) return
    setResolvingRound(true)
    setActionError(null)
    const supabase = createClient()

    const { data: accusations, error: accusationsError } = await supabase
      .from('accusations')
      .select('*')
      .eq('round_id', currentRound.id)
    if (accusationsError) {
      setActionError('Beschuldigingen ophalen mislukt')
      setResolvingRound(false)
      return
    }

    const list = accusations ?? []
    const susId = currentRound.sidequest_player_id

    // Resolve all accusation updates + score changes in parallel
    const scoreResult = await Promise.all(
      list.map((acc) => {
        const correct = acc.accused_player_id === susId
        return Promise.all([
          supabase.from('accusations').update({ is_correct: correct }).eq('id', acc.id),
          supabase.rpc('increment_score', { player_id: acc.accuser_player_id, delta: correct ? 1 : -1 }),
        ])
      })
    )
    const hadScoreError = scoreResult.some(batch => batch.some(step => !!step.error))
    if (hadScoreError) {
      setActionError('Score verwerking mislukt')
      setResolvingRound(false)
      return
    }

    // Sidequest player scores if not caught
    if (susId) {
      const wasCaught = list.some((a) => a.accused_player_id === susId)
      if (!wasCaught) {
        const { error: susScoreError } = await supabase.rpc('increment_score', { player_id: susId, delta: 1 })
        if (susScoreError) {
          setActionError('Sidequest score verwerken mislukt')
          setResolvingRound(false)
          return
        }
      }
    }

    const { error: roundError } = await supabase
      .from('rounds')
      .update({ status: 'reveal' })
      .eq('id', currentRound.id)
      .eq('status', 'accuse')
    if (roundError) {
      setActionError('Naar reveal fase gaan mislukt')
      setResolvingRound(false)
      return
    }
    setResolvingRound(false)
  }, [currentRound, isHost, resolvingRound])

  useEffect(() => {
    // Timer reset when round changes — intentional sync with external round state
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSecondsLeft(ACCUSE_TIMER_SECONDS)
    timerTriggeredRef.current = false
  }, [currentRound?.id])

  useEffect(() => {
    if (!currentRound || currentRound.status !== 'accuse') return
    const intervalId = setInterval(() => {
      setSecondsLeft(prev => (prev <= 0 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(intervalId)
  }, [currentRound?.id, currentRound?.status])

  useEffect(() => {
    if (!isHost || !currentRound || currentRound.status !== 'accuse') return
    if (secondsLeft > 0 || timerTriggeredRef.current) return
    timerTriggeredRef.current = true
    void moveToReveal()
  }, [secondsLeft, isHost, currentRound, moveToReveal])

  if (loading || !currentRound || loadingExistingAccusation) {
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
            fout? jij drinkt. geen druk 💅
          </p>
          <p className="text-xs font-mono tracking-widest text-[var(--coral)] mt-2">
            Let op: fout verdenken = -1 punt.
          </p>
        </div>

        {/* Player list */}
        <div className="flex flex-col gap-2 flex-1">
          {otherPlayers.map(player => (
            <PlayerRow
              key={player.id}
              player={player}
              icon={player.avatar_icon ?? DEFAULT_ICON}
              selectable={!submitted}
              selected={selected === player.id}
              showHostTag={false}
              onSelect={() => !submitted && setSelected(player.id)}
            />
          ))}
        </div>

        {/* CTAs */}
        <div className="py-6 flex flex-col gap-3">
          <p className="text-center text-xs font-mono tracking-widest text-[var(--text-muted)]">
            Reveal over {secondsLeft}s
          </p>
          {!submitted && (
            <Button
              variant="ghost"
              fullWidth
              size="md"
              onClick={() => router.push(`/game/${code}`)}
            >
              ← Terug
            </Button>
          )}
          {actionError && (
            <p className="text-[var(--coral)] text-sm text-center">{actionError}</p>
          )}
          {!submitted ? (
            <Button
              variant="coral"
              fullWidth
              size="lg"
              disabled={!selected}
              onClick={handleAccuse}
            >
              Call the sus! 🚨
            </Button>
          ) : (
            <div className="text-center py-3 text-[var(--text-muted)] text-sm font-mono">
              ✓ beschuldiging ingediend — keuze is opgeslagen voor de host-fase
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
