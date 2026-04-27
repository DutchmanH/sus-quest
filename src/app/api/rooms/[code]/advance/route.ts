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
    .select('id, host_id, status, current_round, rounds_total')
    .eq('code', code.toUpperCase())
    .single()

  if (roomError || !room) return NextResponse.json({ error: 'Room niet gevonden' }, { status: 404 })
  if (room.host_id !== user.id) return NextResponse.json({ error: 'Alleen de host kan doorgaan' }, { status: 403 })
  if (!(room.status === 'playing' || room.status === 'finished')) {
    return NextResponse.json({ error: 'Room is niet actief' }, { status: 409 })
  }

  const { data: currentRound } = await supabase
    .from('rounds')
    .select('id')
    .eq('room_id', room.id)
    .eq('round_number', room.current_round)
    .maybeSingle()

  const nextRoundNum = room.current_round + 1

  if (nextRoundNum > room.rounds_total) {
    const updates: PromiseLike<unknown>[] = [
      supabase.from('rooms').update({ status: 'finished' }).eq('id', room.id),
    ]
    if (currentRound?.id) {
      updates.push(supabase.from('rounds').update({ status: 'done' }).eq('id', currentRound.id))
    }
    const results = await Promise.all(updates)
    const hasError = results.some((result) => 'error' in (result as object) && (result as { error?: unknown }).error)
    if (hasError) {
      return NextResponse.json({ error: 'Spel afronden mislukt' }, { status: 500 })
    }
    return NextResponse.json({ success: true, finished: true })
  }

  const { data: nextRound, error: nextRoundError } = await supabase
    .from('rounds')
    .select('id')
    .eq('room_id', room.id)
    .eq('round_number', nextRoundNum)
    .single()

  if (nextRoundError || !nextRound) {
    return NextResponse.json({ error: 'Volgende ronde niet gevonden' }, { status: 404 })
  }

  const updates: PromiseLike<unknown>[] = [
    supabase.from('rounds').update({ status: 'active' }).eq('id', nextRound.id),
    supabase.from('rooms').update({ current_round: nextRoundNum, status: 'playing' }).eq('id', room.id),
  ]
  if (currentRound?.id) {
    updates.push(supabase.from('rounds').update({ status: 'done' }).eq('id', currentRound.id))
  }

  const results = await Promise.all(updates)
  const hasError = results.some((result) => 'error' in (result as object) && (result as { error?: unknown }).error)
  if (hasError) {
    return NextResponse.json({ error: 'Volgende ronde starten mislukt' }, { status: 500 })
  }

  return NextResponse.json({ success: true, finished: false, current_round: nextRoundNum })
}
