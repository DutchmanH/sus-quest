import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isRoomExpired } from '@/lib/game-expiry'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const supabase = await createServiceClient()

  const { data: room, error: roomError } = await supabase
    .from('rooms').select('*').eq('code', code.toUpperCase()).single()

  if (roomError || !room) return NextResponse.json({ error: 'Room niet gevonden' }, { status: 404 })
  if (room.host_id !== user.id) return NextResponse.json({ error: 'Alleen de host kan vragen bekijken' }, { status: 403 })

  if (isRoomExpired(room)) {
    await supabase.from('rooms').update({ status: 'finished' }).eq('id', room.id)
    return NextResponse.json({ error: 'Deze game is verlopen.', code: 'GAME_EXPIRED' }, { status: 410 })
  }

  const { data: rounds, error } = await supabase
    .from('rounds').select('*').eq('room_id', room.id).order('round_number')

  if (error) return NextResponse.json({ error: 'Ophalen mislukt' }, { status: 500 })

  return NextResponse.json({ rounds: rounds ?? [] })
}
