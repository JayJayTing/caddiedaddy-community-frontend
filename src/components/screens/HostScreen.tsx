'use client'
import { useState, useEffect, useRef } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useLang } from '@/contexts/LanguageContext'
import { api } from '@/lib/api'
import { formatMoney } from '@/lib/utils'
import { Course } from '@/types/round'
import { Community } from '@/types/community'
import { DateField } from '@/components/ui/DateField'
import { Pressable } from '@/components/ui/Pressable'
import { Spinner } from '@/components/ui/Spinner'

// Tee-time options (every 10 min, 05:00–20:00). A reliable dropdown beats the
// native <input type="time">, which is fiddly/unselectable on some browsers.
// Values are "HH:mm" (unchanged downstream); labels are friendly 12-hour.
const TEE_TIMES: { v: string; label: string }[] = (() => {
  const out: { v: string; label: string }[] = []
  for (let m = 300; m <= 1200; m += 10) {
    const h = Math.floor(m / 60), mm = m % 60
    const v = `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
    const h12 = h % 12 === 0 ? 12 : h % 12
    out.push({ v, label: `${h12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}` })
  }
  return out
})()

// Player caps differ by venue: a flight is max 4 on a course, but a sim/driving-
// range session can take a bigger group.
const MAX_SPOTS = { course: 4, driving_range: 10 } as const
const MIN_SPOTS = 2

// Card themes (color1/color2) rendered as the round card's gradient art. Hex
// values mirror the brand tokens in variables.css so they stay on-brand and
// render even where the CSS vars aren't in scope. 'default' sends no colors, so
// the card keeps its stored fallback (#B8CBE0 → #5C7A9A).
const ROUND_THEMES: { key: string; c1: string; c2: string }[] = [
  { key: 'default', c1: '#B8CBE0', c2: '#5C7A9A' },
  { key: 'sky', c1: '#C7DCEF', c2: '#36577A' },
  { key: 'sage', c1: '#CDE5D6', c2: '#3F6B4E' },
  { key: 'peach', c1: '#F5DCC8', c2: '#A85F2E' },
  { key: 'rose', c1: '#F2D3D6', c2: '#9C4654' },
  { key: 'butter', c1: '#F3E4BE', c2: '#7E6320' },
  { key: 'lilac', c1: '#DCD5EE', c2: '#524678' },
]

// Draft autosave: LINE backgrounds the webview aggressively, and the hardware
// back button can drop the whole screen. Persisting the in-progress round means
// nothing is ever lost — we restore on return and clear on publish.
const DRAFT_KEY = 'caddie:host-draft'
const DRAFT_TTL = 7 * 24 * 60 * 60 * 1000 // ignore drafts older than a week

// Vertical single-select: each option is a full-width row with a radio dot, so
// the chosen one is obvious. Replaces the cramped left/right segmented toggles.
function VSelect({ options, value, onChange }: {
  options: { v: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="host-vselect" role="radiogroup">
      {options.map(o => {
        const active = o.v === value
        return (
          <Pressable
            key={o.v}
            role="radio"
            aria-checked={active}
            className={`host-voption${active ? ' active' : ''}`}
            onClick={() => onChange(o.v)}
          >
            <span>{o.label}</span>
            <span className="host-voption-dot" aria-hidden />
          </Pressable>
        )
      })}
    </div>
  )
}

export function HostScreen() {
  const { activeScreen, setActiveScreen, refreshData, showSuccess, dataVersion, hostCommunity, setHostCommunity } = useUI()
  const { t } = useLang()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [postTo, setPostTo] = useState<'public' | 'community'>('public')
  const [venueType, setVenueType] = useState<'course' | 'driving_range'>('course')
  const [courseSearch, setCourseSearch] = useState('')
  const [courseResults, setCourseResults] = useState<Course[]>([])
  const [searchingCourses, setSearchingCourses] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [date, setDate] = useState('')
  const [teeTime, setTeeTime] = useState('')
  const [holes, setHoles] = useState<9 | 18>(18)
  const [spots, setSpots] = useState(4)
  const [greenFee, setGreenFee] = useState('') // NT$ dollars, digits only
  const [notes, setNotes] = useState('')
  const [themeKey, setThemeKey] = useState('default')
  const [selectedCommunity, setSelectedCommunity] = useState<string>('')
  const [myCommunities, setMyCommunities] = useState<Community[]>([])
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hydrated = useRef(false)

  const maxSpots = MAX_SPOTS[venueType]

  // Restore a saved draft once, on mount (client only).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const d = JSON.parse(raw)
        if (d && (!d.savedAt || Date.now() - d.savedAt < DRAFT_TTL)) {
          if (d.postTo) setPostTo(d.postTo)
          if (d.venueType) setVenueType(d.venueType)
          if (d.selectedCourse) setSelectedCourse(d.selectedCourse)
          if (d.date) setDate(d.date)
          if (d.teeTime) setTeeTime(d.teeTime)
          if (d.holes === 9 || d.holes === 18) setHoles(d.holes)
          if (typeof d.spots === 'number') setSpots(d.spots)
          if (typeof d.greenFee === 'string') setGreenFee(d.greenFee)
          if (typeof d.notes === 'string') setNotes(d.notes)
          if (d.themeKey) setThemeKey(d.themeKey)
          if (d.selectedCommunity) setSelectedCommunity(d.selectedCommunity)
          if (d.step === 1 || d.step === 2 || d.step === 3) setStep(d.step)
        }
      }
    } catch { /* ignore malformed draft */ }
    hydrated.current = true
  }, [])

  // Persist the in-progress round whenever it changes (after the initial hydrate).
  useEffect(() => {
    if (!hydrated.current) return
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        savedAt: Date.now(), step, postTo, venueType, selectedCourse,
        date, teeTime, holes, spots, greenFee, notes, themeKey, selectedCommunity,
      }))
    } catch { /* storage full / unavailable — non-fatal */ }
  }, [step, postTo, venueType, selectedCourse, date, teeTime, holes, spots, greenFee, notes, themeKey, selectedCommunity])

  useEffect(() => {
    api.get<{ data: Community[] }>('/communities/mine')
      .then(r => setMyCommunities(r.data ?? []))
      .catch(() => {})
  }, [dataVersion.communities])

  // Arriving here via "Host a Round" from inside a community: pre-target it.
  useEffect(() => {
    if (activeScreen !== 'host' || !hostCommunity) return
    setPostTo('community')
    setSelectedCommunity(hostCommunity.id)
    setMyCommunities(prev =>
      prev.some(c => c.id === hostCommunity.id)
        ? prev
        : [{ id: hostCommunity.id, name: hostCommunity.name } as Community, ...prev],
    )
    setHostCommunity(null)
  }, [activeScreen, hostCommunity]) // eslint-disable-line react-hooks/exhaustive-deps

  // Switching venue re-caps the player count (course max 4, range max 10).
  const changeVenue = (v: 'course' | 'driving_range') => {
    setVenueType(v)
    setSpots(s => Math.min(s, MAX_SPOTS[v]))
  }

  const handleCourseSearch = (q: string) => {
    setCourseSearch(q)
    setSelectedCourse(null)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (q.length < 2) { setCourseResults([]); setSearchingCourses(false); return }
    setSearchingCourses(true)
    searchTimeout.current = setTimeout(async () => {
      try {
        const r = await api.get<{ data: Course[] }>(`/courses?q=${encodeURIComponent(q)}`)
        setCourseResults(r.data ?? [])
      } catch { setCourseResults([]) }
      finally { setSearchingCourses(false) }
    }, 300)
  }

  const resetForm = () => {
    setStep(1); setPostTo('public'); setVenueType('course')
    setCourseSearch(''); setCourseResults([]); setSelectedCourse(null)
    setDate(''); setTeeTime(''); setHoles(18); setSpots(4)
    setGreenFee(''); setNotes(''); setThemeKey('default'); setSelectedCommunity('')
  }

  const step1Valid = !!selectedCourse && !!date && !!teeTime

  const goNext = () => { setError(null); setStep(s => (s < 3 ? (s + 1) as 1 | 2 | 3 : s)) }
  const goBack = () => { setError(null); setStep(s => (s > 1 ? (s - 1) as 1 | 2 | 3 : s)) }
  // The header arrow steps back through the flow; from step 1 it leaves the screen.
  const headerBack = () => { if (step > 1) goBack(); else setActiveScreen('rounds') }

  const handlePublish = async () => {
    if (postTo === 'community' && !selectedCommunity) { setError(t('host.errorCommunity')); return }
    if (!selectedCourse || !date || !teeTime) { setError(t('host.errorIncomplete')); setStep(1); return }
    setError(null)
    setPublishing(true)
    try {
      const feeNum = greenFee.trim() ? Number(greenFee) : 0
      const feeCents = feeNum > 0 ? Math.round(feeNum * 100) : undefined
      const theme = ROUND_THEMES.find(x => x.key === themeKey)
      const custom = themeKey !== 'default' && theme
      // The backend stores tee time as a date-agnostic "HH:mm"; send the raw
      // slot value. Optional fields must be omitted (not null) — the schema
      // accepts undefined, not null.
      await api.post('/rounds', {
        courseId: selectedCourse.id,
        date,
        teeTime,
        venueType,
        holes: venueType === 'course' ? holes : undefined,
        totalSpots: spots,
        greenFeeCents: feeCents,
        notes: notes || undefined,
        visibility: postTo,
        communityId: postTo === 'community' ? selectedCommunity || undefined : undefined,
        color1: custom ? theme!.c1 : undefined,
        color2: custom ? theme!.c2 : undefined,
      })
      try { localStorage.removeItem(DRAFT_KEY) } catch { /* non-fatal */ }
      resetForm()
      refreshData('rounds')
      showSuccess(t('success.roundPosted'))
      setActiveScreen('rounds')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('error.publishFailed'))
    } finally {
      setPublishing(false)
    }
  }

  const sectionStyle = { marginBottom: 20 }
  const labelStyle = { fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' as const, color: 'var(--ink-3)', marginBottom: 8 }
  const inputStyle = { width: '100%', padding: '12px 16px', border: '1.5px solid var(--line)', borderRadius: 'var(--r-md)', fontSize: 14, background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--sans)' }

  // Live-preview derived values.
  const activeTheme = ROUND_THEMES.find(x => x.key === themeKey) ?? ROUND_THEMES[0]
  const teeLabel = TEE_TIMES.find(x => x.v === teeTime)?.label
  const previewFeeNum = greenFee.trim() ? Number(greenFee) : 0
  const previewFeeCents = previewFeeNum > 0 ? Math.round(previewFeeNum * 100) : null

  const STEP_TITLES = ['host.step1', 'host.step2', 'host.step3'] as const

  return (
    <div className={`screen${activeScreen === 'host' ? ' active' : ''}`}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px 12px', flexShrink: 0, borderBottom: '1px solid var(--line-soft)' }}>
        <Pressable aria-label={t('a11y.back')} style={{ width: 36, height: 36, background: 'var(--bg-alt)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={headerBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </Pressable>
        <h1 className="serif" style={{ fontSize: 20, fontWeight: 500, color: 'var(--ink)' }}>{t('host.title')}</h1>
      </div>

      {/* Progress + step title */}
      <div style={{ padding: '12px 20px 4px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{ flex: 1, height: 4, borderRadius: 2, background: n <= step ? 'var(--primary)' : 'var(--bg-alt)', transition: 'background .25s' }} />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span className="serif" style={{ fontSize: 16, color: 'var(--ink)' }}>{t(STEP_TITLES[step - 1])}</span>
          <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{step} / 3</span>
        </div>
      </div>

      <div className="scroll-body" style={{ padding: '16px 20px 100px' }}>
        {/* ── Step 1 — Where & When ────────────────────────────────────────── */}
        {step === 1 && (
          <div className="fade-in">
            {/* Venue type — chosen first; it shapes the rest of the flow */}
            <div style={sectionStyle}>
              <div style={labelStyle}>{t('host.venue')}</div>
              <VSelect
                value={venueType}
                onChange={v => changeVenue(v as 'course' | 'driving_range')}
                options={[
                  { v: 'course', label: t('host.golfCourse') },
                  { v: 'driving_range', label: t('host.drivingRange') },
                ]}
              />
            </div>

            {/* Course search */}
            <div style={sectionStyle}>
              <div style={labelStyle}>{t('host.course')}</div>
              <div className="search-bar" style={{ marginBottom: courseResults.length > 0 ? 0 : undefined }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  placeholder={t('host.searchCourse')}
                  value={selectedCourse ? selectedCourse.name : courseSearch}
                  onChange={e => handleCourseSearch(e.target.value)}
                  onFocus={() => selectedCourse && setCourseSearch('')}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)' }}
                />
                {selectedCourse && (
                  <Pressable aria-label={t('a11y.close')} style={{ cursor: 'pointer', fontSize: 16, color: 'var(--ink-3)' }} onClick={() => { setSelectedCourse(null); setCourseSearch(''); setCourseResults([]) }}>×</Pressable>
                )}
              </div>
              {!selectedCourse && courseSearch.trim().length >= 2 && (
                searchingCourses ? (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, color: 'var(--ink-3)', fontSize: 13 }}>
                    <Spinner size={16} /> {t('host.searchingCourses')}
                  </div>
                ) : courseResults.length > 0 ? (
                  <div className="fade-in" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden', marginTop: 4 }}>
                    {courseResults.map(c => (
                      <Pressable key={c.id} className="loc-suggestion" onClick={() => { setSelectedCourse(c); setCourseResults([]); setCourseSearch('') }} style={{ display: 'block', width: '100%', textAlign: 'left' }}>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        {c.locationText && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{c.locationText}</div>}
                      </Pressable>
                    ))}
                  </div>
                ) : (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', marginTop: 4, padding: 14, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                    {t('host.noCourses')}
                  </div>
                )
              )}
            </div>

            {/* Date & Tee Time */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <div style={labelStyle}>{t('host.date')}</div>
                <DateField value={date} onChange={setDate} />
              </div>
              <div>
                <div style={labelStyle}>{t('host.teeTime')}</div>
                <select
                  value={teeTime}
                  onChange={e => setTeeTime(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--line)', borderRadius: 'var(--r-md)', fontSize: 14, background: 'var(--surface)', color: teeTime ? 'var(--ink)' : 'var(--ink-3)', fontFamily: 'var(--sans)', appearance: 'none', cursor: 'pointer' }}
                >
                  <option value="">{t('host.pickTime')}</option>
                  {TEE_TIMES.map(tm => <option key={tm.v} value={tm.v}>{tm.label}</option>)}
                </select>
              </div>
            </div>

            {/* Holes — golf course only (a sim/range has no holes) */}
            {venueType === 'course' && (
              <div style={sectionStyle}>
                <div style={labelStyle}>{t('host.holes')}</div>
                <VSelect
                  value={String(holes)}
                  onChange={v => setHoles(Number(v) as 9 | 18)}
                  options={[
                    { v: '9', label: t('holes.9') },
                    { v: '18', label: t('holes.18') },
                  ]}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Step 2 — Details ─────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="fade-in">
            {/* Total Spots */}
            <div style={sectionStyle}>
              <div style={labelStyle}>{t('host.spots')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="host-stepper" role="group" aria-label={t('host.spots')}>
                  <Pressable className="host-stepper-btn" aria-label={t('host.fewerSpots')} disabled={spots <= MIN_SPOTS} onClick={() => setSpots(s => Math.max(MIN_SPOTS, s - 1))}>−</Pressable>
                  <span className="host-stepper-val" aria-live="polite">{spots}</span>
                  <Pressable className="host-stepper-btn" aria-label={t('host.moreSpots')} disabled={spots >= maxSpots} onClick={() => setSpots(s => Math.min(maxSpots, s + 1))}>+</Pressable>
                </div>
                <span style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 600 }}>{t('home.players')}</span>
              </div>
            </div>

            {/* Green fee */}
            <div style={sectionStyle}>
              <div style={labelStyle}>{t('host.greenFee')}</div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--ink-3)', fontWeight: 600 }}>NT$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={t('host.feePlaceholder')}
                  value={greenFee}
                  onChange={e => setGreenFee(e.target.value.replace(/[^0-9]/g, ''))}
                  style={{ ...inputStyle, paddingLeft: 48 }}
                />
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>{t('host.feeHint')}</div>
            </div>

            {/* Notes */}
            <div style={sectionStyle}>
              <div style={labelStyle}>{t('host.notes')}</div>
              <textarea
                className="compose-textarea"
                placeholder={t('host.notesPlaceholder')}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-md)', padding: '12px 16px', width: '100%', minHeight: 80, fontFamily: 'var(--sans)', fontSize: 14 }}
              />
            </div>
          </div>
        )}

        {/* ── Step 3 — Share & Publish ─────────────────────────────────────── */}
        {step === 3 && (
          <div className="fade-in">
            {/* Post To */}
            <div style={sectionStyle}>
              <div style={labelStyle}>{t('host.postTo')}</div>
              <VSelect
                value={postTo}
                onChange={v => setPostTo(v as 'public' | 'community')}
                options={[
                  { v: 'public', label: t('host.postPublic') },
                  { v: 'community', label: t('host.postCommunity') },
                ]}
              />
              {postTo === 'community' && myCommunities.length > 0 && (
                <select
                  value={selectedCommunity}
                  onChange={e => setSelectedCommunity(e.target.value)}
                  style={{ ...inputStyle, marginTop: 10, cursor: 'pointer' }}
                >
                  <option value="">{t('host.selectCommunity')}</option>
                  {myCommunities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>

            {/* Card theme */}
            <div style={sectionStyle}>
              <div style={labelStyle}>{t('host.cardTheme')}</div>
              <div role="radiogroup" aria-label={t('host.cardTheme')} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {ROUND_THEMES.map((thm, i) => {
                  const active = thm.key === themeKey
                  return (
                    <Pressable
                      key={thm.key}
                      role="radio"
                      aria-checked={active}
                      aria-label={`${t('host.cardTheme')} ${i + 1}`}
                      onClick={() => setThemeKey(thm.key)}
                      style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg,${thm.c1},${thm.c2})`, border: active ? '3px solid var(--primary)' : '3px solid transparent', boxShadow: active ? '0 0 0 1px var(--primary)' : 'inset 0 0 0 1px rgba(0,0,0,.06)', cursor: 'pointer' }}
                    />
                  )
                })}
              </div>
            </div>

            {/* Live preview */}
            <div style={sectionStyle}>
              <div style={labelStyle}>{t('host.preview')}</div>
              <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: 80, flexShrink: 0, position: 'relative', overflow: 'hidden', minHeight: 88, background: `linear-gradient(135deg,${activeTheme.c1},${activeTheme.c2})` }}>
                  <svg viewBox="0 0 80 100" fill="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                    <path d="M-2 66 Q20 50 40 58 Q60 66 82 54 L82 104 L-2 104 Z" fill="rgba(255,255,255,.2)"/>
                    <line x1="56" y1="52" x2="56" y2="28" stroke="rgba(255,255,255,.7)" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M56 28 L68 34 L56 40 Z" fill="rgba(255,255,255,.85)"/>
                  </svg>
                </div>
                <div style={{ flex: 1, padding: '13px', minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: selectedCourse ? 'var(--ink)' : 'var(--ink-3)', lineHeight: 1.2 }}>
                    {selectedCourse?.name || t('host.previewCourse')}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500, margin: '6px 0' }}>
                    {teeLabel || '—'} · {venueType === 'driving_range' ? t('host.drivingRange') : `${holes}h`} · {formatMoney(previewFeeCents)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                    {spots} {t('home.players')} · {postTo === 'community' ? t('host.postCommunity') : t('host.postPublic')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ fontSize: 13, color: '#C0392B', textAlign: 'center', marginBottom: 12 }}>{error}</div>
        )}
      </div>

      {/* Sticky footer nav */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 20px 20px', background: 'linear-gradient(transparent,var(--bg) 40%)', zIndex: 5, display: 'flex', gap: 10 }}>
        {step > 1 && (
          <Pressable onClick={goBack} style={{ background: 'var(--bg-alt)', borderRadius: 'var(--r-lg)', padding: '18px 22px', textAlign: 'center', cursor: 'pointer' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-2)' }}>{t('host.stepBack')}</span>
          </Pressable>
        )}
        {step < 3 ? (
          <Pressable
            onClick={goNext}
            disabled={step === 1 && !step1Valid}
            style={{ flex: 1, background: 'var(--primary)', borderRadius: 'var(--r-lg)', padding: 18, textAlign: 'center', cursor: step === 1 && !step1Valid ? 'default' : 'pointer', boxShadow: '0 4px 20px rgba(92,122,154,.35)', opacity: step === 1 && !step1Valid ? 0.5 : 1, transition: 'opacity .15s' }}
          >
            <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>{t('host.continue')}</span>
          </Pressable>
        ) : (
          <Pressable
            onClick={handlePublish}
            disabled={publishing}
            style={{ flex: 1, background: 'var(--primary)', borderRadius: 'var(--r-lg)', padding: 18, textAlign: 'center', cursor: publishing ? 'default' : 'pointer', boxShadow: '0 4px 20px rgba(92,122,154,.35)', opacity: publishing ? 0.7 : 1, transition: 'opacity .15s' }}
          >
            <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>{publishing ? t('host.publishing') : t('host.publish')}</span>
          </Pressable>
        )}
      </div>
    </div>
  )
}
