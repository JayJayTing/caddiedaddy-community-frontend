'use client'
import { useEffect, useMemo, useState } from 'react'
import { MerchantShell } from '../MerchantShell'
import { ApiError } from '@/lib/api'
import {
  merchantApi,
  MerchantVenueDetail,
  AvailabilityRule,
  MerchantSlot,
  MerchantBooking,
  AvailabilityException,
  VenueStats,
  BookingStatus,
  NewRuleInput,
  RulePatch,
  formatCents,
  minutesToLabel,
  labelToMinutes,
  weekdayMaskLabel,
  WEEKDAY_LABELS,
  MASK_WEEKDAYS,
  MASK_WEEKEND,
  MASK_EVERYDAY,
} from '@/lib/booking'

// ── date / time helpers ────────────────────────────────────────────────────────
const hhmm = (iso: string) => iso.slice(11, 16)
// Local calendar date (NOT toISOString, which is UTC and shows "yesterday"
// in the early morning for east-of-UTC operators like Taiwan).
const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const addDaysIso = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const dowShort = (iso: string) => WEEKDAY_LABELS[new Date(`${iso}T00:00:00Z`).getUTCDay()]
const dayNum = (iso: string) => Number(iso.slice(8, 10))

// 30-minute options for open/close window bounds
const TIME_OPTIONS: string[] = (() => {
  const out: string[] = []
  for (let m = 0; m <= 1410; m += 30) out.push(minutesToLabel(m))
  return out
})()

type Tab = 'overview' | 'schedule' | 'operate' | 'settings'

// Mode labels driven by venue type (course = tee sheet, range = bays)
function modeLabels(isRange: boolean) {
  return isRange
    ? {
        scheduleTitle: 'Bays & hours',
        addBlock: '+ Add hours',
        intervalLabel: 'Session length (min)',
        capacityLabel: 'Number of bays',
        operateTitle: 'Bay grid',
        showHoles: false,
        unit: 'session',
        occ: (b: number, c: number) => `${b} / ${c} bays`,
      }
    : {
        scheduleTitle: 'Weekly schedule',
        addBlock: '+ Add block',
        intervalLabel: 'Tee interval (min)',
        capacityLabel: 'Players per tee',
        operateTitle: 'Tee sheet',
        showHoles: true,
        unit: 'tee time',
        occ: (b: number, c: number) => `${b} / ${c} players`,
      }
}

// ════════════════════════════════════════════════════════════════════════════

export default function VenueDashboard({ params }: { params: { venueId: string } }) {
  return (
    <MerchantShell>
      <Dashboard venueId={params.venueId} />
    </MerchantShell>
  )
}

