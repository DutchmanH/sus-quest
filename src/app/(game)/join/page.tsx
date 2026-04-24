'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { useGameStore } from '@/store/gameStore'
import { Suspense } from 'react'

function JoinForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setPlayer } = useGameStore()

  const [code, setCode] = useState(searchParams.get('code') ?? '')
  const [name, setName] = useState('')
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
        body: JSON.stringify({ displayName: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Joinen mislukt')
        return
      }
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
      <div className="flex flex-col min-h-screen px-5 pt-5">
        {/* Step */}
        <div className="mb-6">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-mono tracking-widest border border-[var(--gold)] text-[var(--gold)]">
            STAP 3 / 5
          </span>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold leading-tight">
            join the<br />
            <span className="italic text-[var(--coral)]">chaos.</span>
          </h1>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4">
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
        </div>

        {error && (
          <p className="mt-3 text-[var(--coral)] text-sm">{error}</p>
        )}

        <div className="flex-1" />

        <div className="py-6">
          <Button
            variant="mint"
            fullWidth
            size="lg"
            disabled={loading}
            onClick={handleJoin}
          >
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
