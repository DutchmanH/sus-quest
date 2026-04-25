'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
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
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const joinUrl = typeof window !== 'undefined'
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/join?code=${code}`
    : `/join?code=${code}`

  // Navigate when game starts (host + all joined players)
  useEffect(() => {
    if (room?.status === 'playing') {
      router.push(`/game/${code}`)
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
    if (!room || generating) return
    setGenerating(true)
    setGenerateError(null)

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: code }),
    })

    if (!res.ok) {
      const data = await res.json()
      setGenerateError(data.error ?? 'Genereren mislukt, probeer opnieuw')
      setGenerating(false)
    }
    // On success, room.status → 'playing' triggers useEffect above
  }

  const me = players.find(p => p.id === playerId)
  const isHost = me?.is_host ?? false
  const notReadyCount = players.filter(p => !p.is_ready).length
  const canStart = players.length >= 2 && notReadyCount === 0

  if (loading) {
    return (
      <MobileContainer>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--mint)] border-t-transparent rounded-full animate-spin" />
        </div>
      </MobileContainer>
    )
  }

  if (generating) {
    return (
      <MobileContainer>
        <div className="flex-1 flex items-center justify-center px-5">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[var(--coral)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[var(--text-muted)] text-sm font-mono">vragen genereren…</p>
            <p className="text-[var(--text-muted)] text-xs font-mono mt-2 opacity-60">even geduld</p>
          </div>
        </div>
      </MobileContainer>
    )
  }

  return (
    <MobileContainer>
      <div className="flex flex-col min-h-screen px-5 pt-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-mono tracking-widest border border-[var(--gold)] text-[var(--gold)]">
            STAP 3 / 3
          </span>
          <Badge variant="live">LIVE</Badge>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold leading-tight">
            invite the<br />
            <span className="italic text-[var(--coral)]">suspects!!</span>
          </h1>
        </div>

        {/* QR invite card */}
        <div className="bg-[var(--mint)] rounded-3xl p-6 flex flex-col items-center gap-4 mb-4 relative">
          <span className="absolute top-4 right-4 text-[var(--bg-primary)] text-xl">✦</span>
          <span className="absolute bottom-4 left-4 text-[var(--bg-primary)] text-sm">✧</span>

          <div className="bg-[var(--bg-primary)] p-4 rounded-2xl">
            <QRCodeSVG
              value={joinUrl}
              size={140}
              bgColor="var(--bg-primary)"
              fgColor="var(--mint)"
              level="M"
            />
          </div>

          <div className="text-center">
            <p className="text-xs font-mono tracking-widest text-[var(--bg-primary)] opacity-70 mb-1">
              ROOM CODE
            </p>
            <p className="text-4xl font-bold font-mono text-[var(--bg-primary)] tracking-widest">
              {code}
            </p>
          </div>
        </div>

        {/* Share */}
        <div className="mb-6">
          <button
            onClick={() =>
              typeof navigator.share === 'function'
                ? navigator.share({ url: joinUrl, title: 'SusQuest' })
                : navigator.clipboard.writeText(joinUrl)
            }
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] text-sm hover:text-[var(--text-primary)]"
          >
            ↗ kopieer link
          </button>
        </div>

        {/* Player list */}
        <div className="flex flex-col gap-2 flex-1">
          <p className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-1">
            SPELERS ({players.length})
          </p>
          {players.map((player) => (
            <PlayerRow key={player.id} player={player} />
          ))}
        </div>

        {generateError && (
          <p className="text-[var(--coral)] text-sm text-center mb-3">{generateError}</p>
        )}

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
              disabled={!canStart}
              onClick={startGame}
            >
              {!canStart
                ? `Wacht op ${notReadyCount} speler(s)…`
                : "Let's gooo 🚀"}
            </Button>
          )}
        </div>
      </div>
    </MobileContainer>
  )
}
