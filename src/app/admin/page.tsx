import { createClient, createServiceClient } from '@/lib/supabase/server'

async function getStats() {
  const supabase = await createServiceClient()

  const [
    { count: totalUsers },
    { count: blockedUsers },
    { count: adminUsers },
    { count: activeRooms },
    { count: lobbyRooms },
    { count: gamesPlayed },
    { count: newUsersWeek },
    { data: playerCounts },
    { data: generationMetrics },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('blocked', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_admin', true),
    supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('status', 'playing'),
    supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('status', 'lobby'),
    supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('status', 'finished'),
    supabase.from('profiles').select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('room_players').select('room_id').eq('is_host', false),
    supabase
      .from('game_generation_metrics')
      .select('total_cost_usd, total_tokens, prompt_tokens, completion_tokens'),
  ])

  const avgPlayers = gamesPlayed && playerCounts
    ? Math.round((playerCounts.length / (gamesPlayed || 1)) * 10) / 10
    : 0

  const generationCostUsd = (generationMetrics ?? []).reduce((sum, row) => sum + Number(row.total_cost_usd ?? 0), 0)
  const generationTokens = (generationMetrics ?? []).reduce((sum, row) => sum + (row.total_tokens ?? 0), 0)
  const generationPromptTokens = (generationMetrics ?? []).reduce((sum, row) => sum + (row.prompt_tokens ?? 0), 0)
  const generationCompletionTokens = (generationMetrics ?? []).reduce((sum, row) => sum + (row.completion_tokens ?? 0), 0)

  return {
    totalUsers: totalUsers ?? 0,
    blockedUsers: blockedUsers ?? 0,
    adminUsers: adminUsers ?? 0,
    activeRooms: activeRooms ?? 0,
    lobbyRooms: lobbyRooms ?? 0,
    gamesPlayed: gamesPlayed ?? 0,
    newUsersWeek: newUsersWeek ?? 0,
    avgPlayers,
    generationCostUsd,
    generationTokens,
    generationPromptTokens,
    generationCompletionTokens,
  }
}

export default async function AdminDashboard() {
  const stats = await getStats()

  return (
    <div>
      <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Dashboard</h1>
      <p className="text-[var(--text-muted)] text-sm mb-8 font-mono">Platform statistieken · live</p>

      <h2 className="text-xs font-mono tracking-widest text-[var(--text-muted)] uppercase mb-3">Gebruikers</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Totaal', value: stats.totalUsers, color: 'var(--mint)' },
          { label: 'Nieuw deze week', value: stats.newUsersWeek, color: 'var(--gold)' },
          { label: 'Admins', value: stats.adminUsers, color: 'var(--text-muted)' },
          { label: 'Geblokkeerd', value: stats.blockedUsers, color: 'var(--coral)' },
        ].map(card => (
          <div key={card.label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5">
            <p className="text-3xl font-bold mb-1" style={{ color: card.color }}>{card.value}</p>
            <p className="text-xs font-mono tracking-widest text-[var(--text-muted)] uppercase">{card.label}</p>
          </div>
        ))}
      </div>

      <h2 className="text-xs font-mono tracking-widest text-[var(--text-muted)] uppercase mb-3">Spellen</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'In lobby', value: stats.lobbyRooms, color: 'var(--text-muted)' },
          { label: 'Actief bezig', value: stats.activeRooms, color: 'var(--coral)' },
          { label: 'Afgerond', value: stats.gamesPlayed, color: 'var(--gold)' },
          { label: 'Gem. spelers/game', value: stats.avgPlayers, color: 'var(--text-muted)' },
        ].map(card => (
          <div key={card.label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5">
            <p className="text-3xl font-bold mb-1" style={{ color: card.color }}>{card.value}</p>
            <p className="text-xs font-mono tracking-widest text-[var(--text-muted)] uppercase">{card.label}</p>
          </div>
        ))}
      </div>

      <h2 className="text-xs font-mono tracking-widest text-[var(--text-muted)] uppercase mt-8 mb-3">AI kosten</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Totaal kosten (USD)', value: `$${stats.generationCostUsd.toFixed(4)}`, color: 'var(--coral)' },
          { label: 'Totaal tokens', value: stats.generationTokens.toLocaleString('nl-NL'), color: 'var(--mint)' },
          { label: 'Prompt tokens', value: stats.generationPromptTokens.toLocaleString('nl-NL'), color: 'var(--text-muted)' },
          { label: 'Completion tokens', value: stats.generationCompletionTokens.toLocaleString('nl-NL'), color: 'var(--gold)' },
        ].map(card => (
          <div key={card.label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5">
            <p className="text-3xl font-bold mb-1" style={{ color: card.color }}>{card.value}</p>
            <p className="text-xs font-mono tracking-widest text-[var(--text-muted)] uppercase">{card.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
