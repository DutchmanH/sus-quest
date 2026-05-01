import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isProtectedSuperAdminEmail } from '@/lib/super-admin'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const supabase = await createServiceClient()

  const { data: caller } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!caller?.is_admin) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })

  const { data: targetAuthUser } = await supabase.auth.admin.getUserById(id)
  const targetEmail = targetAuthUser.user?.email ?? null
  if (isProtectedSuperAdminEmail(targetEmail)) {
    await supabase.from('profiles').update({ blocked: false, is_admin: true }).eq('id', id)
    return NextResponse.json({ error: 'Protected super admin kan niet geblokkeerd worden' }, { status: 403 })
  }

  const { data: target } = await supabase
    .from('profiles')
    .select('blocked')
    .eq('id', id)
    .single()

  if (!target) return NextResponse.json({ error: 'Gebruiker niet gevonden' }, { status: 404 })

  const newBlocked = !target.blocked

  const { error } = await supabase
    .from('profiles')
    .update({ blocked: newBlocked })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Bijwerken mislukt' }, { status: 500 })

  if (newBlocked) {
    await supabase.auth.admin.signOut(id, 'others')
  }

  return NextResponse.json({ blocked: newBlocked })
}
