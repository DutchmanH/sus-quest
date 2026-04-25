import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateRoomCode } from '@/lib/room-code'
import { AVATAR_COLORS } from '@/types'

export async function POST(request: NextRequest) {
  // Use cookie-aware client to read the user session
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd — herlaad de pagina en log opnieuw in.' }, { status: 401 })
  }

  // Service client for privileged DB writes
  const supabase = await createServiceClient()

  // Read optional settings from body
  let rounds_total = 10, vibe = 'chaos', content_level = 'spicy'
  try {
    const body = await request.json()
    if (body.rounds_total) rounds_total = body.rounds_total
    if (body.vibe) vibe = body.vibe
    if (body.content_level) content_level = body.content_level
  } catch { /* no body is fine */ }

  // Ensure profile exists (trigger may have failed on registration)
  let { data: profile } = await supabase
    .from('profiles')
    .select('username, avatar_color')
    .eq('id', user.id)
    .single()

  if (!profile) {
    const fallbackName = user.email?.split('@')[0] ?? 'Host'
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: user.id, username: fallbackName })
    if (profileError) {
      console.error('Profile create error:', profileError)
      return NextResponse.json(
        { error: `Profiel aanmaken mislukt: ${profileError.message}` },
        { status: 500 }
      )
    }
    profile = { username: fallbackName, avatar_color: AVATAR_COLORS[0] }
  }

  // Generate unique room code
  let code = generateRoomCode()
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await supabase
      .from('rooms').select('id').eq('code', code).single()
    if (!existing) break
    code = generateRoomCode()
  }

  // Create room
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({ code, host_id: user.id, rounds_total, vibe, content_level })
    .select()
    .single()

  if (roomError) {
    console.error('Room insert error:', roomError)
    return NextResponse.json(
      { error: `Room aanmaken mislukt: ${roomError.message}` },
      { status: 500 }
    )
  }

  // Add host as player
  const { data: player, error: playerError } = await supabase
    .from('room_players')
    .insert({
      room_id: room.id,
      user_id: user.id,
      display_name: profile.username,
      avatar_color: profile.avatar_color ?? AVATAR_COLORS[0],
      is_ready: true,
      is_host: true,
    })
    .select()
    .single()

  if (playerError) {
    console.error('Player insert error:', playerError)
    return NextResponse.json(
      { error: `Speler toevoegen mislukt: ${playerError.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ room, player })
}
