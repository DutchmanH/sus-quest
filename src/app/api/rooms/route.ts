import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateRoomCode } from '@/lib/room-code'
import { AVATAR_COLORS } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
    }

    // Read optional settings from body
    let rounds_total = 10, vibe = 'chaos', content_level = 'spicy'
    try {
      const body = await request.json()
      if (body.rounds_total) rounds_total = body.rounds_total
      if (body.vibe) vibe = body.vibe
      if (body.content_level) content_level = body.content_level
    } catch { /* no body is fine */ }

    // Generate unique room code
    let code = generateRoomCode()
    let attempts = 0
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from('rooms')
        .select('id')
        .eq('code', code)
        .single()
      if (!existing) break
      code = generateRoomCode()
      attempts++
    }

    // Create room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({ code, host_id: user.id, rounds_total, vibe, content_level })
      .select()
      .single()

    if (roomError) throw roomError

    // Add host as player
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()

    const { data: player, error: playerError } = await supabase
      .from('room_players')
      .insert({
        room_id: room.id,
        user_id: user.id,
        display_name: profile?.username ?? 'Host',
        avatar_color: AVATAR_COLORS[0],
        is_ready: true,
        is_host: true,
      })
      .select()
      .single()

    if (playerError) throw playerError

    return NextResponse.json({ room, player })
  } catch (err) {
    console.error('Create room error:', err)
    return NextResponse.json({ error: 'Room aanmaken mislukt' }, { status: 500 })
  }
}
