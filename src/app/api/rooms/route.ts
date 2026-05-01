import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { DEFAULT_ICON } from '@/lib/avatars'
import { generateFunnyGameName } from '@/lib/funny-game-name'
import { generateRoomCode } from '@/lib/room-code'
import { normalizeSeasonalThemeInput } from '@/lib/seasonal-theme'
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
  let rounds_total = 10
  let play_cycles = 3
  let questions_per_cycle = 4
  let vibe = 'feest'
  let content_level = 'blozen'
  let groep = 'vrienden'
  let game_name = generateFunnyGameName()
  let avatar_icon = DEFAULT_ICON
  let seasonal_theme: string | null = null
  let seasonal_source: string = 'none'
  try {
    const body = await request.json()
    if (body.play_cycles) play_cycles = body.play_cycles
    if (body.questions_per_cycle) questions_per_cycle = body.questions_per_cycle
    if (body.rounds_total) rounds_total = body.rounds_total
    if (body.vibe) vibe = body.vibe
    if (body.content_level) content_level = body.content_level
    if (body.groep) groep = body.groep
    if (typeof body.game_name === 'string' && body.game_name.trim()) game_name = body.game_name.trim().slice(0, 50)
    if (typeof body.avatar_icon === 'string' && body.avatar_icon) avatar_icon = body.avatar_icon
    try {
      const seasonal = normalizeSeasonalThemeInput(body.seasonal_theme)
      seasonal_theme = seasonal.seasonal_theme
      seasonal_source = seasonal.seasonal_source
    } catch {
      return NextResponse.json({ error: 'Ongeldig seasonal theme' }, { status: 400 })
    }
  } catch { /* no body is fine */ }

  play_cycles = Number.isFinite(play_cycles) ? Math.max(1, Math.min(10, Math.floor(play_cycles))) : 3
  questions_per_cycle = Number.isFinite(questions_per_cycle) ? Math.max(1, Math.min(10, Math.floor(questions_per_cycle))) : 4
  const derivedTotalQuestions = play_cycles * questions_per_cycle
  const allowedRounds = [5, 10, 20]
  const nearestAllowedRounds = allowedRounds.reduce((best, candidate) =>
    Math.abs(candidate - derivedTotalQuestions) < Math.abs(best - derivedTotalQuestions) ? candidate : best
  , allowedRounds[0])
  rounds_total = nearestAllowedRounds

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
  let room: { id: string; code: string } | null = null
  let roomError: { message?: string } | null = null

  const insertPayload = {
    code,
    game_name,
    host_id: user.id,
    rounds_total,
    play_cycles,
    questions_per_cycle,
    vibe,
    content_level,
    groep,
    seasonal_theme,
    seasonal_source,
  }

  const insertWithNewColumns = await supabase
    .from('rooms')
    .insert(insertPayload)
    .select()
    .single()

  if (insertWithNewColumns.error) {
    const message = insertWithNewColumns.error.message ?? ''
    const missingColumns =
      message.includes('play_cycles') ||
      message.includes('questions_per_cycle') ||
      message.includes('column')

    if (missingColumns) {
      const fallbackInsert = await supabase
        .from('rooms')
        .insert({
          code,
          game_name,
          host_id: user.id,
          rounds_total,
          vibe,
          content_level,
          groep,
          seasonal_theme,
          seasonal_source,
        })
        .select()
        .single()
      room = fallbackInsert.data as { id: string; code: string } | null
      roomError = fallbackInsert.error
    } else {
      roomError = insertWithNewColumns.error
    }
  } else {
    room = insertWithNewColumns.data as { id: string; code: string } | null
  }

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
      avatar_icon,
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
