import { CancelledBadge } from 'caddiedaddy-community-frontend'

// Red "Cancelled" pill shown wherever a cancelled round surfaces. Centralized
// so the label + colour stay identical everywhere.
export function Small() {
  return <CancelledBadge />
}

export function Medium() {
  return <CancelledBadge size="md" />
}
