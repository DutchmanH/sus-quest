import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { ContentLevel, Vibe } from '@/types'

const ALLOWED_ROUNDS = [5, 10, 20] as const
const ALLOWED_VIBES: Vibe[] = ['chill', 'chaos', 'awkward', 'spicy', 'comp']
const ALLOWED_CONTENT: ContentLevel[] = ['safe', 'spicy', 'extra_spicy']

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

    const { code } = await params
    const body = await request.json()
    const rounds_total = Number(body?.rounds_total)
    const vibe = body?.vibe as Vibe
    const content_level = body?.content_level as ContentLevel

    if (!ALLOWED_ROUNDS.includes(rounds_total as (typeof ALLOWED_ROUNDS)[number])) {
      return NextResponse.json({ error: 'Ongeldig aantal rondes' }, { status: 400 })
    }
    if (!ALLOWED_VIBES.includes(vibe)) {
      return NextResponse.json({ error: 'Ongeldige vibe' }, { status: 400 })
    }
    if (!ALLOWED_CONTENT.includes(content_level)) {
      return NextResponse.json({ error: 'Ongeldige content instelling' }, { status: 400 })
    }

    const supabase = await createServiceClient()
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, host_id, status')
      .eq('code', code.toUpperCase())
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room niet gevonden' }, { status: 404 })
    }
    if (room.host_id !== user.id) {
      return NextResponse.json({ error: 'Alleen de host mag dit aanpassen' }, { status: 403 })
    }
    if (room.status !== 'lobby') {
      return NextResponse.json({ error: 'Aanpassen kan alleen in de lobby' }, { status: 400 })
    }

    const { data: updatedRoom, error: updateError } = await supabase
      .from('rooms')
      .update({ rounds_total, vibe, content_level })
      .eq('id', room.id)
      .select('*')
      .single()

    if (updateError) throw updateError

    return NextResponse.json({ room: updatedRoom })
  } catch (err) {
    console.error('Update room settings error:', err)
    return NextResponse.json({ error: 'Aanpassen mislukt' }, { status: 500 })
  }
}
