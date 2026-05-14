import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const raw = (await params).code
  const code = typeof raw === 'string' ? raw.trim() : ''
  if (!code) {
    return NextResponse.json({ error: 'Roomcode ontbreekt' }, { status: 400 })
  }

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const supabase = await createServiceClient()
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, host_id, status')
    .eq('code', code.toUpperCase())
    .single()

  if (roomError || !room) return NextResponse.json({ error: 'Room niet gevonden' }, { status: 404 })
  if (room.host_id !== user.id) return NextResponse.json({ error: 'Alleen de host kan afsluiten' }, { status: 403 })
  if (room.status === 'finished') return NextResponse.json({ success: true })

  const { error: closeError } = await supabase
    .from('rooms')
    .update({ status: 'finished' })
    .eq('id', room.id)

  if (closeError) return NextResponse.json({ error: 'Afsluiten mislukt' }, { status: 500 })
  return NextResponse.json({ success: true })
}
