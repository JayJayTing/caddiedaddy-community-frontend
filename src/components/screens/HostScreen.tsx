'use client'
import { useState, useEffect, useRef } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useLang } from '@/contexts/LanguageContext'
import { api } from '@/lib/api'
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

// Player caps differ by venue: a flight is max 4 on a course, but a driving-range
// session can take a bigger group.
const MAX_SPOTS = { course: 4, driving_range: 10 } as const
const MIN_SPOTS = 2

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
  const [notes, setNotes] = useState('')
  const [selectedCommunity, setSelectedCommunity] = useState<string>('')
  const [myCommunities, setMyCommunities] = useState<Community[]>([])
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const maxSpots = MAX_SPOTS[venueType]

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

  const handlePublish = async () => {
    if (!selectedCourse || !date || !teeTime) {
      setError(t('host.errorIncomplete'))
      return
    }
    setError(null)
    setPublishing(true)
    try {
      const teeTimeFull = new Date(`${date}T${teeTime}:00`).toISOString()
      await api.post('/rounds', {
        courseId: selectedCourse.id,
        date,
        teeTime: teeTimeFull,
        venueType,
        holes: venueType === 'course' ? holes : undefined,
        totalSpots: spots,
        greenFeeCents: null,
        notes: notes || null,
        visibility: postTo,
        communityId: postTo === 'community' ? selectedCommunity || null : null,
      })
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

  return (
    <div className={`screen${activeScreen === 'host' ? ' active' : ''}`}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px 14px', flexShrink: 0, borderBottom: '1px solid var(--line-soft)' }}>
        <Pressable aria-label={t('a11y.back')} style={{ width: 36, height: 36, background: 'var(--bg-alt)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => setActiveScreen('rounds')}>
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </Pressable>
        <h1 className="serif" style={{ fontSize: 20, fontWeight: 500, color: 'var(--ink)' }}>{t('host.title')}</h1>
      </div>

      <div className="scroll-body" style={{ padding: '20px 20px 100px' }}>
        {/* Course search — choose the venue first; everything below describes it */}
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
              style={{ marginTop: 10, width: '100%', padding: '12px 16px', border: '1.5px solid var(--line)', borderRadius: 'var(--r-md)', fontSize: 14, background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--sans)' }}
            >
              <option value="">{t('host.selectCommunity')}</option>
              {myCommunities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>

        {/* Venue type */}
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

        {/* Holes — golf course only (a driving range has no holes) */}
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

        {/* Total Spots — a stepper fits any range (course 2–4, range 2–10) */}
        <div style={sectionStyle}>
          <div style={{ ...labelStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span>{t('host.spots')}</span>
            <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--ink-3)', fontWeight: 700 }}>{spots} / {maxSpots}</span>
          </div>
          <div className="host-stepper" role="group" aria-label={t('host.spots')}>
            <Pressable className="host-stepper-btn" aria-label={t('host.fewerSpots')} disabled={spots <= MIN_SPOTS} onClick={() => setSpots(s => Math.max(MIN_SPOTS, s - 1))}>−</Pressable>
            <span className="host-stepper-val" aria-live="polite">{spots}</span>
            <Pressable className="host-stepper-btn" aria-label={t('host.moreSpots')} disabled={spots >= maxSpots} onClick={() => setSpots(s => Math.min(maxSpots, s + 1))}>+</Pressable>
          </div>
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

        {error && (
          <div style={{ fontSize: 13, color: '#C0392B', textAlign: 'center', marginBottom: 12 }}>{error}</div>
        )}
      </div>

      {/* Sticky publish button */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 20px 20px', background: 'linear-gradient(transparent,var(--bg) 40%)', zIndex: 5 }}>
        <Pressable
          onClick={handlePublish}
          style={{
            background: 'var(--primary)',
            borderRadius: 'var(--r-lg)',
            padding: 18,
            textAlign: 'center',
            cursor: publishing ? 'default' : 'pointer',
            boxShadow: '0 4px 20px rgba(92,122,154,.35)',
            opacity: publishing ? 0.7 : 1,
            transition: 'opacity .15s',
            display: 'block',
            width: '100%',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>
            {publishing ? t('host.publishing') : t('host.publish')}
          </span>
        </Pressable>
      </div>
    </div>
  )
}
