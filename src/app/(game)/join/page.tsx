'use client'

import { useState, Suspense, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { useGameStore } from '@/store/gameStore'
import { AVATAR_COLORS } from '@/types'
import { AVATAR_ICONS } from '@/lib/avatars'
import { apiRoomCodeSegment, readApiErrorMessage } from '@/lib/read-api-error'

type JoinStep = 1 | 2

interface ValidatedRoom {
  code: string
  game_name: string | null
}

function JoinForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setPlayer } = useGameStore()

  const initialCode = searchParams.get('code') ?? ''
  const [step, setStep] = useState<JoinStep>(1)
  const [code, setCode] = useState(initialCode)
  const [validatedRoom, setValidatedRoom] = useState<ValidatedRoom | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState(AVATAR_COLORS[0])
  const [icon, setIcon] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const verifyRoom = useCallback(async (rawCode: string) => {
    const normalized = rawCode.trim().toUpperCase()
    if (!normalized) {
      setError('Vul een roomcode in')
      return false
    }
    setVerifying(true)
    setError(null)
    try {
      const res = await fetch(`/api/rooms/${apiRoomCodeSegment(normalized)}/join`)
      if (!res.ok) {
        setError(await readApiErrorMessage(res))
        setValidatedRoom(null)
        return false
      }
      const data = (await res.json()) as { room: ValidatedRoom }
      setCode(normalized)
      setValidatedRoom(data.room)
      setStep(2)
      return true
    } catch {
      setError('Room controleren mislukt')
      setValidatedRoom(null)
      return false
    } finally {
      setVerifying(false)
    }
  }, [])

  useEffect(() => {
    if (!initialCode.trim()) return
    void verifyRoom(initialCode)
  }, [initialCode, verifyRoom])

  function handleBackToCode() {
    setStep(1)
    setValidatedRoom(null)
    setError(null)
  }

  async function handleVerifyCode() {
    await verifyRoom(code)
  }

  async function handleJoin() {
    if (!validatedRoom) {
      setError('Controleer eerst je roomcode')
      setStep(1)
      return
    }
    if (!name.trim()) {
      setError('Vul een naam in')
      return
    }
    setJoining(true)
    setError(null)
    try {
      const res = await fetch(`/api/rooms/${apiRoomCodeSegment(validatedRoom.code)}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name.trim(), avatarColor: color, avatarIcon: icon }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Joinen mislukt')
        if (res.status === 404 || res.status === 409 || res.status === 410) {
          handleBackToCode()
        }
        return
      }
      if (icon) localStorage.setItem('susquest-avatar-icon', icon)
      else localStorage.removeItem('susquest-avatar-icon')
      setPlayer(data.player.id, data.player.display_name, data.player.avatar_color)
      const lobbyParams = new URLSearchParams({
        pid: data.player.id,
        pname: data.player.display_name,
        pcolor: data.player.avatar_color,
      })
      router.push(`/lobby/${data.room.code}?${lobbyParams.toString()}`)
    } catch {
      setError('Joinen mislukt')
    } finally {
      setJoining(false)
    }
  }

  return (
    <MobileContainer>
      <div className="flex flex-col min-h-screen px-5 pt-5 pb-8">
        <button
          type="button"
          onClick={() => router.push('/')}
          disabled={verifying || joining}
          className="text-[var(--text-muted)] text-sm mb-6 self-start hover:text-[var(--text-primary)] disabled:opacity-50"
        >
          ← terug naar home
        </button>

        <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] uppercase mb-6">
          stap {step} / 2 · {step === 1 ? 'roomcode' : 'jouw avatar'}
        </p>

        <div className="mb-8">
          <h1 className="text-5xl font-bold leading-tight">
            {step === 1 ? (
              <>
                join the<br />
                <span className="italic text-[var(--coral)]">chaos.</span>
              </>
            ) : (
              <>
                maak je<br />
                <span className="italic text-[var(--mint)]">avatar.</span>
              </>
            )}
          </h1>
          {step === 2 && validatedRoom && (
            <p className="text-sm text-[var(--text-muted)] mt-2">
              {validatedRoom.game_name
                ? `${validatedRoom.game_name} · ${validatedRoom.code}`
                : `room ${validatedRoom.code}`}
            </p>
          )}
        </div>

        {step === 1 ? (
          <div className="flex flex-col gap-6 flex-1">
            <div>
              <label className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-2 block uppercase">
                Room code
              </label>
              <input
                value={code}
                onChange={e => {
                  setCode(e.target.value.toUpperCase())
                  setError(null)
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !verifying) void handleVerifyCode()
                }}
                placeholder="bijv. 7K-2M9"
                autoComplete="off"
                autoFocus={!initialCode}
                disabled={verifying}
                aria-busy={verifying}
                className={`w-full bg-[var(--bg-card)] border rounded-2xl px-4 py-3 text-[var(--text-primary)] font-mono text-lg tracking-widest placeholder:text-[var(--text-muted)] focus:outline-none transition-colors ${
                  verifying
                    ? 'border-[var(--mint)] opacity-70 cursor-wait'
                    : 'border-[var(--border)] focus:border-[var(--mint)]'
                }`}
              />
              {!verifying && (
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  Vraag de host om de code. Bestaat de room niet, dan kun je niet verder.
                </p>
              )}
            </div>

            {verifying && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-3 rounded-2xl border border-[var(--mint)]/40 bg-[var(--mint)]/10 px-4 py-3"
              >
                <div
                  className="w-5 h-5 shrink-0 border-2 border-[var(--mint)] border-t-transparent rounded-full animate-spin"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Room opzoeken…</p>
                  <p className="text-xs font-mono text-[var(--text-muted)] truncate">
                    code {code.trim().toUpperCase() || '—'}
                  </p>
                </div>
              </div>
            )}

            {error && !verifying && <p className="text-[var(--coral)] text-sm">{error}</p>}

            <div className="pt-2 mt-auto">
              <Button
                variant="mint"
                fullWidth
                size="lg"
                disabled={verifying || !code.trim()}
                onClick={() => void handleVerifyCode()}
              >
                {verifying ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-[var(--bg-primary)]/30 border-t-[var(--bg-primary)] rounded-full animate-spin" />
                    Bezig met ophalen…
                  </span>
                ) : (
                  'Code controleren →'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 flex-1">
            <div className="flex items-center gap-4">
              <Avatar name={name || '?'} color={color} icon={icon ?? undefined} size="xl" />
              <div>
                <p className="font-bold text-lg text-[var(--text-primary)] leading-tight">
                  {name || 'jouw naam'}
                </p>
                <p className="text-xs font-mono text-[var(--text-muted)] mt-0.5">zo zie je eruit</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-2 block uppercase">
                Jouw naam
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="jouw naam"
                maxLength={20}
                autoFocus
                className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl px-4 py-3 text-[var(--text-primary)] font-semibold placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--mint)]"
              />
            </div>

            <div>
              <label className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-3 block uppercase">
                Kleur
              </label>
              <div className="flex gap-3 flex-wrap">
                {AVATAR_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
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

            <div>
              <label className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-3 block uppercase">
                Avatar
              </label>
              <div className="grid grid-cols-6 gap-3">
                {AVATAR_ICONS.map(i => (
                  <button
                    key={i}
                    type="button"
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

            <div className="pt-2 mt-auto flex flex-col gap-3">
              <Button variant="ghost" fullWidth size="md" onClick={handleBackToCode}>
                ← Andere roomcode
              </Button>
              <Button
                variant="mint"
                fullWidth
                size="lg"
                disabled={joining || !name.trim()}
                onClick={() => void handleJoin()}
              >
                {joining ? 'Joinen…' : 'Join game →'}
              </Button>
            </div>
          </div>
        )}
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
