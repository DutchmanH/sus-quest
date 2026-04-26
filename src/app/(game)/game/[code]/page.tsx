'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { PlayerStrip } from '@/components/game/PlayerStrip'
import { useRoom } from '@/hooks/useRoom'
import { useGameStore } from '@/store/gameStore'

interface GamePageProps {
  params: Promise<{ code: string }>
}

export default function GamePage({ params }: GamePageProps) {
  const { code } = use(params)
  const router = useRouter()
  const { playerId, language } = useGameStore()
  const { room, players, currentRound, loading } = useRoom(code)

  useEffect(() => {
    if (room?.status === 'finished') {
      router.push(`/game/${code}/end`)
    }
    if (currentRound?.status === 'accuse') {
      router.push(`/game/${code}/accuse`)
    }
    if (currentRound?.status === 'reveal') {
      router.push(`/game/${code}/reveal`)
    }
  }, [room?.status, currentRound, code, router])

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

  return (
    <MobileContainer>
      <div className="flex flex-col min-h-screen px-5 pt-5">
        {/* Status bar */}
        <div className="flex items-center justify-between mb-4">
          <span className="px-3 py-1 rounded-full text-xs font-mono tracking-widest border border-[var(--mint)] text-[var(--mint)]">
            RONDE {room.current_round}/{room.rounds_total}
          </span>
          <div className="flex gap-2">
            <span className="text-sm font-mono text-[var(--text-muted)]">★ {myScore}</span>
            <span className="text-sm font-mono text-[var(--text-muted)]">⚑ {susFlagCount}</span>
          </div>
        </div>

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

          <div className="bg-[var(--bg-card)] rounded-2xl px-4 py-3 mt-4">
            <p className="text-sm text-[var(--text-muted)]">
              <span className="text-[var(--coral)]">psst.</span>{' '}
              iemand hier speelt niet eerlijk. maybe jij.
            </p>
          </div>
        </div>

        {/* Players */}
        <div className="mt-4">
          <p className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-3">● AT THE TABLE</p>
          <PlayerStrip players={players} />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 py-6">
          <Button
            variant="dark"
            size="md"
            className="flex-1"
            onClick={() => router.push(`/game/${code}/accuse`)}
          >
            ⚑ sus!
          </Button>
          <Button
            variant="mint"
            size="md"
            className="flex-1"
            onClick={() => router.push(`/game/${code}/card`)}
          >
            kaart 👁
          </Button>
        </div>

        {/* Host: advance to accuse phase */}
        {isHost && (
          <div className="pb-4">
            <button
              onClick={async () => {
                const { createClient } = await import('@/lib/supabase/client')
                const supabase = createClient()
                await supabase.from('rounds').update({ status: 'accuse' }).eq('id', currentRound.id)
              }}
              className="w-full text-center text-xs font-mono tracking-widest text-[var(--text-muted)] hover:text-[var(--coral)] py-2"
            >
              → Start beschuldigingsfase
            </button>
          </div>
        )}
      </div>
    </MobileContainer>
  )
}
