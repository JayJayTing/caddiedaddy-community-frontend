'use client'
import { useUI, Screen } from '@/contexts/UIContext'
import { useLang } from '@/contexts/LanguageContext'

export function BottomNav() {
  const { activeScreen, setActiveScreen } = useUI()
  const { t } = useLang()

  return (
    <nav className="bnav">
      {/* Home */}
      <div
        className={`bnav-item${activeScreen === 'home' ? ' active' : ''}`}
        onClick={() => setActiveScreen('home')}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke={activeScreen === 'home' ? 'var(--primary)' : 'var(--ink-3)'}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span className="bnav-label">{t('nav.home')}</span>
      </div>

      {/* Rounds */}
      <div
        className={`bnav-item${activeScreen === 'rounds' ? ' active' : ''}`}
        onClick={() => setActiveScreen('rounds')}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke={activeScreen === 'rounds' ? 'var(--primary)' : 'var(--ink-3)'}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="3"/>
          <line x1="12" y1="2" x2="12" y2="9"/>
        </svg>
        <span className="bnav-label">{t('nav.rounds')}</span>
      </div>

      {/* Chat FAB */}
      <div className="bnav-item" style={{ flex: 1.2 }} onClick={() => setActiveScreen('chat')}>
        <div className="bnav-fab">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <span className="bnav-label" style={{ color: activeScreen === 'chat' ? 'var(--primary)' : 'var(--ink-3)' }}>
          {t('nav.chat')}
        </span>
      </div>

      {/* Community */}
      <div
        className={`bnav-item${activeScreen === 'community' ? ' active' : ''}`}
        onClick={() => setActiveScreen('community')}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke={activeScreen === 'community' ? 'var(--primary)' : 'var(--ink-3)'}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <span className="bnav-label">{t('nav.community')}</span>
      </div>

      {/* Profile */}
      <div
        className={`bnav-item${activeScreen === 'profile' ? ' active' : ''}`}
        onClick={() => setActiveScreen('profile')}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke={activeScreen === 'profile' ? 'var(--primary)' : 'var(--ink-3)'}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span className="bnav-label">{t('nav.profile')}</span>
      </div>
    </nav>
  )
}
