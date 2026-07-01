'use client'
import { Pressable } from '@/components/ui/Pressable'

// Forely error state — warm #FFE1CC tile with a warning triangle in
// --primary-deep, Sora title, copy, and a "Try again" primary CTA.
// Presentational: callers pass already-translated strings.
export function ErrorState({
  title,
  message,
  retryLabel,
  onRetry,
}: {
  title: string
  message?: string
  retryLabel?: string
  onRetry?: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 32px' }}>
      <div style={{ width: 96, height: 96, borderRadius: 30, background: '#FFE1CC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="var(--primary-deep)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <div className="serif" style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', marginTop: 22, letterSpacing: '-.01em' }}>{title}</div>
      {message && (
        <div style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 500, marginTop: 8, lineHeight: 1.55, maxWidth: 280 }}>{message}</div>
      )}
      {onRetry && retryLabel && (
        <Pressable
          onClick={onRetry}
          style={{ marginTop: 24, background: 'var(--primary)', borderRadius: 15, padding: '14px 30px', boxShadow: 'var(--shadow-cta)', cursor: 'pointer' }}
        >
          <span className="serif" style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{retryLabel}</span>
        </Pressable>
      )}
    </div>
  )
}
