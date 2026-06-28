'use client'
import { useState } from 'react'

interface Props {
  value: string                 // YYYY-MM-DD ('' = none)
  onChange: (v: string) => void
  min?: string                  // YYYY-MM-DD; days before this are disabled (default: today)
  placeholder?: string
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] // Monday-first, matches the rest of the app

const pad = (n: number) => String(n).padStart(2, '0')
const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parseYMD = (s: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '')
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  d.setHours(0, 0, 0, 0)
  return d
}

// On-brand calendar field that replaces the native (OS) date picker.
export function DateField({ value, onChange, min, placeholder = 'Select date' }: Props) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<{ y: number; m: number }>({ y: 2026, m: 5 })

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const minDate = parseYMD(min ?? '') ?? today
  const selected = parseYMD(value)

  const label = selected
    ? selected.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : placeholder

  const openPicker = () => {
    const base = selected ?? (today >= minDate ? today : minDate)
    setView({ y: base.getFullYear(), m: base.getMonth() })
    setOpen(true)
  }

  const { y, m } = view
  const firstWeekday = (new Date(y, m, 1).getDay() + 6) % 7 // Mon-first leading blanks
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const cells: Array<Date | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(y, m, i + 1)),
  ]

  // Don't page earlier than the min month.
  const canPrev = y > minDate.getFullYear() || (y === minDate.getFullYear() && m > minDate.getMonth())
  const step = (dir: number) => {
    const d = new Date(y, m + dir, 1)
    setView({ y: d.getFullYear(), m: d.getMonth() })
  }

  return (
    <>
      <div
        data-testid="date-field"
        onClick={openPicker}
        style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--line)', borderRadius: 'var(--r-md)', fontSize: 14, background: 'var(--surface)', color: selected ? 'var(--ink)' : 'var(--ink-3)', fontFamily: 'var(--sans)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, cursor: 'pointer' }}
      >
        <span>{label}</span>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(26,35,50,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 320, background: 'var(--surface)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-md)', padding: 18 }}>
            {/* Month nav */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div
                onClick={() => canPrev && step(-1)}
                style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: canPrev ? 'pointer' : 'default', opacity: canPrev ? 1 : 0.3 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{MONTHS[m]} {y}</span>
              <div onClick={() => step(1)} style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </div>
            </div>

            {/* Day-of-week labels */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
              {DOW.map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)' }}>{d}</div>)}
            </div>

            {/* Days */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
              {cells.map((d, i) => {
                if (!d) return <div key={i} />
                const isPast = d < minDate
                const isSel = !!selected && d.getTime() === selected.getTime()
                const isToday = d.getTime() === today.getTime()
                return (
                  <div
                    key={i}
                    onClick={() => { if (!isPast) { onChange(toYMD(d)); setOpen(false) } }}
                    style={{
                      height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, borderRadius: '50%',
                      cursor: isPast ? 'default' : 'pointer',
                      fontWeight: isSel || isToday ? 700 : 400,
                      background: isSel ? 'var(--primary)' : isToday ? 'var(--primary-soft)' : 'transparent',
                      color: isSel ? 'white' : isPast ? 'var(--ink-3)' : 'var(--ink)',
                      opacity: isPast ? 0.4 : 1,
                    }}
                  >
                    {d.getDate()}
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <span onClick={() => setOpen(false)} style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', cursor: 'pointer', padding: '6px 8px' }}>Cancel</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
