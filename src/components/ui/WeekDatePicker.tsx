'use client'
// Swipeable week date picker — ported from the BookNow client app (the nicest
// date scroller) and adapted to CaddieDaddy tokens + inline styles. Swipe (touch
// or mouse-drag) between weeks; tap a day to select. Past dates (< minDate) are
// disabled/faded. Day-of-week header is static; the days row slides.
import { useMemo, useRef, useEffect, useCallback, useState } from 'react'

interface Props {
  selectedDate: string // YYYY-MM-DD
  onDateSelect: (date: string) => void
  dayLabels: string[] // 7 localized short weekday names, Mon→Sun
  monthFormatter?: (year: number, month0: number) => string
  minDate?: string // earliest selectable day (default today); earlier days are disabled
}

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day))
  date.setHours(0, 0, 0, 0)
  return date
}

const TOTAL_WEEKS = 9
const CENTER_WEEK = 4
const TRANSITION = 'transform 0.35s cubic-bezier(0.25, 0.1, 0.25, 1)'

export function WeekDatePicker({ selectedDate, onDateSelect, dayLabels, monthFormatter, minDate }: Props) {
  const todayStr = useMemo(() => fmt(new Date()), [])
  const minStr = minDate ?? todayStr

  const baseMonday = useMemo(() => {
    const t = new Date()
    if (t.getDay() === 0) t.setDate(t.getDate() + 1) // Sunday → start next week
    return getMonday(t)
  }, [])

  const weeks = useMemo(() => {
    const out: { dateStr: string; dom: number; month: number; year: number }[][] = []
    for (let w = 0; w < TOTAL_WEEKS; w++) {
      const week = []
      for (let d = 0; d < 7; d++) {
        const date = new Date(baseMonday)
        date.setDate(date.getDate() + (w - CENTER_WEEK) * 7 + d)
        week.push({ dateStr: fmt(date), dom: date.getDate(), month: date.getMonth(), year: date.getFullYear() })
      }
      out.push(week)
    }
    return out
  }, [baseMonday])

  const initialWeek = useMemo(() => {
    const i = weeks.findIndex((w) => w.some((d) => d.dateStr === selectedDate))
    return i === -1 ? CENTER_WEEK : i
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [activeWeek, setActiveWeek] = useState(initialWeek)
  const swipeRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const drag = useRef({ startX: 0, startY: 0, dragging: false, horizontal: null as boolean | null, base: 0, mouseDown: false })

  const monthLabel = useMemo(() => {
    const wk = weeks[activeWeek]
    if (!wk) return ''
    const a = wk[0], b = wk[6]
    const f = monthFormatter ?? ((y: number, m: number) => `${new Date(y, m, 1).toLocaleDateString('en-US', { month: 'long' })} ${y}`)
    return a.month === b.month ? f(a.year, a.month) : `${f(a.year, a.month)} – ${f(b.year, b.month)}`
  }, [activeWeek, weeks, monthFormatter])

  const setWeek = useCallback((i: number, animate: boolean) => {
    const t = trackRef.current
    if (!t) return
    t.style.transition = animate ? TRANSITION : 'none'
    t.style.transform = `translateX(${-i * 100}%)`
    setActiveWeek(i)
  }, [])

  useEffect(() => { setWeek(initialWeek, false) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const area = swipeRef.current, track = trackRef.current
    if (!area || !track) return
    const s = drag.current
    const W = () => area.offsetWidth

    const start = (x: number, y: number) => { s.startX = x; s.startY = y; s.dragging = true; s.horizontal = null; track.style.transition = 'none'; s.base = -activeWeek * W() }
    const move = (x: number, y: number, e?: Event) => {
      if (!s.dragging) return false
      const dx = x - s.startX, dy = y - s.startY
      if (s.horizontal === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) s.horizontal = Math.abs(dx) > Math.abs(dy)
      if (!s.horizontal) return false
      e?.preventDefault()
      track.style.transform = `translateX(${((s.base + dx) / W()) * 100}%)`
      return true
    }
    const end = (x: number) => {
      if (!s.dragging) return
      s.dragging = false
      if (!s.horizontal) return
      const dx = x - s.startX, th = W() * 0.2
      let i = activeWeek
      if (dx < -th && i < TOTAL_WEEKS - 1) i++
      else if (dx > th && i > 0) i--
      setWeek(i, true)
    }

    const ts = (e: TouchEvent) => start(e.touches[0].clientX, e.touches[0].clientY)
    const tm = (e: TouchEvent) => move(e.touches[0].clientX, e.touches[0].clientY, e)
    const te = (e: TouchEvent) => end(e.changedTouches[0].clientX)
    const md = (e: MouseEvent) => { s.mouseDown = true; start(e.clientX, e.clientY); e.preventDefault() }
    const mm = (e: MouseEvent) => { if (s.mouseDown) move(e.clientX, e.clientY) }
    const mu = (e: MouseEvent) => { if (s.mouseDown) { s.mouseDown = false; end(e.clientX) } }
    const ml = () => { if (s.mouseDown) { s.mouseDown = false; setWeek(activeWeek, true) } }

    area.addEventListener('touchstart', ts, { passive: true })
    area.addEventListener('touchmove', tm, { passive: false })
    area.addEventListener('touchend', te, { passive: true })
    area.addEventListener('mousedown', md)
    window.addEventListener('mousemove', mm)
    window.addEventListener('mouseup', mu)
    area.addEventListener('mouseleave', ml)
    return () => {
      area.removeEventListener('touchstart', ts)
      area.removeEventListener('touchmove', tm)
      area.removeEventListener('touchend', te)
      area.removeEventListener('mousedown', md)
      window.removeEventListener('mousemove', mm)
      window.removeEventListener('mouseup', mu)
      area.removeEventListener('mouseleave', ml)
    }
  }, [activeWeek, setWeek])

  return (
    <div>
      <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>{monthLabel}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 2 }}>
        {dayLabels.map((l, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', padding: '2px 0' }}>{l}</div>
        ))}
      </div>
      <div ref={swipeRef} style={{ overflow: 'hidden', userSelect: 'none', touchAction: 'pan-y pinch-zoom' }}>
        <div ref={trackRef} style={{ display: 'flex', willChange: 'transform' }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flexShrink: 0, width: '100%' }}>
              {week.map((day) => {
                const selected = day.dateStr === selectedDate
                const isToday = day.dateStr === todayStr
                const disabled = day.dateStr < minStr
                return (
                  <button
                    key={day.dateStr}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && onDateSelect(day.dateStr)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      padding: '6px 0', background: 'none', border: 'none',
                      cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.32 : 1,
                    }}
                  >
                    <span style={{ fontSize: 9, fontWeight: 700, lineHeight: 1, marginBottom: 3, color: 'var(--primary)', visibility: day.dom === 1 ? 'visible' : 'hidden' }}>
                      {new Date(day.year, day.month, 1).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                    </span>
                    <span style={{
                      width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: '50%', fontSize: 14, fontWeight: selected || isToday ? 700 : 500,
                      transition: 'background .15s, color .15s',
                      ...(selected
                        ? { background: 'var(--primary)', color: 'white' }
                        : isToday
                        ? { background: 'var(--primary-soft)', color: 'var(--primary)' }
                        : { color: 'var(--ink)' }),
                    }}>
                      {day.dom}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
