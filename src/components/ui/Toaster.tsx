'use client'
import { useEffect } from 'react'
import { useUI } from '@/contexts/UIContext'

// Global, transient message surface. The app already had a success-checkmark
// channel (showSuccess) but no way to tell the user when an action FAILED —
// every catch was silent. showToast(..., 'error') fills that gap.
export function Toaster() {
  const { toast, hideToast } = useUI()

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(hideToast, toast.variant === 'error' ? 4200 : 2600)
    return () => clearTimeout(id)
  }, [toast, hideToast])

  return (
    <div
      className={`app-toast app-toast--${toast?.variant ?? 'info'}${toast ? ' show' : ''}`}
      role={toast?.variant === 'error' ? 'alert' : 'status'}
      aria-live={toast?.variant === 'error' ? 'assertive' : 'polite'}
    >
      {toast?.message}
    </div>
  )
}
