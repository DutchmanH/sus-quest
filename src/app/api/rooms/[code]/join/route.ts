import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getLatestActivityTimestamp, isGameExpired, isSessionExpired } from '@/lib/game-expiry'
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

    // Find room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room niet gevonden' }, { status: 404 })
    }

    const { data: latestPlayer } = await supabase
      .from('room_players')
      .select('joined_at')
      .eq('room_id', room.id)
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const { data: latestRound } = await supabase
      .from('rounds')
      .select('created_at')
      .eq('room_id', room.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const latestActivityAt = getLatestActivityTimestamp(room.created_at, latestPlayer?.joined_at, latestRound?.created_at)
    const isExpired = isSessionExpired(room.created_at) || isGameExpired(latestActivityAt)

    if (isExpired) {
      await supabase.from('rooms').update({ status: 'finished' }).eq('id', room.id)
      return NextResponse.json(
        { error: 'Deze game is verlopen. Laat de host een nieuwe game starten.', code: 'GAME_EXPIRED' },
        { status: 410 }
      )
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
        avatar_icon: typeof avatarIcon === 'string' && avatarIcon ? avatarIcon : null,
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
