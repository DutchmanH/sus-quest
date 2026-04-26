'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { PlayerRow } from '@/components/game/PlayerRow'
import { useRoom } from '@/hooks/useRoom'
import { useGameStore } from '@/store/gameStore'
import { createClient } from '@/lib/supabase/client'
import { AVATAR_COLORS } from '@/types'
import { AVATAR_ICONS, DEFAULT_ICON } from '@/lib/avatars'

interface LobbyPageProps {
  params: Promise<{ code: string }>
}

export default function LobbyPage({ params }: LobbyPageProps) {
  const { code } = use(params)
  const router = useRouter()
  const { playerId } = useGameStore()
  const { room, players, loading } = useRoom(code)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [gearOpen, setGearOpen] = useState(false)

  // Own avatar icon (device-local)
  const [myIcon, setMyIcon] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('susquest-avatar-icon') ?? DEFAULT_ICON
    }
    return DEFAULT_ICON
  })

  // Edit-me modal state
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState(AVATAR_COLORS[0])
  const [editIcon, setEditIcon] = useState<string>(DEFAULT_ICON)
  const [editSaving, setEditSaving] = useState(false)

  const joinUrl = typeof window !== 'undefined'
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/join?code=${code}`
    : `/join?code=${code}`

  useEffect(() => {
    if (room?.status === 'playing') {
      router.push(`/game/${code}`)
    }
  }, [room?.status, code, router])

  const me = players.find(p => p.id === playerId)
  const isHost = me?.is_host ?? false
  const notReadyCount = players.filter(p => !p.is_ready).length
  const canStart = players.length >= 2 && notReadyCount === 0

  function handleShare() {
    if (typeof navigator.share === 'function') {
      navigator.share({ url: joinUrl, title: 'SusQuest — join mijn game!' })
    } else {
      navigator.clipboard.writeText(joinUrl)
    }
  }

  async function toggleReady() {
    if (!playerId || !me) return
    const supabase = createClient()
    await supabase.from('room_players').update({ is_ready: !me.is_ready }).eq('id', playerId)
  }

  async function startGame() {
    if (!room || starting) return
    setStarting(true)
    setStartError(null)
    const res = await fetch(`/api/rooms/${code}/start`, { method: 'POST' })
    if (!res.ok) {
      const data = await res.json()
      setStartError(data.error ?? 'Starten mislukt, probeer opnieuw')
      setStarting(false)
    }
  }

  function openEdit() {
    if (!me) return
    setEditName(me.display_name)
    setEditColor(me.avatar_color)
    setEditIcon(myIcon)
    setEditOpen(true)
  }

  async function saveEdit() {
    if (!playerId || !editName.trim()) return
    setEditSaving(true)
    const supabase = createClient()
    await supabase.from('room_players').update({
      display_name: editName.trim(),
      avatar_color: editColor,
    }).eq('id', playerId)
    localStorage.setItem('susquest-avatar-icon', editIcon)
    setMyIcon(editIcon)
    setEditOpen(false)
    setEditSaving(false)
  }

  if (loading) {
    return (
      <MobileContainer>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--mint)] border-t-transparent rounded-full animate-spin" />
        </div>
      </MobileContainer>
    )
  }

  if (starting) {
    return (
      <MobileContainer>
        <div className="flex-1 flex items-center justify-center px-5">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-[var(--mint)] border-t-transparent rounded-full animate-spin mx-auto mb-5" />
            <p className="text-[var(--text-primary)] font-semibold mb-1">spel starten…</p>
            <p className="text-[var(--text-muted)] text-xs font-mono opacity-60">sidequests worden uitgedeeld</p>
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
            LOBBY
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="live">LIVE</Badge>
            {isHost && (
              <div className="relative">
                <button
                  onClick={() => setGearOpen(o => !o)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  aria-label="Host opties"
                >
                  ⚙
                </button>
                {gearOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setGearOpen(false)} />
                    <div className="absolute right-0 top-10 z-50 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-lg min-w-[180px]">
                      <button
                        onClick={() => { setGearOpen(false); router.push(`/lobby/${code}/generate`) }}
                        className="w-full text-left px-4 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors"
                      >
                        Vragen bekijken →
                      </button>
                      <button
                        onClick={() => { setGearOpen(false); router.push('/dashboard') }}
                        className="w-full text-left px-4 py-3 text-sm text-[var(--coral)] hover:bg-[var(--bg-card-hover)] transition-colors border-t border-[var(--border)]"
                      >
                        Spel afsluiten
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold leading-tight">
            invite the<br />
            <span className="italic text-[var(--coral)]">suspects!!</span>
          </h1>
        </div>

        {/* Share section — host sees QR, guest sees compact code */}
        {isHost ? (
          <div className="bg-[var(--mint)] rounded-3xl p-6 flex flex-col items-center gap-4 mb-4 relative">
            <span className="absolute top-4 right-4 text-[var(--bg-primary)] text-xl">✦</span>
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
              <p className="text-xs font-mono tracking-widest text-[var(--bg-primary)] opacity-70 mb-1">ROOM CODE</p>
              <p className="text-4xl font-bold font-mono text-[var(--bg-primary)] tracking-widest">{code}</p>
            </div>
            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-[var(--bg-primary)] bg-opacity-20 text-[var(--bg-primary)] text-sm font-semibold hover:bg-opacity-30 transition-all"
            >
              deel link →
            </button>
          </div>
        ) : (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl px-6 py-5 flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-1">ROOM CODE</p>
              <p className="text-3xl font-bold font-mono text-[var(--text-primary)] tracking-widest">{code}</p>
            </div>
            <button
              onClick={handleShare}
              className="px-4 py-2.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-muted)] text-sm font-semibold hover:text-[var(--text-primary)] hover:border-[var(--mint)] transition-all"
            >
              deel link →
            </button>
          </div>
        )}

        {/* Player list */}
        <div className="flex flex-col gap-2 flex-1">
          <p className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-1">
            SPELERS ({players.length})
          </p>
          {players.map(player => (
            <PlayerRow
              key={player.id}
              player={player}
              isMe={player.id === playerId}
              icon={player.id === playerId ? myIcon : undefined}
              selectable={player.id === playerId}
              onSelect={player.id === playerId ? openEdit : undefined}
            />
          ))}
          <p className="text-[10px] font-mono text-[var(--text-muted)] opacity-50 mt-1 text-center">
            tik op je naam om aan te passen
          </p>
        </div>

        {startError && (
          <p className="text-[var(--coral)] text-sm text-center mb-3">{startError}</p>
        )}

        {/* CTAs */}
        <div className="py-6">
          {isHost ? (
            <Button variant="mint" fullWidth size="lg" disabled={!canStart || starting} onClick={startGame}>
              {!canStart ? `Wacht op ${notReadyCount} speler(s)…` : "Let's gooo 🚀"}
            </Button>
          ) : (
            <Button
              variant={me?.is_ready ? 'dark' : 'mint'}
              fullWidth
              size="lg"
              onClick={toggleReady}
            >
              {me?.is_ready ? '✓ Ready — wacht op host' : 'Ik ben ready!'}
            </Button>
          )}
        </div>
      </div>

      {/* Edit-me modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => !editSaving && setEditOpen(false)}
          />

          {/* Sheet */}
          <div className="relative bg-[var(--bg-primary)] rounded-t-3xl px-5 pt-6 pb-10 flex flex-col gap-5 max-h-[85vh] overflow-y-auto">
            {/* Handle */}
            <div className="w-10 h-1 bg-[var(--border)] rounded-full mx-auto mb-1" />

            {/* Preview */}
            <div className="flex items-center gap-3">
              <Avatar name={editName || '?'} color={editColor} icon={editIcon} size="lg" />
              <div>
                <p className="font-bold text-[var(--text-primary)]">{editName || '—'}</p>
                <p className="text-xs font-mono text-[var(--text-muted)]">jouw profiel</p>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-2 block uppercase">Naam</label>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                maxLength={20}
                placeholder="jouw naam"
                className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl px-4 py-3 text-[var(--text-primary)] font-semibold placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--mint)]"
              />
            </div>

            {/* Color */}
            <div>
              <label className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-3 block uppercase">Kleur</label>
              <div className="flex gap-3 flex-wrap">
                {AVATAR_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setEditColor(c)}
                    className="w-10 h-10 rounded-full transition-all"
                    style={{
                      background: c,
                      outline: editColor === c ? '3px solid var(--text-primary)' : '3px solid transparent',
                      outlineOffset: '2px',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Icon */}
            <div>
              <label className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-3 block uppercase">Avatar</label>
              <div className="grid grid-cols-6 gap-3">
                {AVATAR_ICONS.map(i => (
                  <button
                    key={i}
                    onClick={() => setEditIcon(i)}
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
                    style={{
                      background: 'var(--mint)',
                      outline: editIcon === i ? '3px solid var(--text-primary)' : '3px solid transparent',
                      outlineOffset: '2px',
                    }}
                  >
                    <span className="text-xl">{i}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button variant="mint" fullWidth size="lg" disabled={editSaving} onClick={saveEdit}>
              {editSaving ? 'Opslaan…' : 'Opslaan →'}
            </Button>
          </div>
        </div>
      )}
    </MobileContainer>
  )
}
