'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { PlayerStrip } from '@/components/game/PlayerStrip'
import { createClient } from '@/lib/supabase/client'
import { useRoom } from '@/hooks/useRoom'
import { useGameStore } from '@/store/gameStore'

interface GamePageProps {
  params: Promise<{ code: string }>
}

export default function GamePage({ params }: GamePageProps) {
  const { code } = use(params)
  const router = useRouter()
  const { playerId, language } = useGameStore()
  const { room, players, currentRound, loading, expired } = useRoom(code)
  const [hostMenuOpen, setHostMenuOpen] = useState(false)
  const [closingGame, setClosingGame] = useState(false)
  const [returningLobby, setReturningLobby] = useState(false)
  const [advancingPhase, setAdvancingPhase] = useState(false)
  const [cardFlipped, setCardFlipped] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user)
    })
  }, [])

  useEffect(() => {
    if (room?.status === 'finished') {
      router.push(`/game/${code}/end`)
    }
    if (room?.status === 'lobby') {
      router.push(`/lobby/${code}`)
    }
    if (currentRound?.status === 'accuse') {
      router.push(`/game/${code}/accuse`)
    }
    if (currentRound?.status === 'reveal') {
      router.push(`/game/${code}/reveal`)
    }
  }, [room?.status, currentRound, code, router])

  if (expired || (room?.status === 'finished' && room?.current_round <= 1)) {
    return (
      <MobileContainer>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-mono tracking-widest border border-[var(--coral)] text-[var(--coral)]">
            GAME VERLOPEN
          </span>
          <h1 className="text-3xl font-bold leading-tight text-[var(--text-primary)]">
            deze game is verlopen.
          </h1>
          <p className="text-[var(--text-muted)] text-sm">
            {isLoggedIn
              ? 'Ga terug naar de lobby of start een nieuwe sessie.'
              : 'Maak een account aan om je eigen game te starten.'}
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

  if (loading || !room || !currentRound) {
    if (!loading && room?.status === 'generating') {
      return (
        <MobileContainer>
          <div className="flex-1 flex items-center justify-center px-5">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-[var(--coral)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[var(--text-muted)] text-sm font-mono">vragen genereren…</p>
              <button
                onClick={() => router.push(`/lobby/${code}`)}
                className="mt-4 text-xs font-mono tracking-widest text-[var(--mint)] hover:opacity-80"
              >
                terug naar lobby →
              </button>
            </div>
          </div>
        </MobileContainer>
      )
    }

    return (
      <MobileContainer>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--mint)] border-t-transparent rounded-full animate-spin" />
        </div>
      </MobileContainer>
    )
  }

  const question = language === 'en' ? currentRound.main_question_en : currentRound.main_question_nl
  const me = players.find(p => p.id === playerId)
  const isHost = me?.is_host ?? false
  const myScore = me?.score ?? 0
  const susFlagCount = 0 // from accusations count
  const isSus = currentRound.sidequest_player_id === playerId
  const hasSidequest = currentRound.has_sidequest
  const cardText = isSus
    ? (language === 'en'
      ? (currentRound.sidequest_en ?? 'Keep it subtle. No one should notice.')
      : (currentRound.sidequest_nl ?? 'Houd het subtiel. Niemand mag het merken.'))
    : hasSidequest
      ? (language === 'en'
        ? (currentRound.fake_task_en || 'Stay sharp and trust no one.')
        : (currentRound.fake_task_nl || 'Blijf scherp en vertrouw niemand.'))
      : (language === 'en'
        ? 'No sidequest this round. Keep a poker face anyway.'
        : 'Geen sidequest deze ronde. Houd alsnog je pokerface.')

  async function closeGame() {
    if (!room || !isHost || closingGame) return
    setClosingGame(true)
    setCloseError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('rooms')
        .update({ status: 'finished' })
        .eq('id', room.id)
      if (error) {
        setCloseError('Afsluiten mislukt')
        setClosingGame(false)
        return
      }
      router.push('/dashboard')
    } catch {
      setCloseError('Afsluiten mislukt')
      setClosingGame(false)
    }
  }

  async function sendEveryoneToLobby() {
    if (!room || !isHost || returningLobby) return
    setReturningLobby(true)
    setCloseError(null)
    try {
      const supabase = createClient()
      const [{ error: roundsError }, { error: roomError }, { error: playersResetError }, { error: hostReadyError }] = await Promise.all([
        supabase
          .from('rounds')
          .update({ status: 'pending', sidequest_player_id: null })
          .eq('room_id', room.id),
        supabase
          .from('rooms')
          .update({ status: 'lobby', current_round: 1 })
          .eq('id', room.id),
        supabase
          .from('room_players')
          .update({ is_ready: false })
          .eq('room_id', room.id),
        supabase
          .from('room_players')
          .update({ is_ready: true })
          .eq('room_id', room.id)
          .eq('is_host', true),
      ])

      if (roundsError || roomError || playersResetError || hostReadyError) {
        setCloseError('Terugzetten naar lobby mislukt')
        setReturningLobby(false)
        return
      }

      router.push(`/lobby/${code}`)
    } catch {
      setCloseError('Terugzetten naar lobby mislukt')
      setReturningLobby(false)
    }
  }

  async function moveToAccusePhase() {
    if (!currentRound || !isHost || advancingPhase) return
    setAdvancingPhase(true)
    setCloseError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('rounds')
        .update({ status: 'accuse' })
        .eq('id', currentRound.id)
        .eq('status', 'active')
      if (error) {
        setCloseError('Naar beschuldigingsfase gaan mislukt')
      }
    } catch {
      setCloseError('Naar beschuldigingsfase gaan mislukt')
    } finally {
      setAdvancingPhase(false)
    }
  }

  return (
    <MobileContainer>
      <div className="flex flex-col min-h-screen px-5 pt-5">
        {/* Status bar */}
        <div className="flex items-center justify-between mb-4">
          <span className="px-3 py-1 rounded-full text-xs font-mono tracking-widest border border-[var(--mint)] text-[var(--mint)]">
            RONDE {room.current_round}/{room.rounds_total}
          </span>
          <div className="flex gap-2 items-center">
            <span className="text-sm font-mono text-[var(--text-muted)]">★ {myScore}</span>
            <span className="text-sm font-mono text-[var(--text-muted)]">⚑ {susFlagCount}</span>
            {isHost && (
              <div className="relative ml-1">
                <button
                  onClick={() => setHostMenuOpen(o => !o)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  aria-label="Host instellingen"
                >
                  ⚙
                </button>
                {hostMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setHostMenuOpen(false)} />
                    <div className="absolute right-0 top-10 z-50 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-lg min-w-[170px]">
                      <button
                        onClick={() => {
                          setHostMenuOpen(false)
                          sendEveryoneToLobby()
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors border-b border-[var(--border)]"
                      >
                        {returningLobby ? 'Terugzetten…' : 'Iedereen naar lobby'}
                      </button>
                      <button
                        onClick={() => {
                          setHostMenuOpen(false)
                          closeGame()
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-[var(--coral)] hover:bg-[var(--bg-card-hover)] transition-colors"
                      >
                        {closingGame ? 'Afsluiten…' : 'Spel afsluiten'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        {closeError && (
          <p className="text-[var(--coral)] text-xs font-mono mb-2 text-right">{closeError}</p>
        )}

        {/* Progress bar */}
        <div className="w-full h-1 bg-[var(--bg-card)] rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-[var(--mint)] rounded-full transition-all duration-500"
            style={{ width: `${(room.current_round / room.rounds_total) * 100}%` }}
          />
        </div>

        {/* Main question */}
        <div className="flex-1">
          <p className="text-xs font-mono tracking-widest text-[var(--mint)] mb-3">✦ MAIN QUESTION</p>
          <h2 className="text-3xl font-bold leading-tight text-[var(--text-primary)] mb-4">
            {question}
          </h2>

          <div className="mt-4">
            <div className="relative w-full h-52" style={{ perspective: '1200px' }}>
              <button
                onClick={() => setCardFlipped(v => !v)}
                className="relative w-full h-full rounded-2xl"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: cardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  transition: 'transform 450ms ease',
                }}
                aria-label="Draai je geheime kaart"
              >
                <div
                  className="absolute inset-0 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-4 flex flex-col justify-between text-left"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)]">PRIVE KAART</p>
                  <p className="text-xl font-bold leading-tight text-[var(--text-primary)]">
                    tap om je kaart
                    <br />
                    te bekijken
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">lees snel en draai daarna terug.</p>
                </div>
                <div
                  className="absolute inset-0 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-4 flex flex-col justify-between text-left"
                  style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
                >
                  <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)]">
                    {isSus ? 'GEHEIME MISSIE' : hasSidequest ? 'JOUW KAART' : 'FUN KAART'}
                  </p>
                  <p className="text-[var(--text-primary)] text-lg font-semibold leading-snug">{cardText}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {isSus ? 'act normal. niemand mag dit zien.' : 'iemand speelt niet eerlijk. let goed op.'}
                  </p>
                </div>
              </button>
            </div>
          </div>

        </div>

        {/* Players */}
        <div className="mt-4">
          <p className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-3">● AT THE TABLE</p>
          <PlayerStrip players={players} />
        </div>

        {/* Action buttons */}
        <div className="py-6">
          <Button
            variant="dark"
            size="md"
            fullWidth
            className="bg-[#60A5FA] text-[var(--bg-primary)] border-none hover:opacity-90"
            onClick={() => router.push(`/game/${code}/accuse`)}
          >
            ⚑ sus!
          </Button>
        </div>

        {/* Host: advance to accuse phase */}
        {isHost && (
          <div className="pb-4">
            <button
              onClick={moveToAccusePhase}
              disabled={advancingPhase}
              className="w-full text-center text-xs font-mono tracking-widest text-[var(--text-muted)] hover:text-[var(--coral)] py-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {advancingPhase ? 'Fase starten…' : '→ Start beschuldigingsfase'}
            </button>
          </div>
        )}
      </div>
    </MobileContainer>
  )
}
