import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { isProtectedSuperAdminEmail } from '@/lib/super-admin'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) redirect('/login')

  const supabase = await createServiceClient()
  let { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, username')
    .eq('id', user.id)
    .single()

  if (isProtectedSuperAdminEmail(user.email) && profile && !profile.is_admin) {
    await supabase.from('profiles').update({ is_admin: true, blocked: false }).eq('id', user.id)
    profile = { ...profile, is_admin: true }
  }

  if (!profile?.is_admin) redirect('/')

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <header className="border-b border-[var(--border)] px-4 py-3 md:px-6 md:py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 md:gap-6">
            <Link href="/dashboard" className="text-[var(--mint)] font-bold font-mono tracking-wider text-base md:text-lg">
              SusQuest
            </Link>
            <span className="text-[var(--border)] text-sm">/</span>
            <span className="text-xs font-mono tracking-widest text-[var(--text-muted)] uppercase">Admin</span>
          </div>

          <div className="flex items-center gap-3 text-xs md:text-sm">
            <span className="text-xs font-mono px-2 py-0.5 rounded-full border border-[var(--mint)] text-[var(--mint)]">
              ADMIN
            </span>
            <span className="text-[var(--text-muted)] font-mono truncate max-w-[120px] md:max-w-none">
              {profile.username}
            </span>
            <Link
              href="/dashboard"
              className="font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
            >
              ← terug
            </Link>
          </div>
        </div>

        <nav className="mt-3 -mx-1 px-1 flex gap-2 overflow-x-auto whitespace-nowrap md:mt-4 md:gap-1 md:overflow-visible">
            {[
              { href: '/admin', label: 'Dashboard' },
              { href: '/admin/users', label: 'Gebruikers' },
              { href: '/admin/games', label: 'Spellen' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-lg font-mono tracking-wider transition-colors border border-transparent hover:border-[var(--border)]"
              >
                {label}
              </Link>
            ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-8">
        {children}
      </main>
    </div>
  )
}
