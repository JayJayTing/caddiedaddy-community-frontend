'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LanguageContext'
import { Pressable } from '@/components/ui/Pressable'

// Return target for LINE login. Validates state, then the backend verifies the
// id_token + mints a session.
export default function LineCallbackPage() {
  const router = useRouter()
  const { completeLine } = useAuth()
  const { t } = useLang()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    completeLine()
      .then(() => router.replace('/home'))
      .catch((e) => setError(e instanceof Error ? e.message : t('auth.error.signInFailed')))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--sans)', padding: 24, textAlign: 'center' }}>
      {error ? (
        <div>
          <p style={{ color: '#C0392B', marginBottom: 12, fontSize: 14 }}>{error}</p>
          <Pressable className="link" onClick={() => router.replace('/')} style={{ color: 'var(--primary)', fontWeight: 700 }}>{t('common.back')}</Pressable>
        </div>
      ) : (
        <p style={{ color: 'var(--ink-2)' }}>{t('loading.signingIn')}</p>
      )}
    </div>
  )
}
