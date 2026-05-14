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

  // Mark accusations correct/incorrect
  const markResult = await Promise.all(
    list.map((acc) => {
      const correct = susId ? (acc.accused_player_id === susId) : null
      return supabase.from('accusations').update({ is_correct: correct }).eq('id', acc.id)
    })
  )
  if (markResult.some(r => !!r.error)) {
    return NextResponse.json({ error: 'Score verwerking mislukt' }, { status: 500 })
  }

  // Score other players: +1 correct, +0 wrong (no negatives)
  const accuserUpdates = list
    .filter(acc => susId && acc.accused_player_id === susId)
    .map(acc => supabase.rpc('increment_score', { player_id: acc.accuser_player_id, delta: 1 }))
  if (accuserUpdates.length > 0) {
    const accuserResults = await Promise.all(accuserUpdates)
    if (accuserResults.some(r => !!r.error)) {
      return NextResponse.json({ error: 'Score verwerking mislukt' }, { status: 500 })
    }
  }

  // Sus player scoring: +0 caught by majority, +2 not caught, +3 not chosen at all
  if (susId) {
    const { data: roomPlayers } = await supabase
      .from('room_players')
      .select('id')
      .eq('room_id', room.id)
    const totalVoters = (roomPlayers ?? []).filter(p => p.id !== susId).length
    const votesForSus = list.filter(a => a.accused_player_id === susId).length
    const caughtByMajority = totalVoters > 0 && votesForSus > totalVoters / 2

    let susDelta = 0
    if (!caughtByMajority) {
      susDelta = votesForSus === 0 ? 3 : 2
    }

    if (susDelta > 0) {
      const { error: susScoreError } = await supabase.rpc('increment_score', { player_id: susId, delta: susDelta })
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
