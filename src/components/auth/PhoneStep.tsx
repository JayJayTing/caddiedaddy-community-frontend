'use client'
import { useState } from 'react'
import { useLang } from '@/contexts/LanguageContext'

interface Props {
  onBack: () => void
  onSendCode: (phone: string) => void
  onUseEmail: () => void
  isLoading: boolean
  error?: string
}

export function PhoneStep({ onBack, onSendCode, onUseEmail, isLoading, error }: Props) {
  const { t } = useLang()
  const [phone, setPhone] = useState('')
  const [focused, setFocused] = useState(false)

  const isValid = phone.replace(/\D/g, '').length >= 8

  const handleSubmit = () => {
    if (!isValid || isLoading) return
    onSendCode('+886' + phone.replace(/\D/g, ''))
  }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <div style={{ height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 20px' }}>
        <div onClick={onBack} style={{ width: 36, height: 36, background: 'var(--bg-alt)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </div>
      </div>

      <div style={{ padding: '4px 28px 0', flex: 1, overflowY: 'auto' }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.15, marginBottom: 8, whiteSpace: 'pre-line' }}>
          {t('auth.phone.title')}
        </div>
        <div style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 36 }}>{t('auth.phone.subtitle')}</div>

        <div style={{
          background: 'var(--surface)',
          border: `1.5px solid ${focused ? 'var(--primary)' : 'var(--line)'}`,
          borderRadius: 'var(--r-lg)',
          overflow: 'hidden',
          marginBottom: 14,
          transition: 'border-color .15s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', gap: 10, borderBottom: '1px solid var(--line-soft)' }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>🇹🇼</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>+886</span>
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Taiwan</span>
            <svg style={{ marginLeft: 'auto' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          <div style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>
              {t('auth.phone.label')}
            </div>
            <input
              type="tel"
              inputMode="numeric"
              placeholder={t('auth.phone.placeholder')}
              maxLength={12}
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/[^\d\s]/g, ''))}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontSize: 24, fontWeight: 600, color: 'var(--ink)', letterSpacing: 2, fontFamily: 'var(--sans)',
              }}
            />
          </div>
        </div>

        {error && (
          <div style={{ fontSize: 12, color: '#C0392B', textAlign: 'center', marginBottom: 8 }}>{error}</div>
        )}

        <div style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', marginBottom: 28 }}>{t('auth.phone.smsNote')}</div>

        <div
          onClick={handleSubmit}
          style={{
            background: 'var(--primary)',
            borderRadius: 'var(--r-lg)',
            padding: 18,
            textAlign: 'center',
            cursor: isValid && !isLoading ? 'pointer' : 'default',
            WebkitTapHighlightColor: 'transparent',
            boxShadow: '0 4px 16px rgba(92,122,154,.3)',
            marginBottom: 16,
            opacity: isValid && !isLoading ? 1 : 0.5,
            transition: 'opacity .15s',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>
            {isLoading ? '…' : t('auth.phone.sendCode')}
          </span>
        </div>

        <div style={{ textAlign: 'center' }}>
          <span onClick={onUseEmail} style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>
            {t('auth.phone.useEmail')}
          </span>
        </div>
      </div>
    </div>
  )
}
