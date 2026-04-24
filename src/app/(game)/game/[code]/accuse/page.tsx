'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { PlayerRow } from '@/components/game/PlayerRow'
import { useRoom } from '@/hooks/useRoom'
import { useGameStore } from '@/store/gameStore'
import { createClient } from '@/lib/supabase/client'

interface AccusePageProps {
  params: Promise<{ code: string }>
}

export default function AccusePage({ params }: AccusePageProps) {
  const { code } = use(params)
  const router = useRouter()
  const { playerId } = useGameStore()
  const { room, players, currentRound, loading } = useRoom(code)
  const [selected, setSelected] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (currentRound?.status === 'reveal') {
      router.push(`/game/${code}/reveal`)
    }
  }, [currentRound?.status, code, router])

  async function handleAccuse() {
    if (!selected || !currentRound || !playerId || submitted) return
    setSubmitted(true)
    const supabase = createClient()
    await supabase.from('accusations').insert({
      room_id: room!.id,
      round_id: currentRound.id,
      accuser_player_id: playerId,
      accused_player_id: selected,
    })
  }

  const me = players.find(p => p.id === playerId)
  const isHost = me?.is_host ?? false
  const otherPlayers = players.filter(p => p.id !== playerId)

  async function moveToReveal() {
    if (!currentRound || !isHost) return
    const supabase = createClient()

    // Resolve accusations
    const { data: accusations } = await supabase
      .from('accusations')
      .select('*')
      .eq('round_id', currentRound.id)

    // Update is_correct for each accusation
    for (const acc of accusations ?? []) {
      const correct = acc.accused_player_id === currentRound.sidequest_player_id
      await supabase.from('accusations').update({ is_correct: correct }).eq('id', acc.id)

      // Update scores
      const delta = correct ? 1 : -1
      await supabase.rpc('increment_score', { player_id: acc.accuser_player_id, delta })
    }

    // Give sidequest player their point (if succeeded = not caught)
    if (currentRound.sidequest_player_id) {
      const wasCaught = accusations?.some(a => a.accused_player_id === currentRound.sidequest_player_id && a.is_correct)
      if (!wasCaught) {
        await supabase.rpc('increment_score', { player_id: currentRound.sidequest_player_id, delta: 1 })
      }
    }

    await supabase.from('rounds').update({ status: 'reveal' }).eq('id', currentRound.id)
  }

  if (loading || !currentRound) {
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
        <div className="mb-6">
          <span className="px-3 py-1 rounded-full text-xs font-mono tracking-widest border border-[var(--coral)] text-[var(--coral)]">
            ⚑ ACCUSE · KIES 1
          </span>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold leading-tight">
            you sure<br />
            <span className="italic text-[var(--coral)]">about that?</span>
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            fout? jij drinkt. geen druk 💅
          </p>
        </div>

        {/* Player list */}
        <div className="flex flex-col gap-2 flex-1">
          {otherPlayers.map(player => (
            <PlayerRow
              key={player.id}
              player={player}
              selectable={!submitted}
              selected={selected === player.id}
              onSelect={() => !submitted && setSelected(player.id)}
            />
          ))}
        </div>

        {/* CTAs */}
        <div className="py-6 flex flex-col gap-3">
          {!submitted ? (
            <Button
              variant="coral"
              fullWidth
              size="lg"
              disabled={!selected}
              onClick={handleAccuse}
            >
              Call the sus! 🚨
            </Button>
          ) : (
            <div className="text-center py-3 text-[var(--text-muted)] text-sm font-mono">
              ✓ beschuldiging ingediend — wacht op anderen
            </div>
          )}

          {isHost && (
            <Button variant="dark" fullWidth size="md" onClick={moveToReveal}>
              → Reveal (host only)
            </Button>
          )}
        </div>
      </div>
    </MobileContainer>
  )
}
