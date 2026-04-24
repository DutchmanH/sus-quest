'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PlayerRow } from '@/components/game/PlayerRow'
import { useRoom } from '@/hooks/useRoom'
import { useGameStore } from '@/store/gameStore'
import { createClient } from '@/lib/supabase/client'

interface LobbyPageProps {
  params: Promise<{ code: string }>
}

export default function LobbyPage({ params }: LobbyPageProps) {
  const { code } = use(params)
  const router = useRouter()
  const { playerId } = useGameStore()
  const { room, players, loading } = useRoom(code)

  // Navigate when game starts
  useEffect(() => {
    if (room?.status === 'settings') {
      router.push(`/settings/${code}`)
    }
  }, [room?.status, code, router])

  async function toggleReady() {
    if (!playerId) return
    const supabase = createClient()
    const me = players.find(p => p.id === playerId)
    if (!me) return
    await supabase
      .from('room_players')
      .update({ is_ready: !me.is_ready })
      .eq('id', playerId)
  }

  async function startGame() {
    if (!room) return
    const supabase = createClient()
    await supabase
      .from('rooms')
      .update({ status: 'settings' })
      .eq('id', room.id)
  }

  const me = players.find(p => p.id === playerId)
  const isHost = me?.is_host ?? false
  const allReady = players.every(p => p.is_ready)

  if (loading) {
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
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs font-mono tracking-widest text-[var(--text-muted)]">
            ROOM · {code}
          </span>
          <Badge variant="live">LIVE</Badge>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold leading-tight">
            {players.length} sus{' '}
            <span className="italic text-[var(--mint)]">babies</span>
            <br />
            ready to{' '}
            <span className="text-[var(--coral)]">lie.</span>
          </h1>
        </div>

        {/* Player list */}
        <div className="flex flex-col gap-2 flex-1">
          {players.map((player) => (
            <PlayerRow key={player.id} player={player} />
          ))}

          <button className="flex items-center gap-2 px-4 py-3 text-[var(--text-muted)] text-sm hover:text-[var(--mint)] transition-colors">
            + Nodig nog iemand uit
          </button>
        </div>

        {/* CTAs */}
        <div className="py-6 flex flex-col gap-3">
          {!isHost && (
            <Button
              variant={me?.is_ready ? 'dark' : 'mint'}
              fullWidth
              size="lg"
              onClick={toggleReady}
            >
              {me?.is_ready ? '✓ Ready — wacht op host' : 'Ik ben ready!'}
            </Button>
          )}
          {isHost && (
            <Button
              variant="mint"
              fullWidth
              size="lg"
              disabled={!allReady && players.length < 2}
              onClick={startGame}
            >
              Let&apos;s gooo 🚀
            </Button>
          )}
        </div>
      </div>
    </MobileContainer>
  )
}
