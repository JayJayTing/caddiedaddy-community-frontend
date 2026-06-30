'use client'
import { useUI } from '@/contexts/UIContext'
import { useLang } from '@/contexts/LanguageContext'
import { BottomSheet } from './BottomSheet'
import { Pressable } from '@/components/ui/Pressable'
import type { TranslationKey } from '@/lib/translations'

// The "Play" FAB menu — one front door to playing golf. Hosting a round and
// booking a tee time are the two ways to play, so they live behind one action.
const OPTIONS: Array<{ emoji: string; titleKey: TranslationKey; subKey: TranslationKey; action: 'host' | 'book' }> = [
  { emoji: '⛳', titleKey: 'play.hostTitle', subKey: 'play.hostSub', action: 'host' },
  { emoji: '🕑', titleKey: 'play.bookTitle', subKey: 'play.bookSub', action: 'book' },
]

export function PlaySheet() {
  const { openSheet, closeSheet, setActiveScreen, openOverlayWith, setHostCommunity } = useUI()
  const { t } = useLang()
  const isOpen = openSheet === 'play'

  const run = (action: 'host' | 'book') => {
    closeSheet()
    if (action === 'host') {
      setHostCommunity(null)
      setActiveScreen('host')
    } else {
      openOverlayWith('teeTimes')
    }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={closeSheet} title={t('play.title')}>
      <div style={{ padding: '8px 20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {OPTIONS.map((o) => (
          <Pressable
            key={o.action}
            onClick={() => run(o.action)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 16px', borderRadius: 'var(--r-lg)', border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer' }}
          >
            <span style={{ fontSize: 26, lineHeight: 1 }}>{o.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{t(o.titleKey)}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>{t(o.subKey)}</div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Pressable>
        ))}
      </div>
    </BottomSheet>
  )
}
