'use client'
import { Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LanguageContext'

function GoogleCallbackInner() {
  const params = useSearchParams()
  const router = useRouter()
  const { handleGoogleCallback } = useAuth()
  const { t } = useLang()

  useEffect(() => {
    const code = params.get('code')
    if (!code) { router.replace('/'); return }
    handleGoogleCallback(code)
      .then(() => router.replace('/home'))
      .catch(() => router.replace('/'))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--sans)' }}>
      <p style={{ color: 'var(--ink-2)' }}>{t('loading.signingIn')}</p>
    </div>
  )
}

function SigningInFallback() {
  const { t } = useLang()
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--sans)' }}>
      <p style={{ color: 'var(--ink-2)' }}>{t('loading.signingIn')}</p>
    </div>
  )
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<SigningInFallback />}>
      <GoogleCallbackInner />
    </Suspense>
  )
}
