import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

    const { username, avatar_color } = await request.json()

    if (!username?.trim()) {
      return NextResponse.json({ error: 'Gebruikersnaam is verplicht' }, { status: 400 })
    }

    const supabase = await createServiceClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        username: username.trim(),
        avatar_color,
      })
      .eq('id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Account update error:', err)
    return NextResponse.json({ error: 'Opslaan mislukt' }, { status: 500 })
  }
}
