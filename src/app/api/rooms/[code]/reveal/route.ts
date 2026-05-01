import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const supabase = await createServiceClient()
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, host_id, status, current_round, rounds_total, play_cycles, questions_per_cycle')
    .eq('code', code.toUpperCase())
    .single()

  if (roomError || !room) return NextResponse.json({ error: 'Room niet gevonden' }, { status: 404 })
  if (room.host_id !== user.id) return NextResponse.json({ error: 'Alleen de host kan reveal starten' }, { status: 403 })
  if (room.status !== 'playing') return NextResponse.json({ error: 'Room is niet actief' }, { status: 409 })

  const { data: currentRound, error: currentRoundError } = await supabase
    .from('rounds')
    .select('id, status, round_number, sidequest_player_id')
    .eq('room_id', room.id)
    .eq('round_number', room.current_round)
    .single()

  if (currentRoundError || !currentRound) {
    return NextResponse.json({ error: 'Huidige ronde niet gevonden' }, { status: 404 })
  }
  if (!(currentRound.status === 'accuse' || currentRound.status === 'active')) {
    return NextResponse.json({ error: 'Ronde kan niet naar reveal' }, { status: 409 })
  }

  const { data: accusations, error: accusationsError } = await supabase
    .from('accusations')
    .select('id, accuser_player_id, accused_player_id')
    .eq('round_id', currentRound.id)

  if (accusationsError) {
    return NextResponse.json({ error: 'Beschuldigingen ophalen mislukt' }, { status: 500 })
  }

  const list = accusations ?? []
  let susId = currentRound.sidequest_player_id
  if (!susId) {
    const { data: fallbackRound } = await supabase
      .from('rounds')
      .select('sidequest_player_id')
      .eq('room_id', room.id)
      .lt('round_number', currentRound.round_number)
      .not('sidequest_player_id', 'is', null)
      .order('round_number', { ascending: false })
      .limit(1)
      .maybeSingle()
    susId = fallbackRound?.sidequest_player_id ?? null
  }
  const questionsPerCycle = Math.max(1, Number(room.questions_per_cycle ?? 4))
  const playCycles = Math.max(1, Number(room.play_cycles ?? Math.ceil((room.rounds_total ?? 10) / questionsPerCycle)))
  const indexAfterIntro = Math.max(0, room.current_round - 2)
  const currentCycleIndex = Math.min(playCycles - 1, Math.max(0, Math.floor(indexAfterIntro / (questionsPerCycle + 1))))
  const earlyBonus = Math.max(0, playCycles - currentCycleIndex - 1)

  const scoreResult = await Promise.all(
    list.map((acc) => {
      const correct = susId ? (acc.accused_player_id === susId) : null
      const delta = susId ? (correct ? (1 + earlyBonus) : -1) : 0
      return Promise.all([
        supabase.from('accusations').update({ is_correct: correct }).eq('id', acc.id),
        supabase.rpc('increment_score', { player_id: acc.accuser_player_id, delta }),
      ])
    })
  )
  const hadScoreError = scoreResult.some(batch => batch.some(step => !!step.error))
  if (hadScoreError) {
    return NextResponse.json({ error: 'Score verwerking mislukt' }, { status: 500 })
  }

  if (susId) {
    const wasCaught = list.some((a) => a.accused_player_id === susId)
    if (!wasCaught) {
      const { error: susScoreError } = await supabase.rpc('increment_score', { player_id: susId, delta: 1 })
      if (susScoreError) {
        return NextResponse.json({ error: 'Sidequest score verwerken mislukt' }, { status: 500 })
      }
    }
  }

  const { error: roundError } = await supabase
    .from('rounds')
    .update({ status: 'reveal' })
    .eq('id', currentRound.id)
    .in('status', ['active', 'accuse'])

  if (roundError) {
    return NextResponse.json({ error: 'Naar reveal fase gaan mislukt' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
