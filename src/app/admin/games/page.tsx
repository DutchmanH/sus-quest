import { createServiceClient } from '@/lib/supabase/server'
import AdminGamesClient from './AdminGamesClient'

export default async function AdminGamesPage() {
  const supabase = await createServiceClient()

  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, code, game_name, status, mode, rounds_total, current_round, created_at, last_activity_at, host_id, language')
    .order('created_at', { ascending: false })
    .limit(200)

  const { data: playerCounts } = await supabase
    .from('room_players')
    .select('room_id')

  const { data: generationMetrics } = await supabase
    .from('game_generation_metrics')
    .select('room_id, total_tokens, total_cost_usd')

  const countMap: Record<string, number> = {}
  ;(playerCounts ?? []).forEach((r: { room_id: string }) => {
    countMap[r.room_id] = (countMap[r.room_id] ?? 0) + 1
  })

  const tokenMap: Record<string, number> = {}
  const costMap: Record<string, number> = {}
  ;(generationMetrics ?? []).forEach((m: { room_id: string; total_tokens: number | null; total_cost_usd: number | null }) => {
    tokenMap[m.room_id] = (tokenMap[m.room_id] ?? 0) + (m.total_tokens ?? 0)
    costMap[m.room_id] = (costMap[m.room_id] ?? 0) + Number(m.total_cost_usd ?? 0)
  })

  // Get host usernames
  const hostIds = [...new Set((rooms ?? []).map(r => r.host_id).filter(Boolean))]
  const { data: hostProfiles } = hostIds.length > 0
    ? await supabase.from('profiles').select('id, username').in('id', hostIds)
    : { data: [] }

  const hostMap = new Map((hostProfiles ?? []).map(p => [p.id, p.username]))

  const games = (rooms ?? []).map(room => ({
    id: room.id,
    code: room.code,
    game_name: room.game_name ?? null,
    status: room.status,
    mode: room.mode,
    language: room.language,
    rounds_total: room.rounds_total,
    current_round: room.current_round,
    created_at: room.created_at,
    last_activity_at: room.last_activity_at,
    host_username: hostMap.get(room.host_id) ?? '—',
    player_count: countMap[room.id] ?? 0,
    total_tokens: tokenMap[room.id] ?? 0,
    total_cost_usd: costMap[room.id] ?? 0,
  }))

  return <AdminGamesClient games={games} />
}
