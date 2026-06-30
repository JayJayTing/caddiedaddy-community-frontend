'use client'
import { useEffect, useState, ReactNode } from 'react'
import { api, ApiError } from '@/lib/api'

const TOKEN_KEY = 'caddie_token'

function hasToken(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY))
}

/**
 * Auth gate + chrome for the operator console. Shares the consumer app's
 * Supabase token (caddie_token); if absent or expired, shows an email/password
 * login that hits POST /auth/login.
 */
export function MerchantShell({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    setAuthed(hasToken())
    const onExpired = () => setAuthed(false)
    window.addEventListener('caddie:session-expired', onExpired)
    return () => window.removeEventListener('caddie:session-expired', onExpired)
  }, [])

  if (authed === null) return <div className="mc-root" />

  if (!authed) {
    return (
      <div className="mc-root">
        <div className="mc-center">
          <LoginForm onSuccess={() => setAuthed(true)} />
        </div>
      </div>
    )
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    setAuthed(false)
  }

  return (
    <div className="mc-root">
      <div className="mc-bar">
        <a href="/merchant" className="mc-brand" style={{ textDecoration: 'none', color: '#fff' }}>
          <span className="mc-dot" />
          <h1>Forely · Operator Console</h1>
        </a>
        <div className="mc-bar-actions">
          <span className="mc-muted" style={{ color: '#9fb3c2' }}>Pay-at-venue · v1</span>
          <button className="mc-btn ghost sm" onClick={logout}>Sign out</button>
        </div>
      </div>
      <div className="mc-wrap">{children}</div>
    </div>
  )
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await api.post<{ session: { access_token: string } | null }>('/auth/login', {
        email,
        password,
      })
      const token = res.session?.access_token
      if (!token) throw new Error('No session returned')
      localStorage.setItem(TOKEN_KEY, token)
      onSuccess()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="mc-card mc-login" onSubmit={submit}>
      <h2>Operator sign in</h2>
      <p className="mc-muted mc-small" style={{ marginTop: -8, marginBottom: 16 }}>
        Sign in with the account that owns or manages your venue.
      </p>
      {error && <div className="mc-error">{error}</div>}
      <div className="mc-field">
        <label>Email</label>
        <input
          className="mc-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
        />
      </div>
      <div className="mc-field">
        <label>Password</label>
        <input
          className="mc-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>
      <button className="mc-btn" type="submit" disabled={busy} style={{ width: '100%', marginTop: 6 }}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
