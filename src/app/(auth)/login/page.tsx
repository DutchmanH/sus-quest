'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unconfirmed, setUnconfirmed] = useState(false)

  async function handleLogin() {
    if (!email || !password) { setError('Vul alle velden in'); return }
    setLoading(true)
    setError(null)
    setUnconfirmed(false)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      if (authError.message.toLowerCase().includes('email not confirmed')) {
        setUnconfirmed(true)
      } else {
        setError('Onjuist e-mailadres of wachtwoord')
      }
      setLoading(false)
      return
    }
    router.push('/')
    router.refresh()
  }

  async function resendConfirmation() {
    const supabase = createClient()
    await supabase.auth.resend({ type: 'signup', email })
    setError('Bevestigingsmail opnieuw verstuurd — check je inbox.')
    setUnconfirmed(false)
  }

  return (
    <MobileContainer>
      <div className="flex flex-col min-h-screen px-5 pt-5">
        {/* Back */}
        <button onClick={() => router.push('/')} className="text-[var(--text-muted)] text-sm mb-8 self-start hover:text-[var(--text-primary)]">
          ← terug
        </button>

        {/* Title */}
        <div className="mb-10">
          <h1 className="text-5xl font-bold leading-tight mb-2">
            welkom<br />
            <span className="italic text-[var(--mint)]">terug.</span>
          </h1>
          <p className="text-[var(--text-muted)] text-sm">log in om games te hosten.</p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4 flex-1">
          <div>
            <label className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-2 block uppercase">
              E-mailadres
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="jij@example.com"
              className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--mint)]"
            />
          </div>
          <div>
            <label className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-2 block uppercase">
              Wachtwoord
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--mint)]"
            />
          </div>

          {error && <p className="text-[var(--coral)] text-sm">{error}</p>}
          {unconfirmed && (
            <div className="bg-[var(--bg-card)] border border-[var(--gold)] rounded-2xl px-4 py-3">
              <p className="text-[var(--gold)] text-sm font-semibold mb-1">E-mail nog niet bevestigd</p>
              <p className="text-[var(--text-muted)] text-xs mb-3">
                Check je inbox voor een bevestigingsmail. Geen mail ontvangen?
              </p>
              <button
                onClick={resendConfirmation}
                className="text-xs font-mono tracking-widest text-[var(--mint)] hover:underline"
              >
                Stuur opnieuw →
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="py-6 flex flex-col gap-3">
          <Button variant="mint" fullWidth size="lg" disabled={loading} onClick={handleLogin}>
            {loading ? 'Inloggen…' : 'Inloggen'}
          </Button>
          <div className="flex justify-center gap-1 text-sm">
            <span className="text-[var(--text-muted)]">Nog geen account?</span>
            <Link href="/register" className="text-[var(--mint)] hover:underline">Registreer hier</Link>
          </div>
          <button
            onClick={() => router.push('/join')}
            className="text-center text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] py-2"
          >
            Speel anoniem (alleen joinen)
          </button>
        </div>
      </div>
    </MobileContainer>
  )
}
