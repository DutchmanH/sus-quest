'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRegister() {
    if (!username.trim() || !email || !password) {
      setError('Vul alle velden in')
      return
    }
    if (password.length < 6) {
      setError('Wachtwoord moet minimaal 6 tekens zijn')
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: username.trim() },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Profile is created via database trigger
    router.push('/')
    router.refresh()
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
            join the<br />
            <span className="italic text-[var(--coral)]">quest.</span>
          </h1>
          <p className="text-[var(--text-muted)] text-sm">maak een account aan om games te hosten.</p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4 flex-1">
          <div>
            <label className="text-xs font-mono tracking-widest text-[var(--text-muted)] mb-2 block uppercase">
              Gebruikersnaam
            </label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="jouw naam"
              maxLength={30}
              className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--mint)]"
            />
          </div>
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
              placeholder="min. 6 tekens"
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--mint)]"
            />
          </div>

          {error && <p className="text-[var(--coral)] text-sm">{error}</p>}
        </div>

        {/* Footer */}
        <div className="py-6 flex flex-col gap-3">
          <Button variant="mint" fullWidth size="lg" disabled={loading} onClick={handleRegister}>
            {loading ? 'Account aanmaken…' : 'Account aanmaken'}
          </Button>
          <div className="flex justify-center gap-1 text-sm">
            <span className="text-[var(--text-muted)]">Al een account?</span>
            <Link href="/login" className="text-[var(--mint)] hover:underline">Inloggen</Link>
          </div>
        </div>
      </div>
    </MobileContainer>
  )
}
