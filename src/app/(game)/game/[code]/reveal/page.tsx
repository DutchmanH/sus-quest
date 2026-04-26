'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { useRoom } from '@/hooks/useRoom'
import { useGameStore } from '@/store/gameStore'
import { createClient } from '@/lib/supabase/client'
import type { Accusation } from '@/types'

interface RevealPageProps {
  params: Promise<{ code: string }>
}

export default function RevealPage({ params }: RevealPageProps) {
  const { code } = use(params)
  const router = useRouter()
  const { playerId, language } = useGameStore()
  const { room, players, currentRound, loading } = useRoom(code)
  const [accusations, setAccusations] = useState<Accusation[]>([])

  useEffect(() => {
    if (!currentRound) return
    const supabase = createClient()
    supabase
      .from('accusations')
      .select('*')
      .eq('round_id', currentRound.id)
      .then(({ data }) => setAccusations((data ?? []) as Accusation[]))
  }, [currentRound])

  const me = players.find(p => p.id === playerId)
  const isHost = me?.is_host ?? false

  async function nextRound() {
    if (!room || !currentRound || !isHost) return
    const supabase = createClient()

    const nextRoundNum = room.current_round + 1

    if (nextRoundNum > room.rounds_total) {
      // Game over: mark round done and room finished in parallel
      await Promise.all([
        supabase.from('rounds').update({ status: 'done' }).eq('id', currentRound.id),
        supabase.from('rooms').update({ status: 'finished' }).eq('id', room.id),
      ])
      router.push(`/game/${code}/end`)
      return
    }

    // Fetch next round and mark current done in parallel
    const [, { data: nextRoundRow }] = await Promise.all([
      supabase.from('rounds').update({ status: 'done' }).eq('id', currentRound.id),
      supabase.from('rounds').select('id').eq('room_id', room.id).eq('round_number', nextRoundNum).single(),
    ])

    if (nextRoundRow) {
      // Activate next round and update room counter in parallel
      await Promise.all([
        supabase.from('rounds').update({ status: 'active' }).eq('id', nextRoundRow.id),
        supabase.from('rooms').update({ current_round: nextRoundNum }).eq('id', room.id),
      ])
    }

    router.push(`/game/${code}`)
  }

  if (loading || !currentRound || !room) {
    return (
      <MobileContainer>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--mint)] border-t-transparent rounded-full animate-spin" />
        </div>
      </MobileContainer>
    )
  }

  const susPlayer = players.find(p => p.id === currentRound.sidequest_player_id)
  const hasSus = !!susPlayer

  return (
    <MobileContainer>
      <div className="flex flex-col min-h-screen px-5 pt-5">
        {/* Header */}
        <div className="mb-6">
          <span className="px-3 py-1 rounded-full text-xs font-mono tracking-widest border border-[var(--border)] text-[var(--text-muted)]">
            RONDE {room.current_round} · REVEAL
          </span>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold leading-tight">
            something <span className="italic text-[var(--mint)]">felt</span>
            <br />
            off <span className="text-[var(--text-muted)]">tbh…</span>
          </h1>
        </div>

        {/* Sus reveal card */}
        <div className="bg-[var(--mint)] rounded-3xl p-5 mb-4">
          <p className="text-xs font-mono tracking-widest text-[var(--bg-primary)] opacity-70 mb-3">
            THE SUS WAS
          </p>
          {hasSus ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <Avatar name={susPlayer!.display_name} color={susPlayer!.avatar_color} size="lg" />
                <div>
                  <p className="text-xl font-bold text-[var(--bg-primary)]">{susPlayer!.display_name}</p>
                  <p className="text-xs font-mono text-[var(--bg-primary)] opacity-70">MISSIE GELUKT · +1</p>
                </div>
              </div>
              <div className="bg-[var(--bg-primary)] bg-opacity-20 rounded-2xl px-4 py-3">
                <p className="text-[var(--bg-primary)] italic text-sm">
                  &ldquo;{language === 'en' ? currentRound.sidequest_en : currentRound.sidequest_nl}&rdquo;
                </p>
              </div>
            </>
          ) : (
            <p className="text-[var(--bg-primary)] font-semibold">Geen sus deze ronde.</p>
          )}
        </div>

        {/* Accusations */}
        {accusations.length > 0 && (
          <div className="bg-[var(--bg-card)] rounded-3xl p-5 mb-4">
            <p className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-3">⚑ BESCHULDIGINGEN</p>
            <div className="flex flex-col gap-2">
              {accusations.map(acc => {
                const accuser = players.find(p => p.id === acc.accuser_player_id)
                const accused = players.find(p => p.id === acc.accused_player_id)
                return (
                  <div key={acc.id} className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-primary)]">
                      {accuser?.display_name} → {accused?.display_name}
                    </span>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${
                      acc.is_correct
                        ? 'border-[var(--mint)] text-[var(--mint)]'
                        : 'border-[var(--coral)] text-[var(--coral)]'
                    }`}>
                      {acc.is_correct ? 'BOOM · +1' : 'NEIN · -1'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex-1" />

        {/* CTA */}
        <div className="py-6">
          {isHost ? (
            <Button variant="mint" fullWidth size="lg" onClick={nextRound}>
              Volgende →
            </Button>
          ) : (
            <p className="text-center text-[var(--text-muted)] text-sm font-mono">
              wacht op de host…
            </p>
          )}
        </div>
      </div>
    </MobileContainer>
  )
}
