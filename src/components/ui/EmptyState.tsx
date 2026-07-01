'use client'
import { Pressable } from '@/components/ui/Pressable'

// Forely empty state — centered 96px primary-soft tile with a glyph, Sora title,
// supportive copy, and an optional primary CTA + secondary text link. Purely
// presentational: callers pass already-translated strings (never hardcode copy).
export function EmptyState({
  emoji = '⛳',
  title,
  message,
  action,
  secondary,
}: {
  emoji?: string
  title: string
  message?: string
  action?: { label: string; onClick: () => void }
  secondary?: { label: string; onClick: () => void }
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 32px' }}>
      <div style={{ width: 96, height: 96, borderRadius: 30, background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>
        {emoji}
      </div>
      <div className="serif" style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', marginTop: 22, letterSpacing: '-.01em' }}>{title}</div>
      {message && (
        <div style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 500, marginTop: 8, lineHeight: 1.55, maxWidth: 280 }}>{message}</div>
      )}
      {action && (
        <Pressable
          onClick={action.onClick}
          style={{ marginTop: 24, background: 'var(--primary)', borderRadius: 15, padding: '14px 28px', boxShadow: 'var(--shadow-cta)', cursor: 'pointer' }}
        >
          <span className="serif" style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{action.label}</span>
        </Pressable>
      )}
      {secondary && (
        <Pressable className="link" onClick={secondary.onClick} style={{ marginTop: 14, cursor: 'pointer' }}>
          <span className="serif" style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--primary)' }}>{secondary.label}</span>
        </Pressable>
      )}
    </div>
  )
}
