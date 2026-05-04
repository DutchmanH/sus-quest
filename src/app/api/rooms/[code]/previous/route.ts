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
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (roomError || !room) return NextResponse.json({ error: 'Room niet gevonden' }, { status: 404 })
  if (room.host_id !== user.id) return NextResponse.json({ error: 'Alleen de host kan teruggaan' }, { status: 403 })
  if (!(room.status === 'playing' || room.status === 'finished')) {
    return NextResponse.json({ error: 'Room is niet actief' }, { status: 409 })
  }
  if (room.current_round <= 1) {
    return NextResponse.json({ error: 'Je zit al op de eerste vraag' }, { status: 409 })
  }

  const previousRoundNum = room.current_round - 1
  const questionsPerCycle = Math.max(1, Number(room.questions_per_cycle ?? 4))
  const isGateRound = (roundNumber: number) => {
    if (roundNumber <= 1) return false
    const indexAfterIntro = roundNumber - 2
    return indexAfterIntro % (questionsPerCycle + 1) === questionsPerCycle
  }

  const [{ data: currentRound }, { data: previousRound, error: previousRoundError }] = await Promise.all([
    supabase
      .from('rounds')
      .select('id')
      .eq('room_id', room.id)
      .eq('round_number', room.current_round)
      .maybeSingle(),
    supabase
      .from('rounds')
      .select('id')
      .eq('room_id', room.id)
      .eq('round_number', previousRoundNum)
      .single(),
  ])

  if (previousRoundError || !previousRound) {
    return NextResponse.json({ error: 'Vorige ronde niet gevonden' }, { status: 404 })
  }

  const updates: PromiseLike<unknown>[] = [
    supabase.from('rounds').update({ status: isGateRound(previousRoundNum) ? 'accuse' : 'active' }).eq('id', previousRound.id),
    supabase.from('rooms').update({ current_round: previousRoundNum, status: 'playing' }).eq('id', room.id),
  ]

  if (currentRound?.id) {
    updates.push(supabase.from('rounds').update({ status: 'pending' }).eq('id', currentRound.id))
  }

  const results = await Promise.all(updates)
  const hasError = results.some((result) => 'error' in (result as object) && (result as { error?: unknown }).error)
  if (hasError) {
    return NextResponse.json({ error: 'Vorige ronde openen mislukt' }, { status: 500 })
  }

  return NextResponse.json({ success: true, current_round: previousRoundNum })
}
