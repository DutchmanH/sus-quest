'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { useGameStore } from '@/store/gameStore'
import { AVATAR_COLORS } from '@/types'
import { AVATAR_ICONS } from '@/lib/avatars'

type Tab = 'instellingen' | 'statistieken'

export default function AccountPage() {
  const router = useRouter()
  const { language, setLanguage } = useGameStore()

  const [tab, setTab] = useState<Tab>('instellingen')
  const [username, setUsername] = useState('')
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0])
  const [avatarIcon, setAvatarIcon] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('susquest-avatar-icon') : null
  )
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    typeof window !== 'undefined' && localStorage.getItem('susquest-theme') === 'light' ? 'light' : 'dark'
  )
  const [stats, setStats] = useState<{
    games_played: number
    times_sus: number
    sus_successes: number
    correct_accusations: number
    total_score: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then(({ profile }) => {
        if (profile) {
          setUsername(profile.username ?? '')
          setAvatarColor(profile.avatar_color ?? AVATAR_COLORS[0])
          setStats({
            games_played: profile.games_played ?? 0,
            times_sus: profile.times_sus ?? 0,
            sus_successes: profile.sus_successes ?? 0,
            correct_accusations: profile.correct_accusations ?? 0,
            total_score: profile.total_score ?? 0,
          })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  function applyTheme(t: 'dark' | 'light') {
    setTheme(t)
    localStorage.setItem('susquest-theme', t)
    if (t === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }

  async function handleSave() {
    if (!username.trim()) { setError('Gebruikersnaam is verplicht'); return }
    setSaving(true)
    setError(null)
    setSaved(false)

    const res = await fetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), avatar_color: avatarColor, avatar_icon: avatarIcon }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Opslaan mislukt')
    } else {
      if (avatarIcon) localStorage.setItem('susquest-avatar-icon', avatarIcon)
      else localStorage.removeItem('susquest-avatar-icon')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <MobileContainer>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--mint)] border-t-transparent rounded-full animate-spin" />
        </div>
      </MobileContainer>
    )
  }

  const susRatio = stats && stats.times_sus > 0
    ? Math.round((stats.sus_successes / stats.times_sus) * 100)
    : null

  return (
    <MobileContainer>
      <div className="flex flex-col min-h-screen px-5 pt-5 pb-8">

        {/* Back */}
        <button
          onClick={() => router.push('/dashboard')}
          className="text-[var(--text-muted)] text-sm mb-6 self-start hover:text-[var(--text-primary)] transition-colors"
        >
          ← terug
        </button>

        {/* Avatar preview */}
        <div className="flex items-center gap-4 mb-6">
          <Avatar name={username || '?'} color={avatarColor} icon={avatarIcon ?? undefined} size="xl" />
          <div>
            <p className="font-bold text-lg text-[var(--text-primary)]">{username || '—'}</p>
            <p className="text-xs font-mono text-[var(--text-muted)] mt-0.5">
              {stats ? `${stats.games_played} games gespeeld` : 'laden…'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[var(--bg-card)] rounded-full p-1 mb-6">
          {(['instellingen', 'statistieken'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all ${
                tab === t
                  ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── Instellingen tab ─────────────────────────────────────── */}
        {tab === 'instellingen' && (
          <>
            <div className="flex flex-col gap-7 flex-1">

              {/* Username */}
              <div>
                <label className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-2 block uppercase">
                  Gebruikersnaam
                </label>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  maxLength={30}
                  placeholder="jouw naam"
                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--mint)] transition-colors"
                />
              </div>

              {/* Avatar color */}
              <div>
                <label className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-3 block uppercase">
                  Avatar kleur
                </label>
                <div className="flex gap-3 flex-wrap">
                  {AVATAR_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setAvatarColor(color)}
                      className="w-10 h-10 rounded-full transition-all"
                      style={{
                        background: color,
                        outline: avatarColor === color ? `3px solid var(--text-primary)` : '3px solid transparent',
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Avatar icon */}
              <div>
                <label className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-3 block uppercase">
                  Avatar kiezen
                </label>
                <div className="grid grid-cols-6 gap-3">
                  {AVATAR_ICONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => { setAvatarIcon(icon); setSaved(false) }}
                      className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
                      style={{
                        background: avatarIcon === icon ? 'var(--mint)' : 'var(--bg-card)',
                        outline: avatarIcon === icon ? '3px solid var(--text-primary)' : '3px solid var(--border)',
                        outlineOffset: '2px',
                      }}
                      aria-label={`Avatar ${icon}`}
                    >
                      <span className="text-xl">{icon}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-3 block uppercase">
                  Taal
                </label>
                <div className="flex gap-2">
                  {(['nl', 'en'] as const).map(l => (
                    <button
                      key={l}
                      onClick={() => setLanguage(l)}
                      className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${
                        language === l
                          ? 'bg-[var(--mint)] text-[var(--bg-primary)]'
                          : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)]'
                      }`}
                    >
                      {l === 'nl' ? 'Nederlands' : 'English'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme */}
              <div>
                <label className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-3 block uppercase">
                  Thema
                </label>
                <div className="flex gap-2">
                  {(['dark', 'light'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => applyTheme(t)}
                      className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                        theme === t
                          ? 'bg-[var(--gold)] text-[var(--bg-primary)]'
                          : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)]'
                      }`}
                    >
                      {t === 'dark' ? '🌙 donker' : '☀️ licht'}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-[var(--coral)] text-sm">{error}</p>}
            </div>

            <div className="pt-6">
              <Button
                variant={saved ? 'dark' : 'mint'}
                fullWidth
                size="lg"
                disabled={saving}
                onClick={handleSave}
              >
                {saved ? '✓ Opgeslagen' : saving ? 'Opslaan…' : 'Opslaan →'}
              </Button>
            </div>
          </>
        )}

        {/* ── Statistieken tab ─────────────────────────────────────── */}
        {tab === 'statistieken' && stats && (
          <div className="flex flex-col gap-4 flex-1">

            {/* Big number: games played */}
            <div className="rounded-3xl p-6" style={{ background: 'var(--mint)' }}>
              <p className="text-[10px] font-mono tracking-[0.2em] text-[var(--bg-primary)] opacity-70 mb-1">TOTAAL</p>
              <p className="text-6xl font-bold text-[var(--bg-primary)] leading-none">{stats.games_played}</p>
              <p className="text-sm font-mono text-[var(--bg-primary)] opacity-80 mt-2">games gespeeld</p>
            </div>

            {/* Score */}
            <div className="rounded-3xl p-5 flex items-center gap-4" style={{ background: 'var(--bg-card)' }}>
              <span className="text-3xl">★</span>
              <div>
                <p className="text-2xl font-bold text-[var(--gold)]">{stats.total_score}</p>
                <p className="text-xs font-mono text-[var(--text-muted)]">totaal punten</p>
              </div>
            </div>

            {/* Sus stats */}
            <div className="rounded-3xl p-5" style={{ background: 'var(--bg-card)' }}>
              <p className="text-[10px] font-mono tracking-[0.2em] text-[var(--text-muted)] mb-4">SUS STATISTIEKEN</p>
              <div className="flex justify-between items-start">
                <div className="text-center flex-1">
                  <p className="text-3xl font-bold text-[var(--coral)]">{stats.times_sus}</p>
                  <p className="text-[10px] font-mono text-[var(--text-muted)] mt-1">keer sus</p>
                </div>
                <div className="w-px bg-[var(--border)] self-stretch mx-2" />
                <div className="text-center flex-1">
                  <p className="text-3xl font-bold text-[var(--coral)]">{stats.sus_successes}</p>
                  <p className="text-[10px] font-mono text-[var(--text-muted)] mt-1">missies voltooid</p>
                </div>
                <div className="w-px bg-[var(--border)] self-stretch mx-2" />
                <div className="text-center flex-1">
                  <p className="text-3xl font-bold" style={{ color: susRatio !== null && susRatio >= 50 ? 'var(--mint)' : 'var(--coral)' }}>
                    {susRatio !== null ? `${susRatio}%` : '—'}
                  </p>
                  <p className="text-[10px] font-mono text-[var(--text-muted)] mt-1">slagingsratio</p>
                </div>
              </div>
            </div>

            {/* Correct accusations */}
            <div className="rounded-3xl p-5 flex items-center gap-4" style={{ background: 'var(--bg-card)' }}>
              <span className="text-3xl">⚑</span>
              <div>
                <p className="text-2xl font-bold text-[var(--mint)]">{stats.correct_accusations}</p>
                <p className="text-xs font-mono text-[var(--text-muted)]">keer sus ontmaskerd</p>
              </div>
            </div>

            {stats.games_played === 0 && (
              <p className="text-center text-sm text-[var(--text-muted)] font-mono mt-4">
                speel je eerste game om stats te verzamelen ✦
              </p>
            )}
          </div>
        )}

      </div>
    </MobileContainer>
  )
}
