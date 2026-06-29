'use client'
import { useLang } from '@/contexts/LanguageContext'
import { Pressable } from '@/components/ui/Pressable'

export type AuthMethod = 'apple' | 'google' | 'line' | 'phone' | 'email'

interface Props {
  onBack: () => void
  onSelect: (method: AuthMethod) => void
}

const BackButton = ({ onClick }: { onClick: () => void }) => {
  const { t } = useLang()
  return (
    <Pressable
      onClick={onClick}
      aria-label={t('a11y.back')}
      style={{ width: 36, height: 36, background: 'var(--bg-alt)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
    >
      <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
    </Pressable>
  )
}

export function MethodStep({ onBack, onSelect }: Props) {
  const { t } = useLang()

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <div style={{ height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 20px' }}>
        <BackButton onClick={onBack} />
      </div>

      <div style={{ padding: '4px 28px 28px', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.15, marginBottom: 8, whiteSpace: 'pre-line' }}>
          {t('auth.method.title')}
        </div>
        <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>{t('auth.method.subtitle')}</div>
      </div>

      <div style={{ padding: '0 22px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {/* Apple */}
        <Pressable
          onClick={() => onSelect('apple')}
          style={{ background: '#1C1C1E', borderRadius: 'var(--r-lg)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
        >
          <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'white', letterSpacing: '-.1px' }}>{t('auth.method.apple')}</span>
        </Pressable>

        {/* Google */}
        <Pressable
          onClick={() => onSelect('google')}
          style={{ background: 'white', borderRadius: 'var(--r-lg)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', border: '1.5px solid var(--line)', WebkitTapHighlightColor: 'transparent' }}
        >
          <svg aria-hidden width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-.1px' }}>{t('auth.method.google')}</span>
        </Pressable>

        {/* LINE */}
        <Pressable
          onClick={() => onSelect('line')}
          style={{ background: '#06C755', borderRadius: 'var(--r-lg)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
        >
          <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 5.64 2 10.13c0 4.02 3.58 7.39 8.42 8.03.33.07.78.22.89.5.1.26.07.66.03.92l-.14.86c-.04.26-.2 1.01.89.55 1.09-.46 5.86-3.45 8-5.91 1.47-1.62 2.18-3.26 2.18-5.41C22 5.64 17.52 2 12 2zM8.4 12.6H6.9c-.22 0-.4-.18-.4-.4V9.2c0-.22.18-.4.4-.4s.4.18.4.4v2.6h1.1c.22 0 .4.18.4.4s-.18.4-.4.4zm1.7-.4c0 .22-.18.4-.4.4s-.4-.18-.4-.4V9.2c0-.22.18-.4.4-.4s.4.18.4.4v3zm3.9 0c0 .17-.11.32-.27.38-.04.01-.09.02-.13.02-.12 0-.24-.06-.32-.16l-1.23-1.67v1.43c0 .22-.18.4-.4.4s-.4-.18-.4-.4V9.2c0-.17.11-.32.27-.38.04-.01.08-.02.13-.02.12 0 .24.06.32.16l1.23 1.67V9.2c0-.22.18-.4.4-.4s.4.18.4.4v3zm2.5-1.9c.22 0 .4.18.4.4s-.18.4-.4.4h-1.1v.7h1.1c.22 0 .4.18.4.4s-.18.4-.4.4h-1.5c-.22 0-.4-.18-.4-.4V9.2c0-.22.18-.4.4-.4h1.5c.22 0 .4.18.4.4s-.18.4-.4.4h-1.1v.7h1.1z"/>
          </svg>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'white' }}>{t('auth.method.line')}</span>
        </Pressable>

        {/* Phone */}
        <Pressable
          onClick={() => onSelect('phone')}
          style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', border: '1.5px solid var(--line)', WebkitTapHighlightColor: 'transparent' }}
        >
          <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
            <line x1="12" y1="18" x2="12.01" y2="18"/>
          </svg>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{t('auth.method.phone')}</span>
        </Pressable>

        {/* Email */}
        <Pressable
          onClick={() => onSelect('email')}
          style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', border: '1.5px solid var(--line)', WebkitTapHighlightColor: 'transparent' }}
        >
          <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <polyline points="2,4 12,13 22,4"/>
          </svg>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{t('auth.method.email')}</span>
        </Pressable>
      </div>

      <div style={{ padding: '22px 28px 38px', textAlign: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.65 }}>
          {t('auth.method.terms')}{' '}
          <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{t('auth.method.termsLink')}</span>
          {' '}{t('auth.method.and')}{' '}
          <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{t('auth.method.privacyLink')}</span>
        </span>
      </div>
    </div>
  )
}
