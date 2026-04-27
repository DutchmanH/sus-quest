import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const ALLOWED_VIBES = ['bank', 'feest', 'after_midnight', 'onderweg'] as const
const ALLOWED_CONTENT_LEVELS = ['gezellig', 'blozen', 'niemand_veilig'] as const
const ALLOWED_GROUPS = ['vrienden', 'vreemden', 'stelletjes', 'familie'] as const

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const supabase = await createServiceClient()
  const { data: room, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (error || !room) return NextResponse.json({ error: 'Room niet gevonden' }, { status: 404 })
  if (room.host_id !== user.id) return NextResponse.json({ error: 'Alleen host mag dit bekijken' }, { status: 403 })

  return NextResponse.json({ room })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Ongeldige payload' }, { status: 400 })

  const updates: Record<string, string | number> = {}

  if (body.rounds_total !== undefined) {
    if (!Number.isInteger(body.rounds_total) || body.rounds_total < 3 || body.rounds_total > 30) {
      return NextResponse.json({ error: 'Rondes moet tussen 3 en 30 liggen' }, { status: 400 })
    }
    updates.rounds_total = body.rounds_total
  }

  if (body.vibe !== undefined) {
    if (!ALLOWED_VIBES.includes(body.vibe)) {
      return NextResponse.json({ error: 'Ongeldige vibe' }, { status: 400 })
    }
    updates.vibe = body.vibe
  }

  if (body.content_level !== undefined) {
    if (!ALLOWED_CONTENT_LEVELS.includes(body.content_level)) {
      return NextResponse.json({ error: 'Ongeldig content level' }, { status: 400 })
    }
    updates.content_level = body.content_level
  }

  if (body.groep !== undefined) {
    if (!ALLOWED_GROUPS.includes(body.groep)) {
      return NextResponse.json({ error: 'Ongeldige groep' }, { status: 400 })
    }
    updates.groep = body.groep
  }

  if (body.game_name !== undefined) {
    if (typeof body.game_name !== 'string' || !body.game_name.trim()) {
      return NextResponse.json({ error: 'Game naam is verplicht' }, { status: 400 })
    }
    updates.game_name = body.game_name.trim().slice(0, 50)
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Geen wijziging doorgegeven' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, host_id, status')
    .eq('code', code.toUpperCase())
    .single()

  if (roomError || !room) return NextResponse.json({ error: 'Room niet gevonden' }, { status: 404 })
  if (room.host_id !== user.id) return NextResponse.json({ error: 'Alleen host mag dit aanpassen' }, { status: 403 })
  if (room.status !== 'lobby') return NextResponse.json({ error: 'Instellingen alleen in lobby aanpasbaar' }, { status: 409 })

  const { data: updatedRoom, error: updateError } = await supabase
    .from('rooms')
    .update(updates)
    .eq('id', room.id)
    .select('*')
    .single()

  if (updateError) return NextResponse.json({ error: 'Opslaan mislukt' }, { status: 500 })
  return NextResponse.json({ room: updatedRoom })
}
