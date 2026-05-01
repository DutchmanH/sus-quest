import { createServiceClient } from '@/lib/supabase/server'
import AdminUsersClient from './AdminUsersClient'
import { isProtectedSuperAdminEmail } from '@/lib/super-admin'

export default async function AdminUsersPage() {
  const supabase = await createServiceClient()

  const [
    { data: profiles },
    { data: { users: authUsers } },
    { data: activeRooms },
  ] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.auth.admin.listUsers(),
    supabase.from('rooms').select('id, host_id').in('status', ['lobby', 'settings', 'generating', 'playing']),
  ])

  const authMap = new Map((authUsers ?? []).map(u => [u.id, u]))

  // Count active rooms per host
  const activeRoomsByUser: Record<string, number> = {}
  ;(activeRooms ?? []).forEach((r: { host_id: string }) => {
    if (r.host_id) {
      activeRoomsByUser[r.host_id] = (activeRoomsByUser[r.host_id] ?? 0) + 1
    }
  })

  const users = (profiles ?? []).map(profile => {
    const auth = authMap.get(profile.id)
    return {
      id: profile.id,
      username: profile.username,
      avatar_color: profile.avatar_color,
      email: auth?.email ?? null,
      games_played: profile.games_played,
      total_score: profile.total_score,
      is_admin: profile.is_admin,
      is_protected_super_admin: isProtectedSuperAdminEmail(auth?.email ?? null),
      blocked: profile.blocked ?? false,
      created_at: profile.created_at,
      last_sign_in: auth?.last_sign_in_at ?? null,
      active_rooms: activeRoomsByUser[profile.id] ?? 0,
    }
  })

  return <AdminUsersClient users={users} />
}
