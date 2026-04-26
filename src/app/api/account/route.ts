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

    const safeAvatarColor = typeof avatar_color === 'string' && avatar_color.trim().length > 0
      ? avatar_color
      : '#5DEDD4'

    const supabase = await createServiceClient()
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        username: username.trim(),
        avatar_color: safeAvatarColor,
      }, { onConflict: 'id' })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Deze gebruikersnaam bestaat al' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Account update error:', err)
    return NextResponse.json({ error: 'Opslaan mislukt' }, { status: 500 })
  }
}
