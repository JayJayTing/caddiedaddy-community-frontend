'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { AuthUser, AuthResponse, AuthSession } from '@/types/auth'
import { api } from '@/lib/api'
import { getSupabaseAuth } from '@/lib/supabaseAuth'

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  loginWithEmail: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  signupWithEmail: (email: string, password: string, displayName: string) => Promise<{ pendingVerification: boolean }>
  sendOtp: (phone: string) => Promise<void>
  verifyOtp: (phone: string, token: string) => Promise<void>
  verifyEmailOtp: (email: string, token: string) => Promise<void>
  resendEmailOtp: (email: string) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  loginWithProvider: (provider: 'google' | 'apple') => Promise<void>
  completeOAuth: () => Promise<void>
  logout: () => Promise<void>
  updateUser: (updates: Partial<AuthUser>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function saveSession(session: { access_token: string; refresh_token: string }, persist = true) {
  const store = persist ? localStorage : sessionStorage
  store.setItem('caddie_token', session.access_token)
  store.setItem('caddie_refresh', session.refresh_token)
}

function clearSession() {
  localStorage.removeItem('caddie_token')
  localStorage.removeItem('caddie_refresh')
  sessionStorage.removeItem('caddie_token')
  sessionStorage.removeItem('caddie_refresh')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('caddie_token') ?? sessionStorage.getItem('caddie_token')
    if (!token) { setIsLoading(false); return }
    api.get<{ user: AuthUser }>('/auth/me')
      .then(({ user }) => setUser(user))
      .catch(() => clearSession())
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    const handler = () => { clearSession(); setUser(null) }
    window.addEventListener('caddie:session-expired', handler)
    return () => window.removeEventListener('caddie:session-expired', handler)
  }, [])

  const loginWithEmail = useCallback(async (email: string, password: string, rememberMe = true) => {
    const { session, user } = await api.post<AuthResponse>('/auth/login', { email, password })
    saveSession(session, rememberMe)
    setUser(user)
  }, [])

  const signupWithEmail = useCallback(async (email: string, password: string, displayName: string): Promise<{ pendingVerification: boolean }> => {
    // With email verification OFF the backend returns a session (instant signup);
    // with it ON it returns { pendingVerification } and emails a 6-digit code.
    const res = await api.post<{ session?: AuthSession; user?: AuthUser; pendingVerification?: boolean }>(
      '/auth/signup',
      { email, password, displayName },
    )
    if (res.session && res.user) {
      saveSession(res.session)
      setUser(res.user)
      return { pendingVerification: false }
    }
    return { pendingVerification: true }
  }, [])

  const verifyEmailOtp = useCallback(async (email: string, token: string) => {
    const { session, user } = await api.post<AuthResponse>('/auth/verify-email', { email, token })
    saveSession(session)
    setUser(user)
  }, [])

  const resendEmailOtp = useCallback(async (email: string) => {
    await api.post('/auth/email/resend-otp', { email })
  }, [])

  // Password reset: send a code, verify it via verifyEmailOtp (which signs the
  // user in), then set the new password.
  const forgotPassword = useCallback(async (email: string) => {
    await api.post('/auth/password/forgot', { email })
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    await api.post('/auth/password/update', { password })
  }, [])

  const sendOtp = useCallback(async (phone: string) => {
    await api.post('/auth/phone/send-otp', { phone, channel: 'sms' })
  }, [])

  const verifyOtp = useCallback(async (phone: string, token: string) => {
    const { session, user } = await api.post<AuthResponse>('/auth/verify-otp', { phone, token, type: 'sms' })
    saveSession(session)
    setUser(user)
  }, [])

  // OAuth (Google/Apple) runs in the browser via supabase-js so the PKCE verifier
  // is per-user. signInWithOAuth redirects away; the /auth/google/callback page
  // calls completeOAuth() on return.
  const loginWithProvider = useCallback(async (provider: 'google' | 'apple') => {
    const supabase = getSupabaseAuth()
    if (!supabase) throw new Error('OAuth is not configured')
    const redirectTo = `${window.location.origin}/auth/google/callback`
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })
    if (error) throw error
    // The browser now redirects to the provider; control leaves the page.
  }, [])

  const completeOAuth = useCallback(async () => {
    const supabase = getSupabaseAuth()
    if (!supabase) throw new Error('OAuth is not configured')
    const url = new URL(window.location.href)
    const oauthErr = url.searchParams.get('error_description') ?? url.searchParams.get('error')
    if (oauthErr) throw new Error(oauthErr)
    const code = url.searchParams.get('code')
    if (!code) throw new Error('Missing authorization code')

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error || !data.session) throw error ?? new Error('OAuth exchange failed')

    // Hand the session to the app's own token store + provision the DB user.
    saveSession(
      { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
      true,
    )
    const { user } = await api.post<{ user: AuthUser }>('/auth/oauth/sync')
    setUser(user)
    // Clear supabase-js's local copy WITHOUT revoking (we reuse those tokens).
    await supabase.auth.signOut({ scope: 'local' })
  }, [])

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout') } catch {}
    clearSession()
    setUser(null)
  }, [])

  const updateUser = useCallback((updates: Partial<AuthUser>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, loginWithEmail, signupWithEmail, sendOtp, verifyOtp, verifyEmailOtp, resendEmailOtp, forgotPassword, updatePassword, loginWithProvider, completeOAuth, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
