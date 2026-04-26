'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { useRoom } from '@/hooks/useRoom'
import { getPlayerTitle } from '@/lib/game-logic'

interface EndPageProps {
  params: Promise<{ code: string }>
}

export default function EndPage({ params }: EndPageProps) {
  const { code } = use(params)
  const router = useRouter()
  const { room, players, loading } = useRoom(code)

  const sorted = [...players].sort((a, b) => b.score - a.score)
  const winner = sorted[0]

  if (loading || !room) {
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
        <div className="mb-6">
          <span className="px-3 py-1 rounded-full text-xs font-mono tracking-widest border border-[var(--gold)] text-[var(--gold)]">
            RONDE {room.rounds_total}/{room.rounds_total} · FIN
          </span>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-5xl font-bold leading-tight">
            the sus<br />
            <span className="italic text-[var(--mint)]">has won.</span>
          </h1>
        </div>

        {/* Winner card */}
        {winner && (
          <div
            className="rounded-3xl p-6 flex flex-col items-center mb-4"
            style={{ background: 'linear-gradient(135deg, #FF7F6B 0%, #F5C842 100%)' }}
          >
            <Avatar name={winner.display_name} color={winner.avatar_color} size="xl" className="mb-3" />
            <p className="text-2xl font-bold text-white mb-1">
              {winner.display_name} 👑
            </p>
            <p className="text-xs font-mono tracking-widest text-white opacity-80 mb-1">
              {getPlayerTitle(winner.score, 1).toUpperCase()} · {winner.score} PT
            </p>
          </div>
        )}

        {/* Leaderboard */}
        <div className="flex flex-col gap-2 flex-1">
          {sorted.slice(1).map((player, index) => (
            <div
              key={player.id}
              className="flex items-center gap-3 bg-[var(--bg-card)] rounded-2xl px-4 py-3"
            >
              <span className="w-5 text-sm font-mono text-[var(--text-muted)]">{index + 2}</span>
              <Avatar name={player.display_name} color={player.avatar_color} size="md" />
              <div className="flex-1">
                <p className="font-semibold text-[var(--text-primary)]">{player.display_name}</p>
                <p className="text-xs font-mono tracking-widest text-[var(--text-muted)]">
                  {getPlayerTitle(player.score, index + 2).toUpperCase()}
                </p>
              </div>
              <span className={`text-lg font-bold ${player.score < 0 ? 'text-[var(--coral)]' : 'text-[var(--text-primary)]'}`}>
                {player.score}
              </span>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex gap-3 py-6">
          <Button variant="dark" size="md" className="flex-1" onClick={() => router.push('/')}>
            home
          </Button>
          <Button variant="mint" size="md" className="flex-1" onClick={() => router.push('/create-party')}>
            replay ↻
          </Button>
        </div>
      </div>
    </MobileContainer>
  )
}
