'use client'
import { useLang } from '@/contexts/LanguageContext'

// Small red "Cancelled" pill shown wherever a cancelled round can surface — the
// Home next-round card, the rounds list, profile history, and the detail overlay.
// Centralized so the label + colour stay identical everywhere a cancelled round
// appears.
export function CancelledBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const { t } = useLang()
  const md = size === 'md'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: md ? '4px 12px' : '3px 8px',
        borderRadius: 'var(--r-pill)',
        fontSize: md ? 12 : 11,
        fontWeight: 700,
        background: '#FDECEA',
        color: '#C0392B',
        whiteSpace: 'nowrap',
      }}
    >
      {t('rounds.cancelled')}
    </span>
  )
}
