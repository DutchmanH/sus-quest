import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { AVATAR_COLORS } from '@/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const { displayName, avatarColor: requestedColor } = await request.json()

    if (!displayName?.trim()) {
      return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    // Find room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room niet gevonden' }, { status: 404 })
    }

    if (room.status !== 'lobby') {
      return NextResponse.json({ error: 'Game is al gestart' }, { status: 400 })
    }

    // Use chosen color, or fall back to sequential assignment
    const avatarColor = (AVATAR_COLORS as readonly string[]).includes(requestedColor)
      ? requestedColor
      : (() => {
          // count existing to assign sequentially
          return AVATAR_COLORS[0]
        })()

    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser()

    const { data: player, error: playerError } = await supabase
      .from('room_players')
      .insert({
        room_id: room.id,
        user_id: user?.id ?? null,
        display_name: displayName.trim(),
        avatar_color: avatarColor,
        is_ready: false,
        is_host: false,
      })
      .select()
      .single()

    if (playerError) throw playerError

    return NextResponse.json({ room, player })
  } catch (err) {
    console.error('Join room error:', err)
    return NextResponse.json({ error: 'Joinen mislukt' }, { status: 500 })
  }
}
