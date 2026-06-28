'use client'
import { useUI } from '@/contexts/UIContext'
import { useLang } from '@/contexts/LanguageContext'
import { Announcement } from '@/types/announcement'
import { BottomSheet } from './BottomSheet'

export function NewsDetailSheet() {
  const { openSheet, closeSheet, sheetData } = useUI()
  const { t } = useLang()
  const isOpen = openSheet === 'newsDetail'
  const ann = sheetData as Announcement | null

  return (
    <BottomSheet isOpen={isOpen} onClose={closeSheet} title={t('home.news')}>
      {ann && (
        <div style={{ padding: '4px 20px 28px' }}>
          <div style={{ height: 150, borderRadius: 'var(--r-lg)', background: `linear-gradient(135deg,${ann.color1} 0%,${ann.color2} 100%)`, position: 'relative', overflow: 'hidden', marginBottom: 16 }}>
            <svg viewBox="0 0 320 150" fill="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              <path d="M0 100 Q80 78 160 92 Q240 106 324 84 L324 154 L0 154 Z" fill="rgba(255,255,255,.12)" />
              <path d="M0 120 Q70 108 160 116 Q250 124 324 108 L324 154 L0 154 Z" fill="rgba(255,255,255,.08)" />
            </svg>
            <div style={{ position: 'absolute', bottom: 12, left: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 'var(--r-pill)', background: 'rgba(255,255,255,.22)', color: 'white' }}>
                {ann.badge}
              </span>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 6 }}>
            {new Date(ann.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 12, lineHeight: 1.25 }}>{ann.title}</div>
          <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{ann.body}</div>
        </div>
      )}
    </BottomSheet>
  )
}
