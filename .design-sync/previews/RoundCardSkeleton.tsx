import { RoundCardSkeleton } from 'caddiedaddy-community-frontend'

// Loading placeholder shaped like a round list-card (art thumb + text lines).
// Shown while the rounds list fetches.
export function Default() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 360 }}>
      <RoundCardSkeleton />
      <RoundCardSkeleton />
    </div>
  )
}