function Dashboard({ venueId }: { venueId: string }) {
  const [venue, setVenue] = useState<MerchantVenueDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('overview')

  const load = () => {
    merchantApi
      .getVenue(venueId)
      .then((r) => setVenue(r.data))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load venue'))
  }
  useEffect(load, [venueId])

  if (error) return <div className="mc-error">{error}</div>
  if (!venue) return <div className="mc-empty">Loading…</div>

  const isRange = venue.type === 'driving_range'

  return (
    <div className="mc-dash">
      <div className="mc-dash-head">
        <div className="mc-row mc-spread" style={{ alignItems: 'flex-start' }}>
          <div>
            <a href="/merchant" className="mc-link">← All venues</a>
            <div className="mc-row" style={{ gap: 10, alignItems: 'center', marginTop: 6 }}>
              <h1 style={{ margin: 0, fontSize: 22 }}>{venue.name}</h1>
              <span className="mc-badge active">{isRange ? 'Driving range' : 'Golf course'}</span>
            </div>
            {venue.locationText && <div className="mc-muted mc-small">{venue.locationText}</div>}
          </div>
        </div>

        <div className="mc-tabs">
          {([
            ['overview', 'Overview'],
            ['schedule', isRange ? 'Bays & Hours' : 'Schedule'],
            ['operate', isRange ? 'Bay grid' : 'Tee sheet'],
            ['settings', 'Settings'],
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              className={`mc-tab ${tab === key ? 'active' : ''}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mc-tabpane" key={tab}>
        {tab === 'overview' && <OverviewTab venue={venue} isRange={isRange} />}
        {tab === 'schedule' && <ScheduleTab venue={venue} isRange={isRange} />}
        {tab === 'operate' && <OperateTab venue={venue} isRange={isRange} />}
        {tab === 'settings' && <SettingsTab venue={venue} onSaved={load} />}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  OVERVIEW TAB — bookings + earnings (day / month / year)
// ════════════════════════════════════════════════════════════════════════════

function OverviewTab({ venue, isRange }: { venue: MerchantVenueDetail; isRange: boolean }) {
  const L = modeLabels(isRange)
  const [stats, setStats] = useState<VenueStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    merchantApi.stats(venue.id).then(setStats).catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load stats'))
  }, [venue.id])

  const cards: { key: keyof VenueStats; label: string }[] = [
    { key: 'day', label: 'Today' },
    { key: 'month', label: 'This month' },
    { key: 'year', label: 'This year' },
  ]

  return (
    <div className="mc-overview">
      {error && <div className="mc-error">{error}</div>}
      <div className="mc-stats">
        {cards.map((c, i) => {
          const s = stats?.[c.key]
          return (
            <div key={c.key} className={`mc-stat grad-${i}`} style={{ animationDelay: `${i * 70}ms` }}>
              <div className="mc-stat-label">{c.label}</div>
              <div className="mc-stat-row">
                <div>
                  <div className="mc-stat-num">{s ? s.bookings : '—'}</div>
                  <div className="mc-stat-sub">{isRange ? 'sessions' : 'tee times'} booked</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="mc-stat-earn">{s ? formatCents(s.earnedCents) : '—'}</div>
                  <div className="mc-stat-sub">earned{s && s.creditBookings > 0 ? ` · ${s.creditBookings} via credits` : ''}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <p className="mc-muted mc-small" style={{ marginTop: 14 }}>
        Earnings are what you keep — pay-at-venue {L.unit}s at full price plus credit {L.unit}s at the net after platform commission. Cancelled bookings are excluded.
      </p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  SCHEDULE TAB — blocks editor + closures
// ════════════════════════════════════════════════════════════════════════════

const ACCENTS = ['#0f6fff', '#16a34a', '#d97706', '#7c3aed', '#db2777', '#0891b2']

function ScheduleTab({ venue, isRange }: { venue: MerchantVenueDetail; isRange: boolean }) {
  const L = modeLabels(isRange)
  const [rules, setRules] = useState<AvailabilityRule[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const load = () => {
    merchantApi
      .listRules(venue.id)
      .then((rs) => setRules(rs.filter((r) => r.active)))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load schedule'))
  }
  useEffect(load, [venue.id])

  const afterSave = (msg: string) => {
    setAdding(false)
    setNote(msg)
    load()
  }

  return (
    <>
      <div className="mc-card">
        <div className="mc-row mc-spread">
          <h2 style={{ marginBottom: 0 }}>{L.scheduleTitle}</h2>
          <button className="mc-btn ghost sm" onClick={() => setAdding((v) => !v)}>
            {adding ? 'Close' : L.addBlock}
          </button>
        </div>
        <p className="mc-muted mc-small" style={{ marginTop: 6 }}>
          {isRange
            ? 'Define your open hours, how many bays you have, and session length. Saving updates upcoming availability automatically.'
            : 'Define your bookable tee-time blocks. Saving regenerates upcoming open tee times automatically.'}
        </p>
        {error && <div className="mc-error">{error}</div>}
        {note && <div className="mc-row" style={{ marginTop: 8 }}><span className="mc-small" style={{ color: '#166534' }}>{note}</span></div>}

        {adding && (
          <BlockForm
            venueId={venue.id}
            isRange={isRange}
            onDone={() => afterSave('Saved — upcoming availability updated.')}
          />
        )}

        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rules === null && !error && <div className="mc-empty">Loading…</div>}
          {rules && rules.length === 0 && (
            <div className="mc-empty">No blocks yet. Add one to start taking bookings.</div>
          )}
          {rules &&
            rules.map((r, i) => (
              <BlockCard
                key={r.id}
                rule={r}
                isRange={isRange}
                accent={ACCENTS[i % ACCENTS.length]}
                onChanged={() => afterSave('Saved — upcoming availability updated.')}
              />
            ))}
        </div>
      </div>

      <ClosuresEditor venueId={venue.id} />
    </>
  )
}

function ruleSummary(r: AvailabilityRule, isRange: boolean): string {
  const L = modeLabels(isRange)
  const days = weekdayMaskLabel(r.weekdayMask)
  const time = `${minutesToLabel(r.startMinute)}–${minutesToLabel(r.endMinute)}`
  const cap = isRange ? `${r.capacity} bays` : `${r.capacity} players`
  const holes = !isRange && r.holes ? ` · ${r.holes}h` : ''
  const every = isRange ? `${r.intervalMin}m sessions` : `every ${r.intervalMin}m`
  const deal = r.creditPriceCents != null ? ` · deal ${formatCents(r.creditPriceCents)}` : ''
  return `${days} · ${time} · ${every}${holes} · ${cap} · ${formatCents(r.priceCents)}${deal}`
}

function BlockCard({
  rule,
  isRange,
  accent,
  onChanged,
}: {
  rule: AvailabilityRule
  isRange: boolean
  accent: string
  onChanged: () => void
}) {
  const [editing, setEditing] = useState(false)

  return (
    <div style={{ borderRadius: 12, border: '1px solid #e3e8ee', borderLeft: `4px solid ${accent}`, background: '#fff', overflow: 'hidden' }}>
      <div className="mc-row mc-spread" style={{ padding: '12px 14px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{rule.label || (isRange ? 'Open hours' : 'Tee block')}</div>
          <div className="mc-muted mc-small" style={{ marginTop: 2 }}>{ruleSummary(rule, isRange)}</div>
        </div>
        <div className="mc-row" style={{ gap: 6, flexShrink: 0 }}>
          <button className="mc-btn ghost sm" onClick={() => setEditing((v) => !v)}>{editing ? 'Close' : 'Edit'}</button>
          <DeleteBlockButton rule={rule} onDone={onChanged} />
        </div>
      </div>
      {editing && (
        <div style={{ borderTop: '1px solid #eef2f6', padding: '4px 14px 14px', background: '#f8fafc' }}>
          <BlockForm
            venueId=""
            isRange={isRange}
            existing={rule}
            onDone={() => { setEditing(false); onChanged() }}
          />
        </div>
      )}
    </div>
  )
}

// Delete needs the venueId; rules don't carry it in the list payload, so we read it
// from the URL path the operator is on.
function useVenueIdFromPath(): string {
  const [id, setId] = useState('')
  useEffect(() => {
    const m = window.location.pathname.match(/\/merchant\/([^/]+)/)
    if (m) setId(decodeURIComponent(m[1]))
  }, [])
  return id
}

function DeleteBlockButton({ rule, onDone, disabled }: { rule: AvailabilityRule; onDone: () => void; disabled?: boolean }) {
  const venueId = useVenueIdFromPath()
  const [busy, setBusy] = useState(false)
  const remove = async () => {
    if (!confirm('Remove this block? Future open slots from it will be cleared.')) return
    setBusy(true)
    try {
      await merchantApi.deleteRule(venueId, rule.id)
      onDone()
    } finally {
      setBusy(false)
    }
  }
  return (
    <button className="mc-btn danger sm" onClick={remove} disabled={busy || disabled}>
      {busy ? '…' : 'Remove'}
    </button>
  )
}

function BlockForm({
  venueId: venueIdProp,
  isRange,
  existing,
  onDone,
}: {
  venueId: string
  isRange: boolean
  existing?: AvailabilityRule
  onDone: () => void
}) {
  const L = modeLabels(isRange)
  const pathVenueId = useVenueIdFromPath()
  const venueId = venueIdProp || pathVenueId

  const [label, setLabel] = useState(existing?.label ?? '')
  const [mask, setMask] = useState(existing?.weekdayMask ?? (isRange ? MASK_EVERYDAY : MASK_WEEKDAYS))
  const [start, setStart] = useState(minutesToLabel(existing?.startMinute ?? (isRange ? 600 : 360)))
  const [end, setEnd] = useState(minutesToLabel(existing?.endMinute ?? (isRange ? 1290 : 660)))
  const [interval, setIntervalMin] = useState(existing?.intervalMin ?? (isRange ? 60 : 10))
  const [holes, setHoles] = useState<string>(existing?.holes != null ? String(existing.holes) : isRange ? '' : '18')
  const [capacity, setCapacity] = useState(existing?.capacity ?? (isRange ? 12 : 4))
  const [price, setPrice] = useState(existing ? existing.priceCents / 100 : isRange ? 300 : 2800)
  const [creditPrice, setCreditPrice] = useState<string>(existing?.creditPriceCents != null ? String(existing.creditPriceCents / 100) : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startMin = labelToMinutes(start)
  const endMin = labelToMinutes(end)
  const preview = useMemo(() => {
    const out: string[] = []
    for (let m = startMin; m <= endMin && out.length < 240; m += interval) out.push(minutesToLabel(m))
    return out
  }, [startMin, endMin, interval])

  const toggleDay = (i: number) => setMask((m) => m ^ (1 << i))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mask === 0) { setError('Pick at least one day.'); return }
    if (endMin < startMin) { setError('End time must be after the start time.'); return }
    setBusy(true)
    setError(null)
    try {
      const common = {
        label: label || undefined,
        weekdayMask: mask,
        startMinute: startMin,
        endMinute: endMin,
        intervalMin: interval,
        holes: isRange ? null : holes === '' ? null : Number(holes),
        capacity,
        priceCents: Math.round(price * 100),
        creditPriceCents: creditPrice === '' ? null : Math.round(Number(creditPrice) * 100),
      }
      if (existing) {
        await merchantApi.updateRule(venueId, existing.id, common as RulePatch)
      } else {
        await merchantApi.createRule(venueId, common as NewRuleInput)
      }
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save block')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="mc-card" style={{ background: existing ? 'transparent' : '#f8fafc', boxShadow: 'none', border: existing ? 'none' : undefined, marginTop: 12 }} onSubmit={submit}>
      {error && <div className="mc-error">{error}</div>}

      <div className="mc-field">
        <label>Days</label>
        <div className="mc-row" style={{ gap: 6 }}>
          {WEEKDAY_LABELS.map((d, i) => {
            const on = (mask & (1 << i)) !== 0
            return (
              <button type="button" key={d} className={`mc-btn sm ${on ? '' : 'ghost'}`} onClick={() => toggleDay(i)}>{d}</button>
            )
          })}
        </div>
        <div className="mc-row" style={{ gap: 6, marginTop: 6 }}>
          <button type="button" className="mc-btn subtle sm" onClick={() => setMask(MASK_WEEKDAYS)}>Mon–Fri</button>
          <button type="button" className="mc-btn subtle sm" onClick={() => setMask(MASK_WEEKEND)}>Weekends</button>
          <button type="button" className="mc-btn subtle sm" onClick={() => setMask(MASK_EVERYDAY)}>Every day</button>
        </div>
      </div>

      <div className="mc-grid">
        <div className="mc-field">
          <label>Label (optional)</label>
          <input className="mc-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={isRange ? 'Evenings' : 'Weekday peak'} />
        </div>
        <div className="mc-field">
          <label>Opens</label>
          <select className="mc-select" value={start} onChange={(e) => setStart(e.target.value)}>
            {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="mc-field">
          <label>{isRange ? 'Last session' : 'Last tee'}</label>
          <select className="mc-select" value={end} onChange={(e) => setEnd(e.target.value)}>
            {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="mc-field">
          <label>{L.intervalLabel}</label>
          <input className="mc-input" type="number" min={5} max={240} value={interval} onChange={(e) => setIntervalMin(Number(e.target.value))} />
        </div>
        {L.showHoles && (
          <div className="mc-field">
            <label>Holes</label>
            <select className="mc-select" value={holes} onChange={(e) => setHoles(e.target.value)}>
              <option value="18">18</option>
              <option value="9">9</option>
            </select>
          </div>
        )}
        <div className="mc-field">
          <label>{L.capacityLabel}</label>
          <input className="mc-input" type="number" min={1} max={isRange ? 64 : 8} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
        </div>
        <div className="mc-field">
          <label>Price (NT$)</label>
          <input className="mc-input" type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        </div>
        <div className="mc-field">
          <label>Deal price · credits (blank = none)</label>
          <input className="mc-input" type="number" min={0} value={creditPrice} onChange={(e) => setCreditPrice(e.target.value)} placeholder="e.g. 2240" />
        </div>
      </div>

      <div className="mc-preview">
        <span className="mc-muted mc-small">Generates {preview.length} {L.unit}s:&nbsp;</span>
        <span className="mc-small">
          {preview.slice(0, 6).join(', ')}{preview.length > 6 ? `, … ${preview[preview.length - 1]}` : ''}
        </span>
      </div>

      <div className="mc-row" style={{ marginTop: 10 }}>
        <button className="mc-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : existing ? 'Save changes' : 'Add block'}</button>
      </div>
    </form>
  )
}

// ── Closures ────────────────────────────────────────────────────────────────────

function ClosuresEditor({ venueId }: { venueId: string }) {
  const [list, setList] = useState<AvailabilityException[] | null>(null)
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    merchantApi.listExceptions(venueId).then(setList).catch(() => setList([]))
  }
  useEffect(load, [venueId])
  useEffect(() => { setDate(todayIso()) }, [])

  const add = async () => {
    if (!date) return
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      const res = await merchantApi.addException(venueId, { date, reason: reason || undefined })
      setReason('')
      setNote(
        res.activeBookings > 0
          ? `Closed ${date}. ${res.removedSlots} open slots cleared — ⚠ ${res.activeBookings} existing booking(s) need attention.`
          : `Closed ${date}. ${res.removedSlots} open slots cleared.`,
      )
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add closure')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    await merchantApi.deleteException(venueId, id)
    load()
  }

  return (
    <div className="mc-card">
      <h2>Closures <span className="mc-muted mc-small">· block a date (tournament / maintenance / weather)</span></h2>
      {error && <div className="mc-error">{error}</div>}
      {note && <div className="mc-small" style={{ color: '#166534', marginBottom: 8 }}>{note}</div>}

      <div className="mc-row" style={{ alignItems: 'flex-end' }}>
        <div className="mc-field" style={{ margin: 0 }}>
          <label>Date</label>
          <input className="mc-input" type="date" value={date} min={todayIso()} onChange={(e) => setDate(e.target.value)} style={{ width: 'auto' }} />
        </div>
        <div className="mc-field" style={{ margin: 0, flex: 1 }}>
          <label>Reason (optional)</label>
          <input className="mc-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Maintenance" />
        </div>
        <button className="mc-btn danger" onClick={add} disabled={busy}>{busy ? 'Closing…' : 'Close date'}</button>
      </div>

      <div style={{ marginTop: 12 }}>
        {list === null && <div className="mc-empty">Loading…</div>}
        {list && list.length === 0 && <div className="mc-empty">No upcoming closures.</div>}
        {list && list.length > 0 && (
          <table className="mc-table">
            <thead><tr><th>Date</th><th>Reason</th><th></th></tr></thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id}>
                  <td><strong>{e.date}</strong></td>
                  <td>{e.reason ?? '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="mc-btn ghost sm" onClick={() => remove(e.id)}>Reopen</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  OPERATE TAB — week strip + tee sheet / bay grid
// ════════════════════════════════════════════════════════════════════════════

type Filter = 'all' | 'available' | 'booked' | 'blocked'

function OperateTab({ venue, isRange }: { venue: MerchantVenueDetail; isRange: boolean }) {
  const L = modeLabels(isRange)
  const [weekStart, setWeekStart] = useState('')
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState<MerchantSlot[] | null>(null)
  const [bookings, setBookings] = useState<MerchantBooking[]>([])
  const [closures, setClosures] = useState<AvailabilityException[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = todayIso()
    setWeekStart(t)
    setDate(t)
  }, [])

  const loadDay = () => {
    if (!date) return
    setSlots(null)
    Promise.all([
      merchantApi.listSlots(venue.id, date),
      merchantApi.listBookings(venue.id, date),
    ])
      .then(([s, b]) => { setSlots(s); setBookings(b) })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load day'))
  }
  useEffect(loadDay, [venue.id, date])
  useEffect(() => { merchantApi.listExceptions(venue.id).then(setClosures).catch(() => {}) }, [venue.id, date])

  const closedToday = closures.find((c) => c.date === date) ?? null

  // group bookings by "HH:MM|holes" so each slot can show its reservations
  const bookingsBySlot = useMemo(() => {
    const m = new Map<string, MerchantBooking[]>()
    for (const b of bookings) {
      const key = `${hhmm(b.slot.startTime)}|${b.slot.holes ?? ''}`
      const arr = m.get(key) ?? []
      arr.push(b)
      m.set(key, arr)
    }
    return m
  }, [bookings])

  const filteredSlots = useMemo(() => {
    if (!slots) return null
    return slots.filter((s) => {
      if (filter === 'available') return s.status === 'open' && s.bookedCount < s.capacity
      if (filter === 'booked') return s.bookedCount > 0
      if (filter === 'blocked') return s.status === 'blocked'
      return true
    })
  }, [slots, filter])

  // group by hour for a readable sheet
  const byHour = useMemo(() => {
    const groups: { hour: string; items: MerchantSlot[] }[] = []
    for (const s of filteredSlots ?? []) {
      const hour = `${hhmm(s.startTime).slice(0, 2)}:00`
      const g = groups.find((x) => x.hour === hour)
      if (g) g.items.push(s)
      else groups.push({ hour, items: [s] })
    }
    return groups
  }, [filteredSlots])

  const days = weekStart ? Array.from({ length: 7 }, (_, i) => addDaysIso(weekStart, i)) : []

  const closeDay = async () => {
    const reason = prompt('Reason for closing this day? (optional)') ?? undefined
    await merchantApi.addException(venue.id, { date, reason })
    merchantApi.listExceptions(venue.id).then(setClosures).catch(() => {})
    loadDay()
  }
  const reopenDay = async () => {
    if (closedToday) {
      await merchantApi.deleteException(venue.id, closedToday.id)
      merchantApi.listExceptions(venue.id).then(setClosures).catch(() => {})
      loadDay()
    }
  }

  return (
    <div className="mc-card">
      {/* Week navigator */}
      <div className="mc-row mc-spread" style={{ marginBottom: 10 }}>
        <div className="mc-row" style={{ gap: 6, alignItems: 'center' }}>
          <button className="mc-btn ghost sm" onClick={() => setWeekStart((w) => addDaysIso(w, -7))}>‹</button>
          <button className="mc-btn subtle sm" onClick={() => { const t = todayIso(); setWeekStart(t); setDate(t) }}>Today</button>
          <button className="mc-btn ghost sm" onClick={() => setWeekStart((w) => addDaysIso(w, 7))}>›</button>
        </div>
        <input className="mc-input" type="date" value={date} onChange={(e) => { setDate(e.target.value); setWeekStart(e.target.value) }} style={{ width: 'auto' }} />
      </div>
      <div className="mc-weekstrip">
        {days.map((d) => {
          const on = d === date
          const isClosed = closures.some((c) => c.date === d)
          return (
            <button key={d} className={`mc-day ${on ? 'active' : ''} ${isClosed ? 'closed' : ''}`} onClick={() => setDate(d)}>
              <span className="mc-day-dow">{dowShort(d)}</span>
              <span className="mc-day-num">{dayNum(d)}</span>
              {isClosed && <span className="mc-day-dot" />}
            </button>
          )
        })}
      </div>

      <div className="mc-row mc-spread" style={{ margin: '14px 0 8px' }}>
        <h2 style={{ marginBottom: 0 }}>{L.operateTitle} <span className="mc-muted mc-small">· {date}</span></h2>
        <div className="mc-row" style={{ gap: 6 }}>
          {(['all', 'available', 'booked', 'blocked'] as Filter[]).map((f) => (
            <button key={f} className={`mc-btn sm ${filter === f ? '' : 'ghost'}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
          {closedToday ? (
            <button className="mc-btn subtle sm" onClick={reopenDay}>Reopen day</button>
          ) : (
            <button className="mc-btn danger sm" onClick={closeDay}>Close day</button>
          )}
        </div>
      </div>

      {error && <div className="mc-error">{error}</div>}

      {closedToday ? (
        <div className="mc-empty">🚫 Closed{closedToday.reason ? ` — ${closedToday.reason}` : ''}. Reopen to restore tee times.</div>
      ) : slots === null ? (
        <div className="mc-empty">Loading…</div>
      ) : (filteredSlots ?? []).length === 0 ? (
        <div className="mc-empty">No {L.unit}s for this day. Set them up in the {isRange ? '“Bays & Hours”' : '“Schedule”'} tab.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {byHour.map((g) => (
            <div key={g.hour}>
              <div className="mc-hour">{g.hour}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {g.items.map((s) => (
                  <SlotRow
                    key={s.id}
                    venueId={venue.id}
                    slot={s}
                    isRange={isRange}
                    bookings={bookingsBySlot.get(`${hhmm(s.startTime)}|${s.holes ?? ''}`) ?? []}
                    onChanged={loadDay}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SlotRow({
  venueId,
  slot,
  isRange,
  bookings,
  onChanged,
}: {
  venueId: string
  slot: MerchantSlot
  isRange: boolean
  bookings: MerchantBooking[]
  onChanged: () => void
}) {
  const L = modeLabels(isRange)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const full = slot.bookedCount >= slot.capacity
  const blocked = slot.status === 'blocked'

  const toggleBlock = async () => {
    setBusy(true)
    try {
      await merchantApi.patchSlot(venueId, slot.id, { status: blocked ? 'open' : 'blocked' })
      onChanged()
    } finally { setBusy(false) }
  }
  const setStatus = async (bookingId: string, status: BookingStatus) => {
    await merchantApi.setBookingStatus(venueId, bookingId, status)
    onChanged()
  }

  return (
    <div className={`mc-slotrow ${blocked ? 'blocked' : ''} ${full ? 'full' : ''}`}>
      <div className="mc-row mc-spread" onClick={() => setOpen((v) => !v)} style={{ cursor: 'pointer', alignItems: 'center' }}>
        <div className="mc-row" style={{ gap: 12, alignItems: 'baseline' }}>
          <span className="mc-slotrow-time">{hhmm(slot.startTime)}</span>
          {!isRange && slot.holes ? <span className="mc-muted mc-small">{slot.holes}h</span> : null}
          <span className="mc-muted mc-small">{L.occ(slot.bookedCount, slot.capacity)}</span>
        </div>
        <div className="mc-row" style={{ gap: 10, alignItems: 'center' }}>
          <span className="mc-small">{formatCents(slot.priceCents)}{slot.creditPriceCents != null && <span style={{ color: '#166534' }}> · {formatCents(slot.creditPriceCents)} deal</span>}</span>
          {slot.source === 'manual' && <span className="mc-badge pending">one-off</span>}
          {blocked && <span className="mc-badge blocked">blocked</span>}
          <span className="mc-muted">{open ? '▾' : '▸'}</span>
        </div>
      </div>

      {open && (
        <div className="mc-slotrow-body">
          {bookings.length === 0 ? (
            <div className="mc-muted mc-small">No bookings yet.</div>
          ) : (
            <table className="mc-table" style={{ marginBottom: 8 }}>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td>{b.user.displayName}</td>
                    <td>{b.partySize} · {formatCents(b.totalCents)}{b.creditCents > 0 ? ' · credits' : ''}</td>
                    <td><span className={`mc-badge ${b.status}`}>{b.status.replace('_', ' ')}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      {(b.status === 'confirmed' || b.status === 'pending') && (
                        <span className="mc-row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                          <button className="mc-btn subtle sm" onClick={() => setStatus(b.id, 'completed')}>Done</button>
                          <button className="mc-btn subtle sm" onClick={() => setStatus(b.id, 'no_show')}>No-show</button>
                          <button className="mc-btn danger sm" onClick={() => setStatus(b.id, 'cancelled')}>Cancel</button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="mc-row" style={{ gap: 8 }}>
            <button className="mc-btn ghost sm" onClick={toggleBlock} disabled={busy}>{blocked ? 'Unblock' : 'Block'}</button>
            <SlotPriceEditor venueId={venueId} slot={slot} onChanged={onChanged} />
          </div>
        </div>
      )}
    </div>
  )
}

function SlotPriceEditor({ venueId, slot, onChanged }: { venueId: string; slot: MerchantSlot; onChanged: () => void }) {
  const [editing, setEditing] = useState(false)
  const [price, setPrice] = useState(slot.priceCents / 100)
  const [cap, setCap] = useState(slot.capacity)
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    try {
      await merchantApi.patchSlot(venueId, slot.id, { priceCents: Math.round(price * 100), capacity: cap })
      setEditing(false)
      onChanged()
    } finally { setBusy(false) }
  }
  if (!editing) return <button className="mc-btn ghost sm" onClick={() => setEditing(true)}>Edit price/capacity</button>
  return (
    <span className="mc-row" style={{ gap: 6, alignItems: 'center' }}>
      <input className="mc-input" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} style={{ width: 90 }} />
      <input className="mc-input" type="number" min={slot.bookedCount || 1} value={cap} onChange={(e) => setCap(Number(e.target.value))} style={{ width: 64 }} />
      <button className="mc-btn sm" onClick={save} disabled={busy}>{busy ? '…' : 'Save'}</button>
      <button className="mc-btn ghost sm" onClick={() => setEditing(false)}>Cancel</button>
    </span>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  SETTINGS TAB — venue policy + integrations placeholder
// ════════════════════════════════════════════════════════════════════════════

function SettingsTab({ venue, onSaved }: { venue: MerchantVenueDetail; onSaved: () => void }) {
  const [name, setName] = useState(venue.name)
  const [phone, setPhone] = useState(venue.phone ?? '')
  const [locationText, setLocationText] = useState(venue.locationText ?? '')
  const [description, setDescription] = useState(venue.description ?? '')
  const [minParty, setMinParty] = useState(venue.minPartySize)
  const [maxParty, setMaxParty] = useState(venue.maxPartySize)
  const [advance, setAdvance] = useState(venue.advanceBookingDays)
  const [cutoff, setCutoff] = useState(venue.cancellationCutoffHours)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      await merchantApi.updateVenue(venue.id, {
        name,
        phone: phone || null,
        locationText: locationText || null,
        description: description || null,
        minPartySize: minParty,
        maxPartySize: maxParty,
        advanceBookingDays: advance,
        cancellationCutoffHours: cutoff,
      })
      setNote('Saved.')
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save settings')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <form className="mc-card" onSubmit={save}>
        <h2>Venue settings</h2>
        {error && <div className="mc-error">{error}</div>}
        {note && <div className="mc-small" style={{ color: '#166534', marginBottom: 8 }}>{note}</div>}
        <div className="mc-grid">
          <div className="mc-field"><label>Name</label><input className="mc-input" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="mc-field"><label>Phone</label><input className="mc-input" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="mc-field"><label>Location</label><input className="mc-input" value={locationText} onChange={(e) => setLocationText(e.target.value)} /></div>
          <div className="mc-field"><label>Min party</label><input className="mc-input" type="number" min={1} max={8} value={minParty} onChange={(e) => setMinParty(Number(e.target.value))} /></div>
          <div className="mc-field"><label>Max party</label><input className="mc-input" type="number" min={1} max={8} value={maxParty} onChange={(e) => setMaxParty(Number(e.target.value))} /></div>
          <div className="mc-field"><label>Advance booking (days)</label><input className="mc-input" type="number" min={1} max={365} value={advance} onChange={(e) => setAdvance(Number(e.target.value))} /></div>
          <div className="mc-field"><label>Cancellation cutoff (hours)</label><input className="mc-input" type="number" min={0} max={168} value={cutoff} onChange={(e) => setCutoff(Number(e.target.value))} /></div>
        </div>
        <div className="mc-field" style={{ marginTop: 8 }}>
          <label>Description</label>
          <textarea className="mc-input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <button className="mc-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
      </form>

      <div className="mc-card" style={{ opacity: 0.7 }}>
        <h2>Integrations <span className="mc-muted mc-small">· coming soon</span></h2>
        <p className="mc-muted mc-small" style={{ marginBottom: 0 }}>
          Import an existing tee sheet (Excel/CSV) or connect an external booking system. Not available yet — your availability is managed in the {venue.type === 'driving_range' ? '“Bays & Hours”' : '“Schedule”'} tab for now.
        </p>
      </div>
    </>
  )
}
