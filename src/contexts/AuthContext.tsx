'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { AuthUser, AuthResponse } from '@/types/auth'
import { api } from '@/lib/api'

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  loginWithEmail: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  signupWithEmail: (email: string, password: string, displayName: string) => Promise<void>
  sendOtp: (phone: string) => Promise<void>
  verifyOtp: (phone: string, token: string) => Promise<void>
  getGoogleUrl: () => Promise<string>
  handleGoogleCallback: (code: string) => Promise<void>
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

  const signupWithEmail = useCallback(async (email: string, password: string, displayName: string) => {
    const { session, user } = await api.post<AuthResponse>('/auth/signup', { email, password, displayName })
    saveSession(session)
    setUser(user)
  }, [])

  const sendOtp = useCallback(async (phone: string) => {
    await api.post('/auth/phone/send-otp', { phone, channel: 'sms' })
  }, [])

  const verifyOtp = useCallback(async (phone: string, token: string) => {
    const { session, user } = await api.post<AuthResponse>('/auth/verify-otp', { phone, token, type: 'sms' })
    saveSession(session)
    setUser(user)
  }, [])

  const getGoogleUrl = useCallback(async (): Promise<string> => {
    const callbackUrl = `${window.location.origin}/auth/google/callback`
    const { url } = await api.get<{ url: string }>(`/auth/google/url?redirectTo=${encodeURIComponent(callbackUrl)}`)
    return url
  }, [])

  const handleGoogleCallback = useCallback(async (code: string) => {
    const { session, user } = await api.post<AuthResponse>('/auth/google/callback', { code })
    saveSession(session)
    setUser(user)
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
    <AuthContext.Provider value={{ user, isLoading, loginWithEmail, signupWithEmail, sendOtp, verifyOtp, getGoogleUrl, handleGoogleCallback, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
