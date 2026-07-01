import { Pressable } from 'caddiedaddy-community-frontend'

// Pressable is the app's accessible <button> primitive — drop-in for any
// clickable surface. It carries the press-scale feedback; you supply the look.
const primary = { background: 'var(--primary)', color: 'white', borderRadius: 'var(--r-lg)', padding: '14px 22px', fontSize: 15, fontWeight: 700, boxShadow: '0 4px 20px rgba(92,122,154,.35)' }
const surface = { background: 'var(--surface)', color: 'var(--ink)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-md)', padding: '12px 18px', fontSize: 14, fontWeight: 600 }

export function Primary() {
  return <Pressable style={primary}>Publish Round</Pressable>
}

export function Secondary() {
  return <Pressable style={surface}>Full Page →</Pressable>
}

export function Pill() {
  return <Pressable style={{ background: 'var(--primary-soft)', color: 'var(--primary)', borderRadius: 'var(--r-pill)', padding: '8px 16px', fontSize: 13, fontWeight: 700 }}>18 Holes</Pressable>
}

export function Disabled() {
  return <Pressable disabled style={{ ...primary, background: 'var(--bg-alt)', color: 'var(--ink-3)', boxShadow: 'none' }}>Joined ✓</Pressable>
}
