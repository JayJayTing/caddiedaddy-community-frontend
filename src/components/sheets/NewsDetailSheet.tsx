'use client'
import { useUI } from '@/contexts/UIContext'
import { useLang } from '@/contexts/LanguageContext'
import { Announcement } from '@/types/announcement'
import { formatDateLong, announcementImage } from '@/lib/utils'
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
          <div style={{ height: 150, borderRadius: 'var(--r-lg)', backgroundColor: ann.color2 || 'var(--sky-deep)', backgroundImage: `linear-gradient(180deg,rgba(0,0,0,.12) 0%,rgba(0,0,0,0) 45%,rgba(0,0,0,.5) 100%),url(${announcementImage(ann, { w: 640, h: 300 })})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ position: 'absolute', bottom: 12, left: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 'var(--r-pill)', background: 'rgba(255,255,255,.22)', color: 'white' }}>
                {ann.badge}
              </span>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 6 }}>
            {formatDateLong(ann.createdAt)}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 12, lineHeight: 1.25 }}>{ann.title}</div>
          <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{ann.body}</div>
        </div>
      )}
    </BottomSheet>
  )
}
