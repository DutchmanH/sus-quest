import { createClient } from '@/lib/supabase/server'

async function getStats() {
  const supabase = await createClient()

  const [
    { count: totalUsers },
    { count: activeRooms },
    { count: gamesPlayed },
    { data: playerCounts },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('status', 'playing'),
    supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('status', 'finished'),
    supabase.from('room_players').select('room_id').eq('is_host', false),
  ])

  const avgPlayers = gamesPlayed && playerCounts
    ? Math.round((playerCounts.length / (gamesPlayed || 1)) * 10) / 10
    : 0

  return { totalUsers: totalUsers ?? 0, activeRooms: activeRooms ?? 0, gamesPlayed: gamesPlayed ?? 0, avgPlayers }
}

export default async function AdminDashboard() {
  const stats = await getStats()

  const cards = [
    { label: 'Totaal gebruikers', value: stats.totalUsers, color: 'var(--mint)' },
    { label: 'Actieve rooms', value: stats.activeRooms, color: 'var(--coral)' },
    { label: 'Gespeelde games', value: stats.gamesPlayed, color: 'var(--gold)' },
    { label: 'Gem. spelers/game', value: stats.avgPlayers, color: 'var(--text-muted)' },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Dashboard</h1>
      <p className="text-[var(--text-muted)] text-sm mb-8 font-mono">Platform statistieken · live</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(card => (
          <div
            key={card.label}
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5"
          >
            <p className="text-3xl font-bold mb-1" style={{ color: card.color }}>{card.value}</p>
            <p className="text-xs font-mono tracking-widest text-[var(--text-muted)] uppercase">{card.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
