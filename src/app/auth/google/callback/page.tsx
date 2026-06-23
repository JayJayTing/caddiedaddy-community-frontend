'use client'
import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function GoogleCallbackPage() {
  const params = useSearchParams()
  const router = useRouter()
  const { handleGoogleCallback } = useAuth()

  useEffect(() => {
    const code = params.get('code')
    if (!code) { router.replace('/'); return }
    handleGoogleCallback(code)
      .then(() => router.replace('/home'))
      .catch(() => router.replace('/'))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--sans)' }}>
      <p style={{ color: 'var(--ink-2)' }}>Signing in...</p>
    </div>
  )
}
