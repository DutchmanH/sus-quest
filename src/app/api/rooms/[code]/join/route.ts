import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isRoomExpired } from '@/lib/game-expiry'
import { AVATAR_COLORS } from '@/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const { displayName, avatarColor: requestedColor, avatarIcon } = await request.json()

    if (!displayName?.trim()) {
      return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room niet gevonden' }, { status: 404 })
    }

    if (isRoomExpired(room)) {
      await supabase.from('rooms').update({ status: 'finished' }).eq('id', room.id)
      return NextResponse.json(
        { error: 'Deze game is verlopen. Laat de host een nieuwe game starten.', code: 'GAME_EXPIRED' },
        { status: 410 }
      )
    }

    if (room.status !== 'lobby') {
      return NextResponse.json({ error: 'Game is al gestart' }, { status: 400 })
    }

    const avatarColor = (AVATAR_COLORS as readonly string[]).includes(requestedColor)
      ? requestedColor
      : AVATAR_COLORS[0]

    const { data: { user } } = await supabase.auth.getUser()

    const { data: player, error: playerError } = await supabase
      .from('room_players')
      .insert({
        room_id: room.id,
        user_id: user?.id ?? null,
        display_name: displayName.trim(),
        avatar_color: avatarColor,
        avatar_icon: typeof avatarIcon === 'string' && avatarIcon ? avatarIcon : null,
        is_ready: false,
        is_host: false,
      })
      .select()
      .single()

    if (playerError) throw playerError

    // Trigger on room_players handles last_activity_at update
    return NextResponse.json({ room, player })
  } catch (err) {
    console.error('Join room error:', err)
    return NextResponse.json({ error: 'Joinen mislukt' }, { status: 500 })
  }
}
