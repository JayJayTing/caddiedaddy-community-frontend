'use client'
import { useState, useRef, useEffect } from 'react'
import { useLang } from '@/contexts/LanguageContext'
import { useOtpTimer } from '@/hooks/useOtpTimer'

interface Props {
  onBack: () => void
  onVerify: (otp: string) => void
  onResend: () => void
  phone: string
  isLoading: boolean
  error?: string
}

export function OtpStep({ onBack, onVerify, onResend, phone, isLoading, error }: Props) {
  const { t } = useLang()
  const [otp, setOtp] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { active, label, start } = useOtpTimer(42)

  useEffect(() => {
    start()
    setTimeout(() => inputRef.current?.focus(), 100)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 6)
    setOtp(digits)
  }

  const handleVerify = () => {
    if (otp.length !== 6 || isLoading) return
    onVerify(otp)
  }

  const handleResend = () => {
    onResend()
    start()
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

      <div style={{ padding: '4px 28px 0' }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.15, marginBottom: 8, whiteSpace: 'pre-line' }}>
          {t('auth.otp.title')}
        </div>
        <div style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 36 }}>
          {t('auth.otp.subtitle')}{' '}
          <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{phone}</span>
        </div>

        {/* Hidden real input */}
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          maxLength={6}
          value={otp}
          onChange={e => handleChange(e.target.value)}
          style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
        />

        {/* OTP boxes */}
        <div
          style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28 }}
          onClick={() => inputRef.current?.focus()}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 48, height: 60,
                background: 'var(--surface)',
                border: `1.5px solid ${otp.length === i ? 'var(--primary)' : otp[i] ? 'var(--primary)' : 'var(--line)'}`,
                borderRadius: 'var(--r-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, fontWeight: 700, color: 'var(--ink)',
                cursor: 'text',
                transition: 'border-color .15s',
              }}
            >
              {otp[i] || ''}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ fontSize: 12, color: '#C0392B', textAlign: 'center', marginBottom: 16 }}>{error}</div>
        )}

        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{t('auth.otp.noCode')} </span>
          {active ? (
            <span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>
              {t('auth.otp.resendIn')} {label}
            </span>
          ) : (
            <span
              onClick={handleResend}
              style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
            >
              {t('auth.otp.resend')}
            </span>
          )}
        </div>

        <div
          onClick={handleVerify}
          style={{
            background: 'var(--primary)',
            borderRadius: 'var(--r-lg)',
            padding: 18,
            textAlign: 'center',
            cursor: otp.length === 6 && !isLoading ? 'pointer' : 'default',
            WebkitTapHighlightColor: 'transparent',
            boxShadow: '0 4px 16px rgba(92,122,154,.3)',
            opacity: otp.length === 6 && !isLoading ? 1 : 0.5,
            transition: 'opacity .15s',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>
            {isLoading ? '…' : t('auth.otp.verify')}
          </span>
        </div>
      </div>
    </div>
  )
}
