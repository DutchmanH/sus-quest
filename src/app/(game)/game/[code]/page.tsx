'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { PlayerStrip } from '@/components/game/PlayerStrip'
import { Skeleton } from '@/components/ui/Skeleton'
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
  const [movingNextRound, setMovingNextRound] = useState(false)
  const [movingPrevRound, setMovingPrevRound] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAuthHost, setIsAuthHost] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)
  const [nextRoundError, setNextRoundError] = useState<string | null>(null)
  const [animatedQuestion, setAnimatedQuestion] = useState('')
  const [questionAnimPhase, setQuestionAnimPhase] = useState<'idle' | 'out' | 'in' | 'settle'>('idle')
  const [flippedRoundState, setFlippedRoundState] = useState<{ roundId: string | null; isFlipped: boolean }>({
    roundId: null,
    isFlipped: false,
  })
  const previousRoundIdRef = useRef<string | null>(null)
  const animationTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user)
      setIsAuthHost((data.user?.id ?? null) === (room?.host_id ?? null))
    })
  }, [room?.host_id])

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

  const question = currentRound
    ? (language === 'en' ? currentRound.main_question_en : currentRound.main_question_nl)
    : null

  useEffect(() => {
    if (!currentRound?.id || !question) return

    const previousRoundId = previousRoundIdRef.current
    previousRoundIdRef.current = currentRound.id

    if (!previousRoundId || previousRoundId === currentRound.id) return

    animationTimeoutsRef.current.forEach(clearTimeout)
    animationTimeoutsRef.current = []

    setQuestionAnimPhase('out')

    const swapTimer = setTimeout(() => {
      setAnimatedQuestion(question)
      setQuestionAnimPhase('in')
    }, 220)

    const settleTimer = setTimeout(() => {
      setQuestionAnimPhase('settle')
    }, 420)

    const resetTimer = setTimeout(() => {
      setQuestionAnimPhase('idle')
    }, 560)

    animationTimeoutsRef.current.push(swapTimer, settleTimer, resetTimer)
  }, [currentRound?.id, question])

  useEffect(() => {
    return () => {
      animationTimeoutsRef.current.forEach(clearTimeout)
      animationTimeoutsRef.current = []
    }
  }, [])

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
        <div className="flex flex-col min-h-screen px-5 pt-8">
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <Skeleton className="w-24 h-5 rounded-full" />
            <Skeleton className="w-full h-32" />
            <Skeleton className="w-3/4 h-5" />
          </div>
          <div className="pb-6">
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        </div>
      </MobileContainer>
    )
  }

  const questionText = question ?? ''
  const visibleQuestion = animatedQuestion || questionText
  const cardFlipped = flippedRoundState.roundId === currentRound.id ? flippedRoundState.isFlipped : false
  const me = players.find(p => p.id === playerId)
  const isHost = (me?.is_host ?? false) || isAuthHost
  const myScore = me?.score ?? 0
  const susFlagCount = 0 // from accusations count
  const questionsPerCycle = Math.max(1, Number(room.questions_per_cycle ?? 4))
  const playCycles = Math.max(1, Number(room.play_cycles ?? Math.ceil((room.rounds_total ?? 10) / questionsPerCycle)))
  const derivedTotalQuestions = questionsPerCycle * playCycles
  const isIntroRound = room.current_round === 1
  const indexAfterIntro = Math.max(0, room.current_round - 2)
  const isGateRound = !isIntroRound && indexAfterIntro % (questionsPerCycle + 1) === questionsPerCycle
  const completedBlocks = isIntroRound ? 0 : Math.floor(indexAfterIntro / (questionsPerCycle + 1))
  const positionInBlock = isIntroRound ? 0 : indexAfterIntro % (questionsPerCycle + 1)
  const isCycleStartRound = !isIntroRound && !isGateRound && positionInBlock === 0 && completedBlocks > 0
  const isSidequestFocusRound = isIntroRound || isCycleStartRound
  const currentQuestionNumber = isIntroRound
    ? 0
    : Math.min(derivedTotalQuestions, completedBlocks * questionsPerCycle + Math.min(positionInBlock + 1, questionsPerCycle))
  const progressRatio = derivedTotalQuestions > 0 ? currentQuestionNumber / derivedTotalQuestions : 0
  const isSus = currentRound.sidequest_player_id === playerId
  const hasSidequest = currentRound.has_sidequest
  const cardText = isSus
    ? (language === 'en'
      ? (currentRound.sidequest_en ?? 'Keep it subtle. No one should notice.')
      : (currentRound.sidequest_nl ?? 'Houd het subtiel. Niemand mag het merken.'))
    : (language === 'en'
      ? (currentRound.suspicious_fact_en || 'Stay sharp and trust no one.')
      : (currentRound.suspicious_fact_nl || 'Blijf scherp en vertrouw niemand.'))

  async function closeGame() {
    if (!room || !isHost || closingGame) return
    setClosingGame(true)
    setCloseError(null)
    try {
      const res = await fetch(`/api/rooms/${code}/close`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCloseError(data.error ?? 'Afsluiten mislukt')
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

  async function moveToNextRoundDirectly() {
    if (!room || !currentRound || !isHost || movingNextRound) return
    setMovingNextRound(true)
    setNextRoundError(null)

    try {
      const res = await fetch(`/api/rooms/${code}/advance`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setNextRoundError(data.error ?? 'Volgende vraag starten mislukt')
        setMovingNextRound(false)
        return
      }
      if (data.finished) {
        router.push(`/game/${code}/end`)
        return
      }
      router.push(`/game/${code}`)
    } catch {
      setNextRoundError('Volgende vraag starten mislukt')
      setMovingNextRound(false)
      return
    }

    setMovingNextRound(false)
  }

  async function moveToPreviousRoundDirectly() {
    if (!room || !currentRound || !isHost || movingPrevRound || room.current_round <= 1) return
    setMovingPrevRound(true)
    setNextRoundError(null)

    try {
      const res = await fetch(`/api/rooms/${code}/previous`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setNextRoundError(data.error ?? 'Vorige vraag openen mislukt')
        setMovingPrevRound(false)
        return
      }
      router.push(`/game/${code}`)
    } catch {
      setNextRoundError('Vorige vraag openen mislukt')
      setMovingPrevRound(false)
      return
    }

    setMovingPrevRound(false)
  }

  return (
    <MobileContainer>
      <div className="flex flex-col h-screen overflow-hidden px-5 pt-4">
        {/* Status bar */}
        <div className="flex items-center justify-between mb-4">
          <span className="px-3 py-1 rounded-full text-xs font-mono tracking-widest border border-[var(--mint)] text-[var(--mint)]">
            {isIntroRound
              ? 'RONDE 1 · INTRO'
              : isCycleStartRound
                ? 'NIEUWE RONDE · CHECK JE KAART'
                : `VRAAG ${currentQuestionNumber}/${derivedTotalQuestions}`}
          </span>
          <div className="flex gap-2 items-center">
            <span className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] uppercase">
              {isHost ? 'host' : 'guest'}
            </span>
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
            style={{ width: `${progressRatio * 100}%` }}
          />
        </div>

        {/* Main question */}
        <div className={`flex-1 min-h-0 ${isSidequestFocusRound ? 'flex flex-col' : ''}`}>
          {!isSidequestFocusRound && (
            <>
              <p className="text-xs font-mono tracking-widest text-[var(--mint)] mb-3">✦ MAIN QUESTION</p>
              <div className="mb-4 min-h-[96px] relative overflow-hidden rounded-2xl">
                <h2
                  className="text-3xl font-bold leading-tight text-[var(--text-primary)]"
                  style={{
                    transform:
                      questionAnimPhase === 'out'
                        ? 'translateY(-26px) scale(0.98)'
                        : questionAnimPhase === 'in'
                          ? 'translateY(18px) scale(0.985)'
                          : questionAnimPhase === 'settle'
                            ? 'translateY(-3px) scale(1.01)'
                            : 'translateY(0) scale(1)',
                    opacity:
                      questionAnimPhase === 'out'
                        ? 0
                        : questionAnimPhase === 'in'
                          ? 0.9
                          : 1,
                    transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease',
                    willChange: 'transform, opacity',
                  }}
                >
                  {visibleQuestion}
                </h2>
              </div>
            </>
          )}
          {isSidequestFocusRound && (
            <div className="mb-4">
              <p className="text-xs font-mono tracking-widest text-[var(--mint)] mb-2 uppercase">
                {isIntroRound ? 'Ronde 1 · Intro' : 'Nieuwe ronde · Sidequest check'}
              </p>
              <h2 className="text-3xl font-bold leading-tight text-[var(--text-primary)]">
                {isIntroRound ? 'Check eerst je kaart: heb jij een sidequest?' : 'Nieuwe ronde: check opnieuw je geheime kaart.'}
              </h2>
              <p className="text-sm text-[var(--text-muted)] mt-2">
                Draai je priv kaart om, lees stil je opdracht en houd die geheim.
              </p>
            </div>
          )}

          <div className={`mt-4 ${isSidequestFocusRound ? 'flex-1 min-h-0' : ''}`}>
            <div
              className={`relative w-full ${isSidequestFocusRound ? 'h-full min-h-[280px]' : 'h-44'}`}
              style={{
                perspective: '1200px',
                transform:
                  questionAnimPhase === 'out'
                    ? 'translateY(18px) scale(0.985)'
                    : questionAnimPhase === 'in'
                      ? 'translateY(-14px) scale(0.99)'
                      : questionAnimPhase === 'settle'
                        ? 'translateY(2px) scale(1.005)'
                        : 'translateY(0) scale(1)',
                opacity: questionAnimPhase === 'out' ? 0.88 : 1,
                transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease',
                willChange: 'transform, opacity',
              }}
            >
              <button
                onClick={() => setFlippedRoundState(prev => ({
                  roundId: currentRound.id,
                  isFlipped: prev.roundId === currentRound.id ? !prev.isFlipped : true,
                }))}
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
                    {isSidequestFocusRound ? 'check of jij de' : 'tap om je kaart'}
                    <br />
                    {isSidequestFocusRound ? 'sidequest hebt' : 'te bekijken'}
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
                  <p className="text-[var(--text-primary)] text-lg font-semibold leading-snug">
                    {cardText}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {isSus ? 'act normal. niemand mag dit zien.' : 'iemand speelt niet eerlijk. let goed op.'}
                  </p>
                </div>
              </button>
            </div>
          </div>

        </div>

        {/* Action buttons */}
        <div className="pt-3 pb-4 flex flex-col gap-2 shrink-0">
          {nextRoundError && (
            <p className="text-[var(--coral)] text-xs font-mono text-center mb-2">{nextRoundError}</p>
          )}
          {isHost && (
            <Button
              variant="dark"
              size="md"
              fullWidth
              onClick={moveToPreviousRoundDirectly}
              disabled={movingPrevRound || room.current_round <= 1}
            >
              {movingPrevRound ? 'Vorige vraag laden…' : '← Vorige vraag'}
            </Button>
          )}
          {isHost && (
            <Button
              variant="mint"
              size="lg"
              fullWidth
              onClick={moveToNextRoundDirectly}
              disabled={movingNextRound}
            >
              {movingNextRound ? 'Doorgaan…' : isIntroRound ? 'Start vragenronde →' : 'Volgende vraag →'}
            </Button>
          )}
          {isGateRound && (
            <Button
              variant="dark"
              size="md"
              fullWidth
              className="bg-[#60A5FA] text-[var(--bg-primary)] border-none hover:opacity-90"
              onClick={() => router.push(`/game/${code}/accuse`)}
            >
              {isHost ? '⚑ Open beschuldigingsfase' : '⚑ Naar beschuldigen'}
            </Button>
          )}
        </div>

        {/* Players */}
        <div className="mt-2 pb-3 shrink-0">
          <p className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-3">● AT THE TABLE</p>
          <PlayerStrip players={players} />
        </div>

      </div>
    </MobileContainer>
  )
}
