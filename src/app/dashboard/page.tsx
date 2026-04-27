'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'

interface Session {
  code: string
  game_name?: string | null
  status: string
  created_at: string
  is_host: boolean
  player_count: number
}

interface Profile {
  username: string
  avatar_color: string
  games_played: number
}

function statusBadge(status: string) {
  if (status === 'lobby') return <Badge variant="waiting">LOBBY</Badge>
  if (status === 'playing' || status === 'generating') return <Badge variant="live">BEZIG</Badge>
  return <Badge variant="default">{status.toUpperCase()}</Badge>
}

function sessionDestination(status: string, code: string) {
  if (status === 'playing') return `/game/${code}`
  return `/lobby/${code}`
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [avatarIcon] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('susquest-avatar-icon') : null
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sessions')
      .then(async r => {
        if (r.status === 401) {
          router.replace('/')
          return null
        }
        return r.json()
      })
      .then(data => {
        if (!data) return
        setProfile(data.profile ?? null)
        setSessions(data.sessions ?? [])
        if (!data.profile) {
          router.replace('/account?onboarding=1')
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [router])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setLogoutConfirmOpen(false)
    router.push('/')
    router.refresh()
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

  return (
    <MobileContainer>
      <div className="flex flex-col min-h-screen px-5 pt-5 pb-8">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <span className="text-xs font-mono tracking-widest text-[var(--text-muted)]">
            SUSQUEST
          </span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/account')}
              title="setting"
              aria-label="setting"
              className="w-7 h-7 text-[var(--text-muted)] hover:text-[var(--mint)] transition-colors flex items-center justify-center"
            >
              ⚙
            </button>
            <button
              onClick={() => setLogoutConfirmOpen(true)}
              title="uitloggen"
              aria-label="uitloggen"
              className="w-7 h-7 text-[var(--text-muted)] hover:text-[var(--coral)] transition-colors flex items-center justify-center"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-[18px] h-[18px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
                <path d="M20 3v18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Profile header */}
        <div className="flex items-center gap-4 mb-8">
          <Avatar
            name={profile?.username ?? '?'}
            color={profile?.avatar_color ?? '#5DEDD4'}
            icon={avatarIcon ?? undefined}
            size="xl"
          />
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] leading-tight">
              {profile?.username ?? '—'}
            </h1>
            <p className="text-sm text-[var(--text-muted)] font-mono mt-0.5">
              {profile?.games_played ?? 0} games gespeeld
            </p>
          </div>
        </div>

        {/* Main CTA */}
        <div className="mb-10">
          <div className="mb-3">
            <h2 className="text-3xl font-bold leading-tight">
              ready to<br />
              <span className="italic text-[var(--coral)]">suspect?</span>
            </h2>
          </div>
          <Button
            variant="mint"
            fullWidth
            size="lg"
            onClick={() => router.push('/create-party')}
          >
            Nieuw spel starten ⚡
          </Button>
          <button
            onClick={() => router.push('/join')}
            className="w-full mt-3 py-4 rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] text-base font-semibold hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-all"
          >
            Join met code
          </button>
        </div>

        {/* Open sessions */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono tracking-widest text-[var(--text-muted)]">
              OPEN SESSIES
            </span>
            {sessions.length > 0 && (
              <span className="text-xs font-mono text-[var(--text-muted)]">
                {sessions.length}
              </span>
            )}
          </div>

          {sessions.length === 0 ? (
            <div className="bg-[var(--bg-card)] rounded-2xl px-4 py-6 text-center border border-[var(--border)]">
              <p className="text-[var(--text-muted)] text-sm">
                Geen actieve sessies.
              </p>
              <p className="text-[var(--text-muted)] text-xs mt-1 opacity-60">
                Start een nieuw spel of join met een code.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {sessions.map(session => (
                <button
                  key={session.code}
                  onClick={() => router.push(sessionDestination(session.status, session.code))}
                  className="w-full text-left bg-[var(--bg-card)] rounded-2xl px-4 py-4 border border-[var(--border)] hover:border-[var(--mint)] transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold font-mono text-[var(--text-primary)] tracking-widest">
                        {session.code}
                      </span>
                      {statusBadge(session.status)}
                    </div>
                    <span className="text-[var(--text-muted)] group-hover:text-[var(--mint)] transition-colors text-lg">
                      →
                    </span>
                  </div>
                  {session.game_name && (
                    <p className="text-xs text-[var(--text-muted)] mt-1">{session.game_name}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-[var(--text-muted)] font-mono">
                      {session.player_count} speler{session.player_count !== 1 ? 's' : ''}
                    </span>
                    <span className="text-[var(--border)] text-xs">·</span>
                    <span className="text-xs text-[var(--text-muted)] font-mono">
                      {session.is_host ? 'HOST' : 'GAST'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {logoutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setLogoutConfirmOpen(false)}
          />
          <div className="relative w-full max-w-md bg-[var(--bg-primary)] border border-[var(--border)] rounded-3xl p-5">
            <p className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-2 uppercase">
              Uitloggen
            </p>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              Weet je het zeker?
            </h3>
            <p className="text-sm text-[var(--text-muted)] mb-5">
              Je huidige sessie wordt afgesloten op dit device.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setLogoutConfirmOpen(false)}
                className="flex-1 py-3 rounded-2xl border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors text-sm font-semibold"
              >
                Annuleren
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 rounded-2xl bg-[var(--coral)] text-[var(--bg-primary)] text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Ja, uitloggen
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileContainer>
  )
}
