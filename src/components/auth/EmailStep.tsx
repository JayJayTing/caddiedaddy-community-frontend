'use client'
import { useState } from 'react'
import { useLang } from '@/contexts/LanguageContext'
import { Pressable } from '@/components/ui/Pressable'

interface Props {
  onBack: () => void
  onLogin: (email: string, password: string, rememberMe: boolean) => void
  onSignup: (email: string, password: string, displayName: string) => void
  onForgot: (email: string) => void
  isLoading: boolean
  error?: string
}

export function EmailStep({ onBack, onLogin, onSignup, onForgot, isLoading, error }: Props) {
  const { t } = useLang()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(true)

  const isValid = email.includes('@') && password.length >= 6 && (mode === 'signin' || displayName.trim().length > 0)

  const handleSubmit = () => {
    if (!isValid || isLoading) return
    if (mode === 'signin') {
      onLogin(email, password, rememberMe)
    } else {
      onSignup(email, password, displayName)
    }
  }

  const fieldStyle = (name: string) => ({
    background: 'var(--surface)',
    border: `1.5px solid ${focusedField === name ? 'var(--primary)' : 'var(--line)'}`,
    borderRadius: 'var(--r-lg)',
    padding: '14px 18px',
    marginBottom: 12,
    transition: 'border-color .15s',
  })

  const inputStyle: React.CSSProperties = {
    width: '100%', border: 'none', outline: 'none', background: 'transparent',
    fontSize: 16, color: 'var(--ink)', fontWeight: 500, fontFamily: 'var(--sans)',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase',
    color: 'var(--ink-3)', marginBottom: 6, display: 'block',
  }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <div style={{ height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 20px' }}>
        <Pressable onClick={onBack} aria-label={t('a11y.back')} style={{ width: 36, height: 36, background: 'var(--bg-alt)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </Pressable>
      </div>

      <div style={{ padding: '4px 28px 0', flex: 1, overflowY: 'auto' }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.15, marginBottom: 8, whiteSpace: 'pre-line' }}>
          {t('auth.email.title')}
        </div>
        <div style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 28 }}>{t('auth.email.subtitle')}</div>

        {mode === 'signup' && (
          <div style={fieldStyle('name')}>
            <label style={labelStyle}>{t('auth.email.nameLabel')}</label>
            <input
              type="text"
              placeholder={t('auth.email.namePlaceholder')}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
              style={inputStyle}
            />
          </div>
        )}

        <div style={fieldStyle('email')}>
          <label style={labelStyle}>{t('auth.email.label')}</label>
          <input
            type="email"
            inputMode="email"
            placeholder={t('auth.email.placeholder')}
            value={email}
            onChange={e => setEmail(e.target.value)}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            style={inputStyle}
            autoComplete="email"
          />
        </div>

        <div style={fieldStyle('password')}>
          <label style={labelStyle}>{t('auth.email.passwordLabel')}</label>
          <input
            type="password"
            placeholder={t('auth.email.passwordPlaceholder')}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
            style={inputStyle}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
        </div>

        {mode === 'signin' && (
          <Pressable
            role="checkbox"
            aria-checked={rememberMe}
            onClick={() => setRememberMe(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer', userSelect: 'none' }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: 6, flexShrink: 0,
              border: `2px solid ${rememberMe ? 'var(--primary)' : 'var(--line)'}`,
              background: rememberMe ? 'var(--primary)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background .15s, border-color .15s',
            }}>
              {rememberMe && (
                <svg aria-hidden width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span style={{ fontSize: 14, color: 'var(--ink-2)', fontWeight: 500 }}>{t('auth.email.rememberMe')}</span>
          </Pressable>
        )}

        {mode === 'signin' && (
          <div style={{ textAlign: 'right', marginBottom: 16, marginTop: -4 }}>
            <Pressable className="link" onClick={() => onForgot(email)} style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>
              {t('auth.email.forgot')}
            </Pressable>
          </div>
        )}

        {error && (
          <div style={{ fontSize: 12, color: '#C0392B', textAlign: 'center', marginBottom: 12 }}>{error}</div>
        )}

        <Pressable
          onClick={handleSubmit}
          style={{
            display: 'block',
            background: 'var(--primary)',
            borderRadius: 'var(--r-lg)',
            padding: 18,
            textAlign: 'center',
            cursor: isValid && !isLoading ? 'pointer' : 'default',
            WebkitTapHighlightColor: 'transparent',
            boxShadow: 'var(--shadow-cta)',
            marginBottom: 14,
            marginTop: 4,
            opacity: isValid && !isLoading ? 1 : 0.5,
            transition: 'opacity .15s',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>
            {isLoading ? '…' : mode === 'signin' ? t('auth.email.signIn') : t('auth.email.createAccount')}
          </span>
        </Pressable>

        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <Pressable
            className="link"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
          >
            {mode === 'signin' ? t('auth.email.switchToSignup') : t('auth.email.switchToSignin')}
          </Pressable>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Pressable className="link" onClick={onBack} style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>
            {t('auth.email.usePhone')}
          </Pressable>
        </div>
      </div>
    </div>
  )
}
