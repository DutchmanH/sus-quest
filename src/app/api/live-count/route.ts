import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServiceClient()

    // Get IDs of all rooms currently active
    const { data: activeRooms } = await supabase
      .from('rooms')
      .select('id')
      .in('status', ['lobby', 'playing', 'generating'])

    const roomIds = activeRooms?.map(r => r.id) ?? []

    if (roomIds.length === 0) {
      return NextResponse.json({ count: 0 })
    }

    const { count } = await supabase
      .from('room_players')
      .select('id', { count: 'exact', head: true })
      .in('room_id', roomIds)

    return NextResponse.json({ count: count ?? 0 })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
