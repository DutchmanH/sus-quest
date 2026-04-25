'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

export default function HomePage() {
  const router = useRouter()
  const [lang, setLang] = useState<'nl' | 'en'>('nl')
  const [liveCount, setLiveCount] = useState<number | null>(null)

  useEffect(() => {
    // Redirect logged-in users to dashboard
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace('/dashboard')
    })

    // Fetch live player count
    fetch('/api/live-count')
      .then(r => r.json())
      .then(({ count }) => setLiveCount(count))
      .catch(() => {})
  }, [router])

  const liveLabel = liveCount === null
    ? 'LIVE'
    : `LIVE · ${liveCount} SUS`

  const t = lang === 'nl' ? {
    tagline: 'niet je beste vriend. niet je lief. niet jezelf.',
    start: 'Start party ⚡',
    join: 'Join met code',
    footer: '♡ trust issues',
    login: 'Inloggen',
  } : {
    tagline: 'not your best friend. not your partner. not yourself.',
    start: 'Start party ⚡',
    join: 'Join with code',
    footer: '♡ trust issues',
    login: 'Login',
  }

  return (
    <MobileContainer>
      {/* Status bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--mint)] animate-pulse" />
          <span className="text-xs font-mono tracking-widest text-[var(--mint)]">{liveLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLang(l => l === 'nl' ? 'en' : 'nl')}
            className="text-xs font-mono tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            {lang === 'nl' ? 'NL / EN' : 'EN / NL'}
          </button>
          <button
            onClick={() => router.push('/login')}
            className="text-xs font-mono tracking-widest text-[var(--text-muted)] hover:text-[var(--mint)]"
          >
            {t.login}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col justify-center px-5">
        {/* Hero text */}
        <div className="mb-8">
          <h1 className="font-bold leading-none" style={{ fontSize: 'clamp(72px, 20vw, 96px)' }}>
            <span className="text-[var(--text-primary)]">sus</span>
            <br />
            <span className="italic text-[var(--coral)]">quest?!</span>
          </h1>
        </div>

        {/* Tagline card */}
        <div className="flex items-center gap-3 bg-[var(--bg-card)] rounded-2xl px-4 py-3 mb-10">
          <span className="text-xl">👁</span>
          <p className="text-sm text-[var(--text-primary)] leading-snug">
            <strong>trust no one.</strong>{' '}
            <span className="text-[var(--text-muted)]">{t.tagline}</span>
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <Button
            variant="mint"
            fullWidth
            size="lg"
            onClick={() => router.push('/login')}
          >
            {t.start}
          </Button>
          <Button
            variant="dark"
            fullWidth
            size="lg"
            onClick={() => router.push('/join')}
          >
            {t.join}
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-4">
        <span className="text-xs font-mono tracking-widest text-[var(--text-muted)]">V1.0 · MINT EDITION</span>
        <span className="text-xs font-mono tracking-widest text-[var(--coral)]">{t.footer}</span>
      </div>
    </MobileContainer>
  )
}
