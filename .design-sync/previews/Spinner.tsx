import { Spinner } from 'caddiedaddy-community-frontend'

// Small rotating busy indicator for in-progress searches and actions.
export function Sizes() {
  return (
    <div style={{ display: 'flex', gap: 18, alignItems: 'center', padding: 6 }}>
      <Spinner size={14} />
      <Spinner size={20} />
      <Spinner size={28} />
    </div>
  )
}

// On a primary surface, tint it white so it reads against the brand colour.
export function OnPrimary() {
  return (
    <div style={{ background: 'var(--primary)', padding: '14px 20px', borderRadius: 'var(--r-md)', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <Spinner size={18} color="white" />
      <span style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>Publishing…</span>
    </div>
  )
}
