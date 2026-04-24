'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { useGameStore } from '@/store/gameStore'

export default function CreatePage() {
  const router = useRouter()
  const { setPlayer } = useGameStore()
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function createRoom() {
      try {
        const res = await fetch('/api/rooms', { method: 'POST' })
        if (!res.ok) {
          const data = await res.json()
          setError(data.error ?? 'Room aanmaken mislukt')
          return
        }
        const { room, player } = await res.json()
        setRoomCode(room.code)
        setPlayer(player.id, player.display_name, player.avatar_color)
      } catch {
        setError('Room aanmaken mislukt')
      } finally {
        setLoading(false)
      }
    }
    createRoom()
  }, [])

  const joinUrl = roomCode
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/join?code=${roomCode}`
    : ''

  if (loading) {
    return (
      <MobileContainer>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[var(--mint)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[var(--text-muted)] text-sm font-mono">room aanmaken…</p>
          </div>
        </div>
      </MobileContainer>
    )
  }

  if (error) {
    return (
      <MobileContainer>
        <div className="flex-1 flex items-center justify-center px-5">
          <div className="text-center">
            <p className="text-[var(--coral)] mb-4">{error}</p>
            <Button variant="dark" onClick={() => router.push('/')}>Terug naar home</Button>
          </div>
        </div>
      </MobileContainer>
    )
  }

  return (
    <MobileContainer>
      <div className="flex flex-col min-h-screen px-5 pt-5">
        {/* Step */}
        <div className="mb-6">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-mono tracking-widest border border-[var(--gold)] text-[var(--gold)]">
            STAP 2 / 5
          </span>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold leading-tight">
            invite the<br />
            <span className="italic text-[var(--coral)]">suspects!!</span>
          </h1>
        </div>

        {/* QR card */}
        <div className="bg-[var(--mint)] rounded-3xl p-6 flex flex-col items-center gap-4 mb-6 relative">
          <span className="absolute top-4 right-4 text-[var(--bg-primary)] text-xl">✦</span>
          <span className="absolute bottom-4 left-4 text-[var(--bg-primary)] text-sm">✧</span>

          <div className="bg-[var(--bg-primary)] p-4 rounded-2xl">
            <QRCodeSVG
              value={joinUrl}
              size={160}
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
              {roomCode}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={async () => {
              const res = await fetch('/api/rooms', { method: 'POST' })
              if (res.ok) {
                const { room, player } = await res.json()
                setRoomCode(room.code)
                setPlayer(player.id, player.display_name, player.avatar_color)
              }
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] text-sm hover:text-[var(--text-primary)]"
          >
            ⟳ nieuwe code
          </button>
          <button
            onClick={() => navigator.share?.({ url: joinUrl, title: 'SusQuest' }) ?? navigator.clipboard.writeText(joinUrl)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] text-sm hover:text-[var(--text-primary)]"
          >
            ↗ share link
          </button>
        </div>

        <div className="flex-1" />

        <div className="py-6">
          <Button
            variant="mint"
            fullWidth
            size="lg"
            onClick={() => router.push(`/lobby/${roomCode}`)}
          >
            Naar de lobby →
          </Button>
        </div>
      </div>
    </MobileContainer>
  )
}
