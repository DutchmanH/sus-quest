'use client'

import Link from 'next/link'
import { useState } from 'react'

interface Game {
  id: string
  code: string
  game_name: string | null
  status: string
  mode: string
  language: string
  rounds_total: number
  current_round: number
  created_at: string
  last_activity_at: string
  host_username: string
  player_count: number
  total_tokens: number
  total_cost_usd: number
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  lobby: { label: 'LOBBY', color: 'var(--text-muted)' },
  settings: { label: 'INSTELLINGEN', color: 'var(--text-muted)' },
  generating: { label: 'GENEREREN', color: 'var(--gold)' },
  playing: { label: 'BEZIG', color: 'var(--coral)' },
  finished: { label: 'KLAAR', color: 'var(--mint)' },
}

function relativeDate(iso: string): string {
  const diff = Date.now() - Date.parse(iso)
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'zojuist'
  if (mins < 60) return `${mins}m geleden`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}u geleden`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'gisteren'
  if (days < 7) return `${days}d geleden`
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

export default function AdminGamesClient({ games: initialGames }: { games: Game[] }) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterMode, setFilterMode] = useState('all')
  const [filterCost, setFilterCost] = useState('all')
  const [filterTokens, setFilterTokens] = useState('all')

  const filtered = initialGames.filter(g => {
    const matchSearch =
      (g.game_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      g.code.toLowerCase().includes(search.toLowerCase()) ||
      g.host_username.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || g.status === filterStatus
    const matchMode = filterMode === 'all' || g.mode === filterMode
    const matchCost =
      filterCost === 'all' ||
      (filterCost === 'none' && g.total_cost_usd === 0) ||
      (filterCost === 'low' && g.total_cost_usd > 0 && g.total_cost_usd < 0.02) ||
      (filterCost === 'mid' && g.total_cost_usd >= 0.02 && g.total_cost_usd < 0.08) ||
      (filterCost === 'high' && g.total_cost_usd >= 0.08)
    const matchTokens =
      filterTokens === 'all' ||
      (filterTokens === 'none' && g.total_tokens === 0) ||
      (filterTokens === 'low' && g.total_tokens > 0 && g.total_tokens < 6000) ||
      (filterTokens === 'mid' && g.total_tokens >= 6000 && g.total_tokens < 15000) ||
      (filterTokens === 'high' && g.total_tokens >= 15000)
    return matchSearch && matchStatus && matchMode && matchCost && matchTokens
  })

  const activeCnt = initialGames.filter(g => g.status === 'playing').length
  const lobbyCnt = initialGames.filter(g => g.status === 'lobby' || g.status === 'settings').length

  return (
    <div>
      <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Spellen</h1>
      <p className="text-[var(--text-muted)] text-sm mb-6 font-mono">
        {filtered.length} van {initialGames.length} rooms · {activeCnt} actief · {lobbyCnt} in lobby
      </p>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Zoek op naam, code of host…"
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--mint)] min-w-[220px]"
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--mint)]"
        >
          <option value="all">Alle statussen</option>
          <option value="lobby">Lobby</option>
          <option value="settings">Instellingen</option>
          <option value="generating">Genereren</option>
          <option value="playing">Bezig</option>
          <option value="finished">Afgerond</option>
        </select>
        <select
          value={filterMode}
          onChange={e => setFilterMode(e.target.value)}
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--mint)]"
        >
          <option value="all">Alle modi</option>
          <option value="multiplayer">Multiplayer</option>
          <option value="single_device">Single device</option>
        </select>
        <select
          value={filterCost}
          onChange={e => setFilterCost(e.target.value)}
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--mint)]"
        >
          <option value="all">Alle kosten</option>
          <option value="none">$0</option>
          <option value="low">Laag (&lt; $0.02)</option>
          <option value="mid">Midden ($0.02 - $0.08)</option>
          <option value="high">Hoog (&ge; $0.08)</option>
        </select>
        <select
          value={filterTokens}
          onChange={e => setFilterTokens(e.target.value)}
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--mint)]"
        >
          <option value="all">Alle tokens</option>
          <option value="none">0</option>
          <option value="low">Laag (&lt; 6k)</option>
          <option value="mid">Midden (6k - 15k)</option>
          <option value="high">Hoog (&ge; 15k)</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-x-auto">
        <table className="w-full min-w-[980px]">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {['Code', 'Naam', 'Host', 'Status', 'Spelers', 'Ronde', 'Modus', 'Tokens', 'Kosten', 'Aangemaakt', 'Laatste activiteit', 'Acties'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-mono tracking-widest text-[var(--text-muted)] uppercase whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                  Geen spellen gevonden
                </td>
              </tr>
            )}
            {filtered.map(game => {
              const statusInfo = STATUS_LABELS[game.status] ?? { label: game.status.toUpperCase(), color: 'var(--text-muted)' }
              return (
                <tr key={game.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-card-hover)] transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold font-mono text-[var(--text-primary)] tracking-widest">
                      {game.code}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-primary)]">
                    {game.game_name ?? <span className="text-[var(--text-muted)]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)] font-mono">
                    {game.host_username}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full border" style={{ color: statusInfo.color, borderColor: statusInfo.color }}>
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-primary)] font-mono">
                    {game.player_count}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)] font-mono">
                    {game.status === 'finished' || game.status === 'playing'
                      ? `${game.current_round}/${game.rounds_total}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-[var(--text-muted)]">
                      {game.mode === 'multiplayer' ? 'MULTI' : 'SINGLE'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-primary)] font-mono whitespace-nowrap">
                    {game.total_tokens.toLocaleString('nl-NL')}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono whitespace-nowrap text-[var(--coral)]">
                    ${game.total_cost_usd.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)] font-mono whitespace-nowrap">
                    {relativeDate(game.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)] font-mono whitespace-nowrap">
                    {relativeDate(game.last_activity_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/games/${game.id}`}
                      className="text-xs font-mono px-3 py-1 rounded-lg border border-[var(--mint)] text-[var(--mint)] hover:bg-[var(--mint)]/10 transition-colors"
                    >
                      Details
                    </Link>
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
