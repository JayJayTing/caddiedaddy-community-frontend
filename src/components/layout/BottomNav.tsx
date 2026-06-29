'use client'
import { useUI, Screen } from '@/contexts/UIContext'
import { useLang } from '@/contexts/LanguageContext'
import { Pressable } from '@/components/ui/Pressable'

export function BottomNav() {
  const { activeScreen, setActiveScreen } = useUI()
  const { t } = useLang()

  const navColor = (s: Screen) => (activeScreen === s ? 'var(--primary)' : 'var(--ink-3)')

  return (
    <nav className="bnav" aria-label={t('nav.home')}>
      {/* Home */}
      <Pressable
        className={`bnav-item${activeScreen === 'home' ? ' active' : ''}`}
        aria-current={activeScreen === 'home' ? 'page' : undefined}
        onClick={() => setActiveScreen('home')}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden
          stroke={navColor('home')} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span className="bnav-label">{t('nav.home')}</span>
      </Pressable>

      {/* Rounds */}
      <Pressable
        className={`bnav-item${activeScreen === 'rounds' ? ' active' : ''}`}
        aria-current={activeScreen === 'rounds' ? 'page' : undefined}
        onClick={() => setActiveScreen('rounds')}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden
          stroke={navColor('rounds')} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="3"/>
          <line x1="12" y1="2" x2="12" y2="9"/>
        </svg>
        <span className="bnav-label">{t('nav.rounds')}</span>
      </Pressable>

      {/* Chat FAB */}
      <Pressable
        className="bnav-item"
        style={{ flex: 1.2 }}
        aria-current={activeScreen === 'chat' ? 'page' : undefined}
        onClick={() => setActiveScreen('chat')}
      >
        <div className="bnav-fab">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden
            stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <span className="bnav-label" style={{ color: navColor('chat') }}>
          {t('nav.chat')}
        </span>
      </Pressable>

      {/* Community */}
      <Pressable
        className={`bnav-item${activeScreen === 'community' ? ' active' : ''}`}
        aria-current={activeScreen === 'community' ? 'page' : undefined}
        onClick={() => setActiveScreen('community')}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden
          stroke={navColor('community')} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <span className="bnav-label">{t('nav.community')}</span>
      </Pressable>

      {/* Profile */}
      <Pressable
        className={`bnav-item${activeScreen === 'profile' ? ' active' : ''}`}
        aria-current={activeScreen === 'profile' ? 'page' : undefined}
        onClick={() => setActiveScreen('profile')}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden
          stroke={navColor('profile')} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span className="bnav-label">{t('nav.profile')}</span>
      </Pressable>
    </nav>
  )
}
