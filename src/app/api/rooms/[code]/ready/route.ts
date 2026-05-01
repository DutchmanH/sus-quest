import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const { playerId } = await request.json()

    if (!playerId || typeof playerId !== 'string') {
      return NextResponse.json({ error: 'Speler ID ontbreekt' }, { status: 400 })
    }

    const supabase = await createServiceClient()
    const upperCode = code.toUpperCase()

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, code, status')
      .eq('code', upperCode)
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room niet gevonden' }, { status: 404 })
    }

    const { data: player, error: playerError } = await supabase
      .from('room_players')
      .select('id, is_ready')
      .eq('id', playerId)
      .eq('room_id', room.id)
      .single()

    if (playerError || !player) {
      return NextResponse.json({ error: 'Speler niet gevonden in deze room' }, { status: 404 })
    }

    const nextReady = !player.is_ready
    const { error: updateError } = await supabase
      .from('room_players')
      .update({ is_ready: nextReady })
      .eq('id', player.id)
      .eq('room_id', room.id)

    if (updateError) {
      return NextResponse.json({ error: 'Ready status updaten mislukt' }, { status: 500 })
    }

    return NextResponse.json({ success: true, is_ready: nextReady })
  } catch (err) {
    console.error('Toggle ready error:', err)
    return NextResponse.json({ error: 'Ready status updaten mislukt' }, { status: 500 })
  }
}
