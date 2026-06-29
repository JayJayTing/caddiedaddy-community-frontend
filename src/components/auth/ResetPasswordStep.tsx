'use client'
import { useState } from 'react'
import { useLang } from '@/contexts/LanguageContext'

interface Props {
  onBack: () => void
  onSubmit: (password: string) => void
  isLoading: boolean
  error?: string
}

export function ResetPasswordStep({ onBack, onSubmit, isLoading, error }: Props) {
  const { t } = useLang()
  const [password, setPassword] = useState('')
  const [focused, setFocused] = useState(false)
  const valid = password.length >= 8

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <div style={{ height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 20px' }}>
        <div onClick={onBack} style={{ width: 36, height: 36, background: 'var(--bg-alt)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </div>
      </div>

      <div style={{ padding: '4px 28px 0' }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.15, marginBottom: 8, whiteSpace: 'pre-line' }}>
          {t('auth.reset.title')}
        </div>
        <div style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 28 }}>{t('auth.reset.subtitle')}</div>

        <div style={{ background: 'var(--surface)', border: `1.5px solid ${focused ? 'var(--primary)' : 'var(--line)'}`, borderRadius: 'var(--r-lg)', padding: '14px 18px', marginBottom: 16, transition: 'border-color .15s' }}>
          <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6, display: 'block' }}>
            {t('auth.reset.label')}
          </label>
          <input
            type="password"
            placeholder={t('auth.email.passwordPlaceholder')}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoComplete="new-password"
            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 16, color: 'var(--ink)', fontWeight: 500, fontFamily: 'var(--sans)' }}
          />
        </div>

        {error && (
          <div style={{ fontSize: 12, color: '#C0392B', textAlign: 'center', marginBottom: 12 }}>{error}</div>
        )}

        <div
          onClick={() => { if (valid && !isLoading) onSubmit(password) }}
          style={{
            background: 'var(--primary)',
            borderRadius: 'var(--r-lg)',
            padding: 18,
            textAlign: 'center',
            cursor: valid && !isLoading ? 'pointer' : 'default',
            WebkitTapHighlightColor: 'transparent',
            boxShadow: '0 4px 16px rgba(92,122,154,.3)',
            opacity: valid && !isLoading ? 1 : 0.5,
            transition: 'opacity .15s',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>{isLoading ? '…' : t('auth.reset.submit')}</span>
        </div>
      </div>
    </div>
  )
}
