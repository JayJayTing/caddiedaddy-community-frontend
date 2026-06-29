import { CSSProperties } from 'react'

// Shimmering placeholder block. Use instead of bare "loading…" text so screens
// keep their shape while data arrives. Decorative — hidden from screen readers.
export function Skeleton({
  w = '100%', h = 14, r = 'var(--r-sm)', style,
}: { w?: number | string; h?: number | string; r?: number | string; style?: CSSProperties }) {
  return <div className="skeleton" aria-hidden style={{ width: w, height: h, borderRadius: r, ...style }} />
}

// Matches the round list-card silhouette (80px art thumb + text lines).
export function RoundCardSkeleton() {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', display: 'flex' }}>
      <Skeleton w={80} h={80} r={0} />
      <div style={{ flex: 1, padding: '13px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton w="70%" h={14} />
        <Skeleton w="90%" h={11} />
        <Skeleton w={90} h={20} r="var(--r-pill)" style={{ marginTop: 2 }} />
      </div>
    </div>
  )
}

// Matches a community post card (author row + body lines).
export function PostCardSkeleton() {
  return (
    <div className="post-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Skeleton w={36} h={36} r="50%" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skeleton w="40%" h={12} />
          <Skeleton w="55%" h={10} />
        </div>
      </div>
      <Skeleton w="100%" h={12} style={{ marginBottom: 7 }} />
      <Skeleton w="80%" h={12} />
    </div>
  )
}
