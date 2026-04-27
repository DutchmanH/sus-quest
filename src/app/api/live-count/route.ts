import { NextResponse } from 'next/server'
import { PLAYER_ACTIVE_WINDOW_MS } from '@/lib/game-config'
import { isSessionExpired } from '@/lib/game-expiry'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServiceClient()

    // Get IDs of all rooms currently active
    const { data: activeRooms } = await supabase
      .from('rooms')
      .select('id, created_at, status')
      .in('status', ['lobby', 'playing', 'generating'])

    const roomIds = activeRooms?.map(r => r.id) ?? []

    if (roomIds.length === 0) {
      return NextResponse.json({ count: 0, activeCount: 0, inactiveCount: 0 })
    }

    const { data: players } = await supabase
      .from('room_players')
      .select('room_id, joined_at')
      .in('room_id', roomIds)

    const roomById = new Map((activeRooms ?? []).map(room => [room.id, room]))
    const now = Date.now()

    let activeCount = 0
    let inactiveCount = 0

    for (const player of players ?? []) {
      const room = roomById.get(player.room_id)
      if (!room) continue

      const sessionExpired = isSessionExpired(room.created_at)
      const joinedAt = player.joined_at ? Date.parse(player.joined_at) : 0
      const playerActive = joinedAt > 0 && now - joinedAt <= PLAYER_ACTIVE_WINDOW_MS

      if (!sessionExpired && playerActive) {
        activeCount += 1
      } else {
        inactiveCount += 1
      }
    }

    const expiredRoomIds = (activeRooms ?? [])
      .filter(room => isSessionExpired(room.created_at) && room.status !== 'finished')
      .map(room => room.id)
    if (expiredRoomIds.length > 0) {
      await supabase.from('rooms').update({ status: 'finished' }).in('id', expiredRoomIds)
    }

    return NextResponse.json({ count: activeCount, activeCount, inactiveCount })
  } catch {
    return NextResponse.json({ count: 0, activeCount: 0, inactiveCount: 0 })
  }
}
