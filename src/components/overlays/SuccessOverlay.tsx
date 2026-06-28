'use client'
import { useEffect } from 'react'
import { useUI } from '@/contexts/UIContext'

// Global success confirmation. Shows an animated checkmark card (App Store / Play Store
// style) whenever UIContext.success is set via showSuccess(). Auto-dismisses; tap to close.
export function SuccessOverlay() {
  const { success, hideSuccess } = useUI()

  useEffect(() => {
    if (!success) return
    const id = setTimeout(hideSuccess, 1800)
    return () => clearTimeout(id)
  }, [success, hideSuccess])

  return (
    <div
      className={`success-layer${success ? ' show' : ''}`}
      onClick={hideSuccess}
      aria-hidden={!success}
    >
      {success && (
        <div className="success-card" role="status" onClick={hideSuccess}>
          <div className="success-badge">
            <svg width="64" height="64" viewBox="0 0 56 56" fill="none">
              <circle className="success-ring" cx="28" cy="28" r="26" stroke="#2E7D32" strokeWidth="3" />
              <path className="success-check" d="M16 29 L25 38 L42 19" stroke="#2E7D32" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>{success.title}</div>
            {success.subtitle && (
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>{success.subtitle}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
