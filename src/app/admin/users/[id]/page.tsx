import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { isProtectedSuperAdminEmail } from '@/lib/super-admin'

interface UserDetailPageProps {
  params: Promise<{ id: string }>
}

function relativeDate(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function AdminUserDetailPage({ params }: UserDetailPageProps) {
  const { id } = await params
  const supabase = await createServiceClient()

  const [
    { data: profile },
    { data: authUserData },
    { data: history },
    { data: roomPlayerRows },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, avatar_color, is_admin, blocked, games_played, total_score, created_at')
      .eq('id', id)
      .single(),
    supabase.auth.admin.getUserById(id),
    supabase
      .from('game_history')
      .select('id, game_name, player_count, my_score, my_position, is_host, played_at, room_id')
      .eq('user_id', id)
      .order('played_at', { ascending: false })
      .limit(50),
    supabase
      .from('room_players')
      .select('room_id, is_host, joined_at')
      .eq('user_id', id)
      .order('joined_at', { ascending: false })
      .limit(50),
  ])

  if (!profile) notFound()

  const email = authUserData.user?.email ?? null
  const isProtectedSuperAdmin = isProtectedSuperAdminEmail(email)

  const roomIds = [...new Set((roomPlayerRows ?? []).map(row => row.room_id))]
  const { data: rooms } = roomIds.length > 0
    ? await supabase
      .from('rooms')
      .select('id, code, game_name, status, created_at')
      .in('id', roomIds)
    : { data: [] as { id: string; code: string; game_name: string | null; status: string; created_at: string }[] }

  const roomMap = new Map((rooms ?? []).map(room => [room.id, room]))
  const participation = (roomPlayerRows ?? []).map(row => ({
    ...row,
    room: roomMap.get(row.room_id) ?? null,
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-mono tracking-widest text-[var(--text-muted)] uppercase mb-2">Gebruiker details</p>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">{profile.username}</h1>
        </div>
        <Link
          href="/admin/users"
          className="text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          ← terug naar gebruikers
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Games gespeeld', value: profile.games_played, color: 'var(--mint)' },
          { label: 'Totale score', value: `★ ${profile.total_score}`, color: 'var(--gold)' },
          { label: 'Rol', value: profile.is_admin ? 'ADMIN' : 'USER', color: profile.is_admin ? 'var(--mint)' : 'var(--text-muted)' },
          { label: 'Status', value: profile.blocked ? 'GEBLOKKEERD' : 'ACTIEF', color: profile.blocked ? 'var(--coral)' : 'var(--text-muted)' },
        ].map(card => (
          <div key={card.label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5">
            <p className="text-2xl font-bold mb-1" style={{ color: card.color }}>{card.value}</p>
            <p className="text-xs font-mono tracking-widest text-[var(--text-muted)] uppercase">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 mb-8">
        <p className="text-xs font-mono tracking-widest text-[var(--text-muted)] uppercase mb-3">Account</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <p className="text-[var(--text-muted)]">E-mail: <span className="text-[var(--text-primary)] font-mono">{email ?? '—'}</span></p>
          <p className="text-[var(--text-muted)]">Aangemaakt: <span className="text-[var(--text-primary)] font-mono">{relativeDate(profile.created_at)}</span></p>
          <p className="text-[var(--text-muted)]">Protected super admin: <span className="text-[var(--text-primary)] font-mono">{isProtectedSuperAdmin ? 'Ja' : 'Nee'}</span></p>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 mb-8">
        <p className="text-xs font-mono tracking-widest text-[var(--text-muted)] uppercase mb-3">Gespeelde spellen (laatste 50)</p>
        {history && history.length > 0 ? (
          <div className="flex flex-col gap-2">
            {history.map(item => (
              <div key={item.id} className="flex items-center justify-between border border-[var(--border)] rounded-xl px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{item.game_name ?? 'Naamloos spel'}</p>
                  <p className="text-xs text-[var(--text-muted)] font-mono">
                    {relativeDate(item.played_at)} · {item.player_count} spelers · {item.is_host ? 'HOST' : 'GAST'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[var(--gold)]">★ {item.my_score}</p>
                  <p className="text-[10px] font-mono text-[var(--text-muted)]">Positie: {item.my_position}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">Nog geen gespeelde spellen gevonden.</p>
        )}
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5">
        <p className="text-xs font-mono tracking-widest text-[var(--text-muted)] uppercase mb-3">Room deelname (laatste 50)</p>
        {participation.length > 0 ? (
          <div className="flex flex-col gap-2">
            {participation.map((item, index) => (
              <div key={`${item.room_id}-${index}`} className="flex items-center justify-between border border-[var(--border)] rounded-xl px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {item.room?.game_name ?? item.room?.code ?? 'Onbekende room'}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] font-mono">
                    Code: {item.room?.code ?? '—'} · Status: {item.room?.status ?? '—'} · {item.is_host ? 'HOST' : 'GAST'}
                  </p>
                </div>
                <p className="text-[10px] font-mono text-[var(--text-muted)]">{relativeDate(item.joined_at)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">Geen room deelname gevonden.</p>
        )}
      </div>
    </div>
  )
}
