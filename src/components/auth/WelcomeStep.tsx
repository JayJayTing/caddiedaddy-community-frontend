'use client'
import { useLang } from '@/contexts/LanguageContext'
import { Pressable } from '@/components/ui/Pressable'

interface Props {
  onNext: () => void
  onSignIn: () => void
}

export function WelcomeStep({ onNext, onSignIn }: Props) {
  const { t } = useLang()
  const tagline = t('auth.welcome.tagline')

  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(160deg,#1E3A52 0%,#2C5F48 52%,#1C2E40 100%)',
    }}>
      {/* Background SVG art */}
      <svg viewBox="0 0 390 844" fill="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <path d="M-10 610 Q90 568 200 588 Q318 608 410 572 L410 850 L-10 850 Z" fill="rgba(255,255,255,.055)"/>
        <path d="M-10 672 Q70 644 200 656 Q310 666 410 640 L410 850 L-10 850 Z" fill="rgba(255,255,255,.038)"/>
        <path d="M-10 724 Q100 710 200 716 Q305 722 410 706 L410 850 L-10 850 Z" fill="rgba(255,255,255,.025)"/>
        <line x1="298" y1="338" x2="298" y2="210" stroke="rgba(255,255,255,.55)" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M298 210 L332 224 L298 240 Z" fill="rgba(255,255,255,.7)"/>
        <ellipse cx="298" cy="340" rx="8" ry="3.5" fill="rgba(0,0,0,.22)"/>
        <circle cx="72" cy="560" r="22" fill="rgba(255,255,255,.03)"/>
        <circle cx="100" cy="548" r="16" fill="rgba(255,255,255,.03)"/>
        <circle cx="54" cy="554" r="14" fill="rgba(255,255,255,.025)"/>
        <circle cx="330" cy="110" r="80" fill="rgba(255,255,255,.025)"/>
        <circle cx="330" cy="110" r="45" fill="rgba(255,255,255,.03)"/>
        <path d="M88 520 Q180 320 298 338" stroke="rgba(255,255,255,.12)" strokeWidth="1.5" strokeDasharray="4 6" fill="none" strokeLinecap="round"/>
        <circle cx="88" cy="520" r="5" fill="rgba(255,255,255,.45)"/>
      </svg>

      <div style={{ height: 56, flexShrink: 0 }} />

      {/* Brand */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px' }}>
        <div style={{
          width: 80, height: 80,
          background: 'rgba(255,255,255,.1)',
          borderRadius: 26,
          border: '1.5px solid rgba(255,255,255,.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(10px)',
          marginBottom: 22,
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="3"/>
            <line x1="12" y1="2" x2="12" y2="9"/>
          </svg>
        </div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 36, fontWeight: 500, color: 'white', letterSpacing: '-.5px', textAlign: 'center', lineHeight: 1.1, marginBottom: 14 }}>
          CaddieDaddy
        </div>
        <div style={{ fontSize: 15, color: 'rgba(255,255,255,.6)', textAlign: 'center', lineHeight: 1.65, maxWidth: 230, fontWeight: 400, whiteSpace: 'pre-line' }}>
          {tagline}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '0 24px 44px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        <Pressable
          onClick={onNext}
          style={{
            background: 'white', borderRadius: 'var(--r-lg)', padding: 18,
            textAlign: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            transition: 'opacity .12s',
          }}
          onMouseDown={e => (e.currentTarget.style.opacity = '.88')}
          onMouseUp={e => (e.currentTarget.style.opacity = '1')}
          onTouchStart={e => (e.currentTarget.style.opacity = '.88')}
          onTouchEnd={e => (e.currentTarget.style.opacity = '1')}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1A2B3C' }}>
            {t('auth.welcome.cta')}
          </span>
        </Pressable>
        <div style={{ textAlign: 'center', padding: 4 }}>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,.45)' }}>{t('auth.welcome.signin')} </span>
          <Pressable
            className="link"
            onClick={onSignIn}
            style={{ fontSize: 14, color: 'rgba(255,255,255,.82)', fontWeight: 700, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
          >
            {t('auth.welcome.signinLink')}
          </Pressable>
        </div>
      </div>
    </div>
  )
}
