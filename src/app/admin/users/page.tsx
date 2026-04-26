import { createServiceClient } from '@/lib/supabase/server'

export default async function AdminUsersPage() {
  const supabase = await createServiceClient()

  // Get profiles with auth user data
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  // Get auth users for email + last_sign_in
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()

  const authMap = new Map(authUsers.map(u => [u.id, u]))

  return (
    <div>
      <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Gebruikers</h1>
      <p className="text-[var(--text-muted)] text-sm mb-8 font-mono">
        {profiles?.length ?? 0} geregistreerde gebruikers
      </p>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {['Naam', 'E-mail', 'Games', 'Laatste login', 'Admin'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-mono tracking-widest text-[var(--text-muted)] uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profiles?.map(profile => {
              const auth = authMap.get(profile.id)
              const lastLogin = auth?.last_sign_in_at
                ? new Date(auth.last_sign_in_at).toLocaleDateString('nl-NL')
                : '—'

              return (
                <tr key={profile.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-card-hover)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-[var(--bg-primary)]"
                        style={{ background: profile.avatar_color }}
                      >
                        {profile.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {profile.username}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)] font-mono">
                    {auth?.email ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-primary)]">
                    {profile.games_played}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)] font-mono">
                    {lastLogin}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${
                      profile.is_admin
                        ? 'border-[var(--mint)] text-[var(--mint)]'
                        : 'border-[var(--border)] text-[var(--text-muted)]'
                    }`}>
                      {profile.is_admin ? 'ADMIN' : 'USER'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
