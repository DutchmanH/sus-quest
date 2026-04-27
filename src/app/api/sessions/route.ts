import { NextResponse } from 'next/server'
import { isRoomExpired } from '@/lib/game-expiry'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

    const supabase = await createServiceClient()

    // Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar_color, games_played')
      .eq('id', user.id)
      .single()

    // All room_player rows for this user → get room ids
    const { data: playerRows } = await supabase
      .from('room_players')
      .select('room_id, is_host')
      .eq('user_id', user.id)

    const roomIds = playerRows?.map(r => r.room_id) ?? []

    let sessions: {
      code: string
      game_name: string | null
      status: string
      created_at: string
      is_host: boolean
      player_count: number
    }[] = []

    if (roomIds.length > 0) {
      const { data: rooms } = await supabase
        .from('rooms')
        .select('id, code, game_name, status, created_at, last_activity_at, host_id')
        .in('id', roomIds)
        .neq('status', 'finished')
        .order('created_at', { ascending: false })
        .limit(10)

      if (rooms && rooms.length > 0) {
        const nonExpiredRooms = rooms.filter(room => !isRoomExpired(room))

        const expiredRoomIds = rooms
          .filter(room => isRoomExpired(room))
          .map(room => room.id)

        if (expiredRoomIds.length > 0) {
          await supabase.from('rooms').update({ status: 'finished' }).in('id', expiredRoomIds)
        }

        if (nonExpiredRooms.length === 0) {
          return NextResponse.json({ profile, sessions: [] })
        }

        // Get player counts in one query
        const { data: counts } = await supabase
          .from('room_players')
          .select('room_id')
          .in('room_id', nonExpiredRooms.map(r => r.id))

        const countMap: Record<string, number> = {}
        counts?.forEach(row => {
          countMap[row.room_id] = (countMap[row.room_id] ?? 0) + 1
        })

        sessions = nonExpiredRooms.map(room => ({
          code: room.code,
          game_name: room.game_name ?? null,
          status: room.status,
          created_at: room.created_at,
          is_host: room.host_id === user.id,
          player_count: countMap[room.id] ?? 0,
        }))
      }
    }

    return NextResponse.json({ profile, sessions })
  } catch (err) {
    console.error('Sessions error:', err)
    return NextResponse.json({ error: 'Ophalen mislukt' }, { status: 500 })
  }
}
