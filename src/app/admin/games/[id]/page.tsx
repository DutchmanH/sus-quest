import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'

interface AdminGameDetailPageProps {
  params: Promise<{ id: string }>
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('nl-NL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function AdminGameDetailPage({ params }: AdminGameDetailPageProps) {
  const { id } = await params
  const supabase = await createServiceClient()

  const [
    { data: room },
    { data: rounds },
    { data: players },
    { data: generationMetrics },
  ] = await Promise.all([
    supabase
      .from('rooms')
      .select('id, code, game_name, status, mode, language, rounds_total, current_round, vibe, content_level, groep, seasonal_theme, seasonal_source, created_at, last_activity_at, host_id')
      .eq('id', id)
      .single(),
    supabase
      .from('rounds')
      .select('id, round_number, status, main_question_nl, main_question_en, has_sidequest, sidequest_nl, sidequest_en, fake_task_nl, fake_task_en, sidequest_player_id, created_at')
      .eq('room_id', id)
      .order('round_number', { ascending: true }),
    supabase
      .from('room_players')
      .select('id, display_name, is_host, score')
      .eq('room_id', id),
    supabase
      .from('game_generation_metrics')
      .select('model, prompt_tokens, completion_tokens, total_tokens, total_cost_usd, created_at')
      .eq('room_id', id)
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  if (!room) notFound()

  const { data: hostProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', room.host_id)
    .single()

  const playerMap = new Map((players ?? []).map(p => [p.id, p]))
  const latestMetric = generationMetrics?.[0] ?? null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-mono tracking-widest text-[var(--text-muted)] uppercase mb-2">Spel details</p>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            {room.game_name ?? `Room ${room.code}`}
          </h1>
          <p className="text-sm text-[var(--text-muted)] font-mono mt-1">
            Code: {room.code} · Status: {room.status.toUpperCase()}
          </p>
        </div>
        <Link
          href="/admin/games"
          className="text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          ← terug naar spellen
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Host', value: hostProfile?.username ?? '—', color: 'var(--mint)' },
          { label: 'Spelers', value: String((players ?? []).length), color: 'var(--text-primary)' },
          { label: 'Ronde', value: `${room.current_round}/${room.rounds_total}`, color: 'var(--gold)' },
          { label: 'Modus', value: room.mode === 'multiplayer' ? 'MULTI' : 'SINGLE', color: 'var(--text-muted)' },
        ].map(card => (
          <div key={card.label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5">
            <p className="text-2xl font-bold mb-1" style={{ color: card.color }}>{card.value}</p>
            <p className="text-xs font-mono tracking-widest text-[var(--text-muted)] uppercase">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 mb-8">
        <p className="text-xs font-mono tracking-widest text-[var(--text-muted)] uppercase mb-3">Instellingen</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <p className="text-[var(--text-muted)]">Language: <span className="text-[var(--text-primary)] font-mono">{room.language}</span></p>
          <p className="text-[var(--text-muted)]">Vibe: <span className="text-[var(--text-primary)] font-mono">{room.vibe}</span></p>
          <p className="text-[var(--text-muted)]">Content level: <span className="text-[var(--text-primary)] font-mono">{room.content_level}</span></p>
          <p className="text-[var(--text-muted)]">Groep: <span className="text-[var(--text-primary)] font-mono">{room.groep ?? '—'}</span></p>
          <p className="text-[var(--text-muted)]">Seasonal theme: <span className="text-[var(--text-primary)] font-mono">{room.seasonal_theme ?? 'none'}</span></p>
          <p className="text-[var(--text-muted)]">Seasonal source: <span className="text-[var(--text-primary)] font-mono">{room.seasonal_source ?? 'none'}</span></p>
          <p className="text-[var(--text-muted)]">Aangemaakt: <span className="text-[var(--text-primary)] font-mono">{formatDate(room.created_at)}</span></p>
          <p className="text-[var(--text-muted)]">Laatste activiteit: <span className="text-[var(--text-primary)] font-mono">{formatDate(room.last_activity_at)}</span></p>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 mb-8">
        <p className="text-xs font-mono tracking-widest text-[var(--text-muted)] uppercase mb-3">AI generatie</p>
        {latestMetric ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <p className="text-[var(--text-muted)]">Model: <span className="text-[var(--text-primary)] font-mono">{latestMetric.model}</span></p>
            <p className="text-[var(--text-muted)]">Prompt: <span className="text-[var(--text-primary)] font-mono">{latestMetric.prompt_tokens}</span></p>
            <p className="text-[var(--text-muted)]">Completion: <span className="text-[var(--text-primary)] font-mono">{latestMetric.completion_tokens}</span></p>
            <p className="text-[var(--text-muted)]">Totaal tokens: <span className="text-[var(--text-primary)] font-mono">{latestMetric.total_tokens}</span></p>
            <p className="text-[var(--text-muted)]">Kosten: <span className="text-[var(--coral)] font-mono">${Number(latestMetric.total_cost_usd).toFixed(4)}</span></p>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">Nog geen generatie-metrics beschikbaar.</p>
        )}
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5">
        <p className="text-xs font-mono tracking-widest text-[var(--text-muted)] uppercase mb-3">Rondes & vragen</p>
        {rounds && rounds.length > 0 ? (
          <div className="flex flex-col gap-3">
            {rounds.map(round => {
              const susPlayer = round.sidequest_player_id ? playerMap.get(round.sidequest_player_id) : null
              return (
                <div key={round.id} className="border border-[var(--border)] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-[var(--text-primary)] font-mono">
                      Ronde {round.round_number}
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-muted)] font-mono uppercase">
                      {round.status}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] font-mono mb-2">Main (NL)</p>
                  <p className="text-sm text-[var(--text-primary)] mb-3">{round.main_question_nl}</p>
                  <p className="text-xs text-[var(--text-muted)] font-mono mb-2">Main (EN)</p>
                  <p className="text-sm text-[var(--text-primary)] mb-3">{round.main_question_en}</p>

                  {round.has_sidequest ? (
                    <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-3">
                      <p className="text-xs text-[var(--mint)] font-mono mb-1">
                        Sidequest {susPlayer ? `(${susPlayer.display_name})` : '(nog niet toegewezen)'}
                      </p>
                      <p className="text-sm text-[var(--text-primary)] mb-1">NL: {round.sidequest_nl ?? '—'}</p>
                      <p className="text-sm text-[var(--text-primary)] mb-2">EN: {round.sidequest_en ?? '—'}</p>
                      <p className="text-xs text-[var(--text-muted)] font-mono mb-1">Fake task</p>
                      <p className="text-sm text-[var(--text-primary)]">NL: {round.fake_task_nl} · EN: {round.fake_task_en}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] font-mono">Geen sidequest in deze ronde.</p>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">Nog geen rondes gevonden voor deze game.</p>
        )}
      </div>
    </div>
  )
}
