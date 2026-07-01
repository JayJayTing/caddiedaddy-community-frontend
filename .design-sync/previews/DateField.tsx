import { useState } from 'react'
import { DateField } from 'caddiedaddy-community-frontend'

// On-brand date field that replaces the native OS picker. Tapping it opens a
// calendar popover (interaction-only — the closed field is shown here).
export function Empty() {
  const [v, setV] = useState('')
  return <div style={{ width: 300 }}><DateField value={v} onChange={setV} /></div>
}

export function Selected() {
  const [v, setV] = useState('2026-07-15')
  return <div style={{ width: 300 }}><DateField value={v} onChange={setV} /></div>
}
