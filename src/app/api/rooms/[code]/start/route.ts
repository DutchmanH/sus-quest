import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getLatestActivityTimestamp, isGameExpired, isSessionExpired } from '@/lib/game-expiry'

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
    .from('rooms').select('*').eq('code', code.toUpperCase()).single()

  if (roomError || !room) return NextResponse.json({ error: 'Room niet gevonden' }, { status: 404 })
  if (room.host_id !== user.id) return NextResponse.json({ error: 'Alleen de host kan het spel starten' }, { status: 403 })

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
      { error: 'Deze game is verlopen. Start een nieuwe lobby.', code: 'GAME_EXPIRED' },
      { status: 410 }
    )
  }

  if (room.status !== 'lobby') return NextResponse.json({ error: 'Room is niet in lobby' }, { status: 409 })

  const { data: players, error: playersError } = await supabase
    .from('room_players').select('id').eq('room_id', room.id)

  if (playersError || !players?.length) {
    return NextResponse.json({ error: 'Geen spelers gevonden' }, { status: 400 })
  }

  const { data: rounds, error: roundsError } = await supabase
    .from('rounds').select('id, has_sidequest').eq('room_id', room.id).order('round_number')

  if (roundsError || !rounds?.length) {
    return NextResponse.json({ error: 'Geen vragen gevonden — genereer eerst vragen' }, { status: 400 })
  }

  const playerIds = players.map(p => p.id)
  const sidequestRounds = rounds.filter(r => r.has_sidequest)
  const firstRound = rounds[0]

  await Promise.all([
    // Assign a random player to each sidequest round
    ...sidequestRounds.map(round => {
      const randomPlayer = playerIds[Math.floor(Math.random() * playerIds.length)]
      return supabase.from('rounds').update({ sidequest_player_id: randomPlayer }).eq('id', round.id)
    }),
    supabase.from('rounds').update({ status: 'active' }).eq('id', firstRound.id),
    supabase.from('rooms').update({ status: 'playing', current_round: 1 }).eq('id', room.id),
  ])

  return NextResponse.json({ success: true })
}
