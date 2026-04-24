import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, username')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/')

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Admin header */}
      <header className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-[var(--mint)] font-bold font-mono tracking-wider text-lg">
            SusQuest
          </Link>
          <nav className="flex gap-4">
            <Link
              href="/admin"
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] font-mono tracking-wider"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/users"
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] font-mono tracking-wider"
            >
              Gebruikers
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[var(--text-muted)]">
            {profile.username} · ADMIN
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
