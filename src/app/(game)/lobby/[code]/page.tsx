'use client'

import { use, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { PlayerRow } from '@/components/game/PlayerRow'
import { GeneratingLoader } from '@/components/game/GeneratingLoader'
import { useRoom } from '@/hooks/useRoom'
import { generateFunnyGameName } from '@/lib/funny-game-name'
import { useGameStore } from '@/store/gameStore'
import { createClient } from '@/lib/supabase/client'
import { AVATAR_COLORS } from '@/types'
import { AVATAR_ICONS, DEFAULT_ICON } from '@/lib/avatars'

interface LobbyPageProps {
  params: Promise<{ code: string }>
}

function formatVibeLabel(value: string | null | undefined): string {
  const labels: Record<string, string> = {
    bank: 'Op de bank',
    feest: 'Feest',
    after_midnight: 'After midnight',
    onderweg: 'Onderweg',
  }
  return value ? (labels[value] ?? value) : '-'
}

function formatGroepLabel(value: string | null | undefined): string {
  const labels: Record<string, string> = {
    vrienden: 'Vrienden',
    vreemden: 'Vreemden',
    stelletjes: 'Stelletjes',
    familie: 'Familie',
  }
  return value ? (labels[value] ?? value) : '-'
}

function formatContentLabel(value: string | null | undefined): string {
  const labels: Record<string, string> = {
    gezellig: 'Gezellig',
    blozen: 'Blozen',
    niemand_veilig: 'Niemand is veilig',
  }
  return value ? (labels[value] ?? value) : '-'
}

export default function LobbyPage({ params }: LobbyPageProps) {
  const { code } = use(params)
  const router = useRouter()
  const { playerId } = useGameStore()
  const { room, players, loading, expired } = useRoom(code)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [gearOpen, setGearOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(() =>
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('settings') === '1'
      : false
  )
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [gameName, setGameName] = useState('')
  const [readySpark, setReadySpark] = useState(false)
  const [waitingDots, setWaitingDots] = useState(1)
  const [lobbyFeedback, setLobbyFeedback] = useState<{ text: string; tone: 'mint' | 'gold' } | null>(null)


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
  const myIcon = me?.avatar_icon ?? undefined
  const isHost = me?.is_host ?? false
  const notReadyCount = players.filter(p => !p.is_ready).length
  const canStart = players.length >= 2 && notReadyCount === 0
  const everyoneReady = players.length >= 2 && notReadyCount === 0
  const prevEveryoneReadyRef = useRef(false)
  const prevReadyByPlayerRef = useRef<Record<string, boolean>>({})
  const prevPlayerIdsRef = useRef<string[]>([])
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initializedPlayersRef = useRef(false)

  useEffect(() => {
    const wasReady = prevEveryoneReadyRef.current
    if (!wasReady && everyoneReady) {
      setReadySpark(true)
      const timer = setTimeout(() => setReadySpark(false), 900)
      prevEveryoneReadyRef.current = everyoneReady
      return () => clearTimeout(timer)
    }
    prevEveryoneReadyRef.current = everyoneReady
  }, [everyoneReady])

  useEffect(() => {
    const timer = setInterval(() => {
      setWaitingDots(d => (d % 3) + 1)
    }, 450)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current)
      feedbackTimerRef.current = null
    }
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const nextReadyMap: Record<string, boolean> = {}
    const newlyReadyPlayers: string[] = []
    const previousIds = new Set(prevPlayerIdsRef.current)
    const newlyJoinedPlayers = players.filter(player => !previousIds.has(player.id)).map(player => player.display_name)

    for (const player of players) {
      nextReadyMap[player.id] = player.is_ready
      const wasReady = prevReadyByPlayerRef.current[player.id] ?? false
      if (!wasReady && player.is_ready) {
        newlyReadyPlayers.push(player.display_name)
      }
    }

    if (initializedPlayersRef.current) {
      let feedback: { text: string; tone: 'mint' | 'gold' } | null = null
      if (!prevEveryoneReadyRef.current && everyoneReady) {
        feedback = { text: 'YES! Iedereen is ready ✦', tone: 'mint' }
      } else if (newlyJoinedPlayers.length > 0) {
        feedback = { text: `${newlyJoinedPlayers[0]} is gejoint ✦`, tone: 'gold' }
      } else if (newlyReadyPlayers.length > 0) {
        feedback = { text: `${newlyReadyPlayers[0]} is ready ✦`, tone: 'mint' }
      }

      if (feedback) {
        setLobbyFeedback(feedback)
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
        feedbackTimerRef.current = setTimeout(() => setLobbyFeedback(null), 1400)
      }
    } else {
      initializedPlayersRef.current = true
    }

    prevPlayerIdsRef.current = players.map(player => player.id)
    prevReadyByPlayerRef.current = nextReadyMap
  }, [players, everyoneReady])

  useEffect(() => {
    if (me?.avatar_icon) localStorage.setItem('susquest-avatar-icon', me.avatar_icon)
  }, [me?.avatar_icon])

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
      if (res.status === 410) {
        setTimeout(() => router.push('/dashboard'), 1200)
      }
      setStarting(false)
    }
  }

  async function saveLobbySettings() {
    if (!isHost || !room || room.status !== 'lobby') return
    if (!gameName.trim()) {
      setSettingsError('Game naam is verplicht')
      return
    }
    setSettingsSaving(true)
    setSettingsError(null)
    const res = await fetch(`/api/rooms/${code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_name: gameName.trim(),
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setSettingsError(data.error ?? 'Opslaan mislukt')
      setSettingsSaving(false)
      return
    }
    setSettingsSaving(false)
    setSettingsOpen(false)
  }

  function openEdit() {
    if (!me) return
    setEditName(me.display_name)
    setEditColor(me.avatar_color)
    setEditIcon(me.avatar_icon ?? myIcon)
    setEditOpen(true)
  }

  async function saveEdit() {
    if (!playerId || !editName.trim()) return
    setEditSaving(true)
    const supabase = createClient()
    await supabase.from('room_players').update({
      display_name: editName.trim(),
      avatar_color: editColor,
      avatar_icon: editIcon,
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

  if (expired || (room?.status === 'finished' && room?.current_round <= 1)) {
    return (
      <MobileContainer>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-mono tracking-widest border border-[var(--coral)] text-[var(--coral)]">
            GAME VERLOPEN
          </span>
          <h1 className="text-3xl font-bold leading-tight text-[var(--text-primary)]">
            deze lobby is verlopen.
          </h1>
          <p className="text-[var(--text-muted)] text-sm">Start een nieuwe game om verder te spelen.</p>
          <Button variant="mint" size="lg" onClick={() => router.push('/dashboard')}>
            Naar dashboard →
          </Button>
        </div>
      </MobileContainer>
    )
  }

  if (starting) {
    return <GeneratingLoader />
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
            <div className="relative">
              <button
                onClick={() => setGearOpen(o => !o)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                aria-label="Lobby opties"
              >
                ⚙
              </button>
              {gearOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setGearOpen(false)} />
                  <div className="absolute right-0 top-10 z-50 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-lg min-w-[190px]">
                    <button
                      onClick={() => { setGearOpen(false); setGameName(room?.game_name ?? ''); setSettingsOpen(true) }}
                      className="w-full text-left px-4 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors border-b border-[var(--border)]"
                    >
                      Lobby instellingen
                    </button>
                    {isHost && (
                      <button
                        onClick={() => { setGearOpen(false); router.push(`/lobby/${code}/generate`) }}
                        className="w-full text-left px-4 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors"
                      >
                        Vragen bekijken →
                      </button>
                    )}
                    {isHost && (
                      <button
                        onClick={() => { setGearOpen(false); router.push('/dashboard') }}
                        className="w-full text-left px-4 py-3 text-sm text-[var(--coral)] hover:bg-[var(--bg-card-hover)] transition-colors border-t border-[var(--border)]"
                      >
                        Spel afsluiten
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        {lobbyFeedback && (
          <div className={`mb-3 text-center text-xs font-mono tracking-widest ${
            lobbyFeedback.tone === 'mint' ? 'text-[var(--mint)]' : 'text-[var(--gold)]'
          }`}>
            {lobbyFeedback.text}
          </div>
        )}

        {/* Title */}
        <div className="mb-6">
          {!!room?.game_name && (
            <div className="mb-3">
              <p className="text-[10px] font-mono tracking-[0.2em] text-[var(--text-muted)] uppercase mb-1">
                vanavond spelen jullie
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border)]">
                <span className="text-sm">🎭</span>
                <p className="text-sm font-bold text-[var(--mint)] leading-none">
                  {room.game_name}
                </p>
              </div>
            </div>
          )}
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
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-[var(--bg-primary)] text-[var(--mint)] text-sm font-semibold hover:opacity-90 transition-all border border-[var(--bg-primary)]"
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
        <div className={`flex flex-col gap-2 flex-1 relative transition-all duration-300 ${
          everyoneReady ? 'rounded-2xl p-2 bg-[var(--mint)]/5 border border-[var(--mint)]/30 animate-pulse' : ''
        }`}>
          {readySpark && (
            <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
              <span className="absolute top-3 left-5 text-[var(--mint)] text-xs animate-pulse">✦</span>
              <span className="absolute top-7 right-7 text-[var(--gold)] text-xs animate-pulse">✦</span>
              <span className="absolute bottom-8 left-10 text-[var(--coral)] text-xs animate-pulse">✦</span>
            </div>
          )}
          <p className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-1">
            SPELERS ({players.length})
          </p>
          {players.map((player, index) => (
            <div key={player.id} className="relative">
              <PlayerRow
                player={player}
                isMe={player.id === playerId}
                icon={player.avatar_icon ?? (player.id === playerId ? myIcon : DEFAULT_ICON)}
                highlightMeRing={!everyoneReady}
                selectable={player.id === playerId}
                onSelect={player.id === playerId ? openEdit : undefined}
              />
              {everyoneReady && index < players.length - 1 && (
                <div className="flex justify-center py-1.5">
                  <div className="h-3 w-px bg-[var(--mint)]/70" />
                </div>
              )}
            </div>
          ))}
          {everyoneReady && (
            <p className="text-[10px] font-mono tracking-widest text-[var(--mint)] text-center mt-1">
              TEAM IS COMPLEET ✦ KLAAR OM TE STARTEN
            </p>
          )}
          {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, idx) => (
            <div
              key={`placeholder-${idx}`}
              className="bg-[var(--bg-card)] border border-dashed border-[var(--border)] rounded-2xl px-4 py-3 animate-pulse"
            >
              <p className="text-xs font-mono tracking-widest text-[var(--text-muted)]">
                wacht op spelers{'.'.repeat(waitingDots)}
              </p>
            </div>
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
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => !settingsSaving && setSettingsOpen(false)} />
          <div className="relative bg-[var(--bg-primary)] rounded-t-3xl px-5 pt-6 pb-10 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 bg-[var(--border)] rounded-full mx-auto mb-1" />
            <h3 className="text-xl font-bold text-[var(--text-primary)]">Lobby instellingen</h3>

            <div>
              <label className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-2 block uppercase">Game naam</label>
              <div className="flex gap-2">
                <input
                  value={gameName}
                  onChange={e => setGameName(e.target.value)}
                  maxLength={50}
                  className="flex-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl px-4 py-3 text-[var(--text-primary)] font-semibold focus:outline-none focus:border-[var(--mint)]"
                />
                <button
                  onClick={() => setGameName(generateFunnyGameName())}
                  className="px-3 rounded-2xl border border-[var(--border)] text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  random
                </button>
              </div>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
              <p className="text-xs font-mono tracking-widest text-[var(--text-muted)] uppercase mb-2">
                Huidige game instellingen
              </p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="rounded-xl border border-[var(--border)] px-3 py-2">
                  <p className="text-[10px] font-mono text-[var(--text-muted)] tracking-widest uppercase">Rondes</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{room?.rounds_total ?? '-'}</p>
                </div>
                <div className="rounded-xl border border-[var(--border)] px-3 py-2">
                  <p className="text-[10px] font-mono text-[var(--text-muted)] tracking-widest uppercase">Setting</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{formatVibeLabel(room?.vibe)}</p>
                </div>
                <div className="rounded-xl border border-[var(--border)] px-3 py-2">
                  <p className="text-[10px] font-mono text-[var(--text-muted)] tracking-widest uppercase">Groep</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{formatGroepLabel(room?.groep)}</p>
                </div>
                <div className="rounded-xl border border-[var(--border)] px-3 py-2">
                  <p className="text-[10px] font-mono text-[var(--text-muted)] tracking-widest uppercase">Intensiteit</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{formatContentLabel(room?.content_level)}</p>
                </div>
              </div>
              <p className="text-xs font-mono tracking-widest text-[var(--text-muted)] uppercase mb-1">
                Vragen beheren
              </p>
              <p className="text-sm text-[var(--text-muted)] mb-3">
                Bekijk je huidige vragen en genereer ze opnieuw met dezelfde of nieuwe settings.
              </p>
              {isHost ? (
                <button
                  onClick={() => {
                    setSettingsOpen(false)
                    router.push(`/lobby/${code}/generate`)
                  }}
                  className="w-full py-3 rounded-2xl border border-[var(--border)] text-[var(--text-muted)] text-sm font-semibold hover:text-[var(--text-primary)] hover:border-[var(--mint)] transition-all"
                >
                  Open vragenpreview →
                </button>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">
                  Alleen de host kan vragen opnieuw genereren.
                </p>
              )}
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
              <p className="text-xs font-mono tracking-widest text-[var(--text-muted)] uppercase mb-1">
                Jouw profiel
              </p>
              <p className="text-sm text-[var(--text-muted)] mb-3">
                Pas je naam, profielfoto en kleur aan voor deze lobby.
              </p>
              <button
                onClick={() => {
                  setSettingsOpen(false)
                  openEdit()
                }}
                className="w-full py-3 rounded-2xl border border-[var(--mint)] text-[var(--mint)] text-sm font-semibold hover:bg-[var(--mint)]/10 transition-all"
              >
                Profiel aanpassen
              </button>
            </div>

            {settingsError && <p className="text-[var(--coral)] text-sm">{settingsError}</p>}
            {isHost ? (
              <Button variant="mint" fullWidth size="lg" disabled={settingsSaving} onClick={saveLobbySettings}>
                {settingsSaving ? 'Opslaan…' : 'Instellingen opslaan'}
              </Button>
            ) : (
              <button
                onClick={() => setSettingsOpen(false)}
                className="w-full py-3 rounded-2xl border border-[var(--border)] text-[var(--text-muted)] text-sm font-semibold hover:text-[var(--text-primary)] transition-colors"
              >
                Sluiten
              </button>
            )}
          </div>
        </div>
      )}
    </MobileContainer>
  )
}
