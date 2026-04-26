'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { useGameStore } from '@/store/gameStore'
import type { Round } from '@/types'

interface GeneratePageProps {
  params: Promise<{ code: string }>
}

export default function GeneratePage({ params }: GeneratePageProps) {
  const { code } = use(params)
  const router = useRouter()
  const { language } = useGameStore()

  const [rounds, setRounds] = useState<Round[]>([])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  const generate = useCallback(async () => {
    setGenerating(true)
    setError(null)
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: code }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Genereren mislukt')
      setGenerating(false)
      return
    }
    await loadRounds()
    setGenerating(false)
  }, [code])

  async function loadRounds() {
    const res = await fetch(`/api/rooms/${code}/rounds`)
    if (res.ok) {
      const data = await res.json()
      setRounds(data.rounds ?? [])
    }
    setLoaded(true)
  }

  useEffect(() => {
    async function init() {
      const res = await fetch(`/api/rooms/${code}/rounds`)
      if (res.ok) {
        const data = await res.json()
        if (data.rounds?.length > 0) {
          setRounds(data.rounds)
          setLoaded(true)
        } else {
          // No rounds yet — auto-generate
          await generate()
        }
      } else {
        setLoaded(true)
      }
    }
    init()
  }, [code, generate])

  if (generating) {
    return (
      <MobileContainer>
        <div className="flex-1 flex items-center justify-center px-5">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-[var(--coral)] border-t-transparent rounded-full animate-spin mx-auto mb-5" />
            <p className="text-[var(--text-primary)] font-semibold mb-1">vragen genereren…</p>
            <p className="text-[var(--text-muted)] text-xs font-mono opacity-60">even geduld, dit duurt ~10 seconden</p>
          </div>
        </div>
      </MobileContainer>
    )
  }

  if (!loaded) {
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
      <div className="flex flex-col min-h-screen px-5 pt-5 pb-8">

        {/* Header */}
        <div className="mb-6">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-mono tracking-widest border border-[var(--gold)] text-[var(--gold)] mb-4">
            VRAGENPREVIEW
          </span>
          <h1 className="text-4xl font-bold leading-tight">
            dit worden<br />
            <span className="italic text-[var(--mint)]">de vragen.</span>
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-2">
            Check de vragen, kies opnieuw of open de lobby.
          </p>
        </div>

        {error && (
          <p className="text-[var(--coral)] text-sm mb-4">{error}</p>
        )}

        {/* Question list */}
        <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
          {rounds.map((round) => (
            <div
              key={round.id}
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <span className="text-xs font-mono text-[var(--text-muted)] tracking-widest mb-1 block">
                    RONDE {round.round_number}
                  </span>
                  <p className="text-[var(--text-primary)] font-semibold leading-snug">
                    {language === 'en' ? round.main_question_en : round.main_question_nl}
                  </p>
                </div>
                {round.has_sidequest && (
                  <span className="shrink-0 text-xs font-mono tracking-widest border border-[var(--coral)] text-[var(--coral)] px-2 py-0.5 rounded-full mt-1">
                    SIDEQUEST
                  </span>
                )}
              </div>
              {round.has_sidequest && (
                <div className="mt-3 pt-3 border-t border-[var(--border)]">
                  <p className="text-xs font-mono text-[var(--text-muted)] tracking-widest mb-1">SIDEQUEST OPDRACHT</p>
                  <p className="text-[var(--text-muted)] text-sm italic">
                    {language === 'en' ? round.sidequest_en : round.sidequest_nl}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-6">
          <Button variant="mint" fullWidth size="lg" onClick={() => router.push(`/lobby/${code}`)}>
            Open lobby →
          </Button>
          <button
            onClick={generate}
            className="w-full py-3 rounded-2xl border border-[var(--border)] text-[var(--text-muted)] text-sm font-semibold hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-all"
          >
            Opnieuw genereren
          </button>
        </div>

      </div>
    </MobileContainer>
  )
}
