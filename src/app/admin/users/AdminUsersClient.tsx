'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'

interface User {
  id: string
  username: string
  avatar_color: string
  email: string | null
  games_played: number
  total_score: number
  is_admin: boolean
  is_protected_super_admin?: boolean
  blocked: boolean
  created_at: string
  last_sign_in: string | null
  active_rooms: number
}

function relativeDate(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - Date.parse(iso)
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'vandaag'
  if (days === 1) return 'gisteren'
  if (days < 7) return `${days}d geleden`
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

export default function AdminUsersClient({ users: initialUsers }: { users: User[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState('')
  const [filterAdmin, setFilterAdmin] = useState<'all' | 'admin' | 'user'>('all')
  const [filterBlocked, setFilterBlocked] = useState<'all' | 'blocked' | 'active'>('all')
  const [isPending, startTransition] = useTransition()
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const filtered = users.filter(u => {
    const matchSearch =
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? '').toLowerCase().includes(search.toLowerCase())
    const matchAdmin =
      filterAdmin === 'all' ||
      (filterAdmin === 'admin' && u.is_admin) ||
      (filterAdmin === 'user' && !u.is_admin)
    const matchBlocked =
      filterBlocked === 'all' ||
      (filterBlocked === 'blocked' && u.blocked) ||
      (filterBlocked === 'active' && !u.blocked)
    return matchSearch && matchAdmin && matchBlocked
  })

  async function toggleBlock(userId: string) {
    setActionLoading(userId + '-block')
    try {
      const res = await fetch(`/api/admin/users/${userId}/block`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        startTransition(() => {
          setUsers(prev => prev.map(u => u.id === userId ? { ...u, blocked: data.blocked } : u))
        })
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function toggleAdmin(userId: string) {
    setActionLoading(userId + '-admin')
    try {
      const res = await fetch(`/api/admin/users/${userId}/admin`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        startTransition(() => {
          setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: data.is_admin } : u))
        })
      }
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Gebruikers</h1>
      <p className="text-[var(--text-muted)] text-sm mb-6 font-mono">
        {filtered.length} van {users.length} gebruikers
      </p>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Zoek op naam of e-mail…"
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--mint)] min-w-[220px]"
        />
        <select
          value={filterAdmin}
          onChange={e => setFilterAdmin(e.target.value as typeof filterAdmin)}
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--mint)]"
        >
          <option value="all">Alle rollen</option>
          <option value="admin">Alleen admins</option>
          <option value="user">Alleen users</option>
        </select>
        <select
          value={filterBlocked}
          onChange={e => setFilterBlocked(e.target.value as typeof filterBlocked)}
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--mint)]"
        >
          <option value="all">Alle statussen</option>
          <option value="active">Actief</option>
          <option value="blocked">Geblokkeerd</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {['Gebruiker', 'E-mail', 'Games', 'Score', 'Actieve rooms', 'Laatste login', 'Rol', 'Status', 'Acties'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-mono tracking-widest text-[var(--text-muted)] uppercase whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                  Geen gebruikers gevonden
                </td>
              </tr>
            )}
            {filtered.map(user => (
              <tr
                key={user.id}
                className={`border-b border-[var(--border)] last:border-0 transition-colors ${user.blocked ? 'opacity-50' : 'hover:bg-[var(--bg-card-hover)]'}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-[var(--bg-primary)] shrink-0"
                      style={{ background: user.avatar_color }}
                    >
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-[var(--text-primary)] whitespace-nowrap">
                      {user.username}
                    </span>
                    {user.is_protected_super_admin && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-[var(--mint)] text-[var(--mint)]">
                        SUPERADMIN
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-muted)] font-mono">
                  {user.email ?? '—'}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-primary)] font-mono">
                  {user.games_played}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--gold)] font-mono">
                  ★ {user.total_score}
                </td>
                <td className="px-4 py-3">
                  {user.active_rooms > 0 ? (
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full border border-[var(--coral)] text-[var(--coral)]">
                      {user.active_rooms} actief
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)] font-mono">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-muted)] font-mono whitespace-nowrap">
                  {relativeDate(user.last_sign_in)}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${
                    user.is_admin
                      ? 'border-[var(--mint)] text-[var(--mint)]'
                      : 'border-[var(--border)] text-[var(--text-muted)]'
                  }`}>
                    {user.is_admin ? 'ADMIN' : 'USER'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${
                    user.blocked
                      ? 'border-[var(--coral)] text-[var(--coral)]'
                      : 'border-[var(--border)] text-[var(--text-muted)]'
                  }`}>
                    {user.blocked ? 'GEBLOKKEERD' : 'ACTIEF'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="text-xs font-mono px-3 py-1 rounded-lg border border-[var(--mint)] text-[var(--mint)] hover:bg-[var(--mint)]/10 transition-colors"
                    >
                      Details
                    </Link>
                    <button
                      onClick={() => toggleBlock(user.id)}
                      disabled={actionLoading === user.id + '-block' || user.is_protected_super_admin}
                      className={`text-xs font-mono px-3 py-1 rounded-lg border transition-colors disabled:opacity-50 ${
                        user.blocked
                          ? 'border-[var(--mint)] text-[var(--mint)] hover:bg-[var(--mint)]/10'
                          : 'border-[var(--coral)] text-[var(--coral)] hover:bg-[var(--coral)]/10'
                      }`}
                    >
                      {actionLoading === user.id + '-block' ? '…' : user.blocked ? 'Deblokkeren' : 'Blokkeren'}
                    </button>
                    <button
                      onClick={() => toggleAdmin(user.id)}
                      disabled={actionLoading === user.id + '-admin' || user.is_protected_super_admin}
                      className="text-xs font-mono px-3 py-1 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--mint)] hover:text-[var(--mint)] transition-colors disabled:opacity-50"
                    >
                      {actionLoading === user.id + '-admin' ? '…' : user.is_admin ? '− Admin' : '+ Admin'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
