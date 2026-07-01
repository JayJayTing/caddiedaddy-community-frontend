import { Skeleton } from 'caddiedaddy-community-frontend'

// Shimmering placeholder block — keeps a screen's shape while data loads.
// Size via w/h, round the corners via r.
export function Lines() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 280 }}>
      <Skeleton w="60%" h={16} />
      <Skeleton w="90%" h={12} />
      <Skeleton w="75%" h={12} />
      <Skeleton w={96} h={24} r="var(--r-pill)" style={{ marginTop: 4 }} />
    </div>
  )
}

export function Shapes() {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
      <Skeleton w={48} h={48} r="50%" />
      <Skeleton w={64} h={48} r="var(--r-md)" />
      <Skeleton w={120} h={48} r="var(--r-lg)" />
    </div>
  )
}
