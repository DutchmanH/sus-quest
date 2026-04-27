'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { useGameStore } from '@/store/gameStore'
import { AVATAR_COLORS } from '@/types'
import { AVATAR_ICONS } from '@/lib/avatars'

function JoinForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setPlayer } = useGameStore()

  const [code, setCode] = useState(searchParams.get('code') ?? '')
  const [name, setName] = useState('')
  const [color, setColor] = useState(AVATAR_COLORS[0])
  const [icon, setIcon] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleJoin() {
    if (!code.trim() || !name.trim()) {
      setError('Vul een code en naam in')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/rooms/${code.trim().toUpperCase()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name.trim(), avatarColor: color, avatarIcon: icon }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Joinen mislukt')
        return
      }
      if (icon) localStorage.setItem('susquest-avatar-icon', icon)
      else localStorage.removeItem('susquest-avatar-icon')
      setPlayer(data.player.id, data.player.display_name, data.player.avatar_color)
      router.push(`/lobby/${data.room.code}`)
    } catch {
      setError('Joinen mislukt')
    } finally {
      setLoading(false)
    }
  }

  return (
    <MobileContainer>
      <div className="flex flex-col min-h-screen px-5 pt-5 pb-8">

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold leading-tight">
            join the<br />
            <span className="italic text-[var(--coral)]">chaos.</span>
          </h1>
        </div>

        {/* Avatar preview */}
        <div className="flex items-center gap-4 mb-8">
          <Avatar name={name || '?'} color={color} icon={icon ?? undefined} size="xl" />
          <div>
            <p className="font-bold text-lg text-[var(--text-primary)] leading-tight">
              {name || 'jouw naam'}
            </p>
            <p className="text-xs font-mono text-[var(--text-muted)] mt-0.5">zo zie je eruit</p>
          </div>
        </div>

        <div className="flex flex-col gap-6 flex-1">
          {/* Room code */}
          {!searchParams.get('code') && (
            <div>
              <label className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-2 block uppercase">
                Room code
              </label>
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="bijv. 7K-2M9"
                className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl px-4 py-3 text-[var(--text-primary)] font-mono text-lg tracking-widest placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--mint)]"
              />
            </div>
          )}

          {/* Name */}
          <div>
            <label className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-2 block uppercase">
              Jouw naam
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="jouw naam"
              maxLength={20}
              className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl px-4 py-3 text-[var(--text-primary)] font-semibold placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--mint)]"
            />
          </div>

          {/* Color */}
          <div>
            <label className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-3 block uppercase">
              Kleur
            </label>
            <div className="flex gap-3 flex-wrap">
              {AVATAR_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-10 h-10 rounded-full transition-all"
                  style={{
                    background: c,
                    outline: color === c ? '3px solid var(--text-primary)' : '3px solid transparent',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Icon */}
          <div>
            <label className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-3 block uppercase">
              Avatar
            </label>
            <div className="grid grid-cols-6 gap-3">
              {AVATAR_ICONS.map(i => (
                <button
                  key={i}
                  onClick={() => setIcon(i)}
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: icon === i ? 'var(--mint)' : 'var(--bg-card)',
                    outline: icon === i ? '3px solid var(--text-primary)' : '3px solid var(--border)',
                    outlineOffset: '2px',
                  }}
                >
                  <span className="text-xl">{i}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-[var(--coral)] text-sm">{error}</p>}
        </div>

        <div className="pt-6">
          <Button variant="mint" fullWidth size="lg" disabled={loading} onClick={handleJoin}>
            {loading ? 'Joinen…' : 'Join game →'}
          </Button>
        </div>
      </div>
    </MobileContainer>
  )
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinForm />
    </Suspense>
  )
}
