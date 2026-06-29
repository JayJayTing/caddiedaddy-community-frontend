'use client'
import { useState, useEffect, useRef } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useLang } from '@/contexts/LanguageContext'
import { api } from '@/lib/api'
import { Course } from '@/types/round'
import { Community } from '@/types/community'
import { RoundFormat, HandicapRequirement } from '@/types/round'
import { DateField } from '@/components/ui/DateField'
import { Pressable } from '@/components/ui/Pressable'

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

export function HostScreen() {
  const { activeScreen, setActiveScreen, refreshData, showSuccess, dataVersion } = useUI()
  const { t } = useLang()

  const [postTo, setPostTo] = useState<'public' | 'community'>('public')
  const [venueType, setVenueType] = useState<'course' | 'driving_range'>('course')
  const [courseSearch, setCourseSearch] = useState('')
  const [courseResults, setCourseResults] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [date, setDate] = useState('')
  const [teeTime, setTeeTime] = useState('')
  const [holes, setHoles] = useState<9 | 18>(18)
  const [format, setFormat] = useState<RoundFormat>('stroke_play')
  const [spots, setSpots] = useState(4)
  const [handicap, setHandicap] = useState<HandicapRequirement>('all')
  const [greenFee, setGreenFee] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedCommunity, setSelectedCommunity] = useState<string>('')
  const [myCommunities, setMyCommunities] = useState<Community[]>([])
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    api.get<{ data: Community[] }>('/communities/mine')
      .then(r => setMyCommunities(r.data ?? []))
      .catch(() => {})
  }, [dataVersion.communities])

  const handleCourseSearch = (q: string) => {
    setCourseSearch(q)
    setSelectedCourse(null)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (q.length < 2) { setCourseResults([]); return }
    searchTimeout.current = setTimeout(async () => {
      try {
        const r = await api.get<{ data: Course[] }>(`/courses?q=${encodeURIComponent(q)}`)
        setCourseResults(r.data ?? [])
      } catch { setCourseResults([]) }
    }, 300)
  }

  const FORMATS: Array<{ key: RoundFormat; label: string }> = [
    { key: 'stroke_play', label: t('format.stroke_play') },
    { key: 'stableford', label: t('format.stableford') },
    { key: 'best_ball', label: t('format.best_ball') },
    { key: 'scramble', label: t('format.scramble') },
  ]

  const HCP_OPTIONS: Array<{ key: HandicapRequirement; label: string }> = [
    { key: 'all', label: t('hcp.all') },
    { key: 'u10', label: t('hcp.u10') },
    { key: 'u15', label: t('hcp.u15') },
    { key: 'u20', label: t('hcp.u20') },
    { key: 'u28', label: t('hcp.u28') },
  ]

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
        format,
        holes,
        totalSpots: spots,
        handicapRequirement: handicap,
        greenFeeCents: greenFee ? Math.round(parseFloat(greenFee) * 100) : null,
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
        {/* Post To */}
        <div style={sectionStyle}>
          <div style={labelStyle}>{t('host.postTo')}</div>
          <div className="host-toggle-row">
            <Pressable aria-pressed={postTo === 'public'} className={`host-toggle-btn${postTo === 'public' ? ' active' : ''}`} onClick={() => setPostTo('public')}>{t('host.postPublic')}</Pressable>
            <Pressable aria-pressed={postTo === 'community'} className={`host-toggle-btn${postTo === 'community' ? ' active' : ''}`} onClick={() => setPostTo('community')}>{t('host.postCommunity')}</Pressable>
          </div>
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
          <div className="host-toggle-row">
            <Pressable aria-pressed={venueType === 'course'} className={`host-toggle-btn${venueType === 'course' ? ' active' : ''}`} onClick={() => setVenueType('course')}>{t('host.golfCourse')}</Pressable>
            <Pressable aria-pressed={venueType === 'driving_range'} className={`host-toggle-btn${venueType === 'driving_range' ? ' active' : ''}`} onClick={() => setVenueType('driving_range')}>{t('host.drivingRange')}</Pressable>
          </div>
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
          {courseResults.length > 0 && !selectedCourse && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden', marginTop: 4 }}>
              {courseResults.map(c => (
                <Pressable key={c.id} className="loc-suggestion" onClick={() => { setSelectedCourse(c); setCourseResults([]); setCourseSearch('') }} style={{ display: 'block', width: '100%', textAlign: 'left' }}>
                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                  {c.locationText && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{c.locationText}</div>}
                </Pressable>
              ))}
            </div>
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

        {/* Holes */}
        <div style={sectionStyle}>
          <div style={labelStyle}>{t('host.holes')}</div>
          <div className="host-toggle-row">
            <Pressable aria-pressed={holes === 9} className={`host-toggle-btn${holes === 9 ? ' active' : ''}`} onClick={() => setHoles(9)}>{t('holes.9')}</Pressable>
            <Pressable aria-pressed={holes === 18} className={`host-toggle-btn${holes === 18 ? ' active' : ''}`} onClick={() => setHoles(18)}>{t('holes.18')}</Pressable>
          </div>
        </div>

        {/* Format */}
        <div style={sectionStyle}>
          <div style={labelStyle}>{t('host.format')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {FORMATS.map(f => (
              <Pressable key={f.key} aria-pressed={format === f.key} className={`host-toggle-btn${format === f.key ? ' active' : ''}`} onClick={() => setFormat(f.key)}>
                {f.label}
              </Pressable>
            ))}
          </div>
        </div>

        {/* Spots */}
        <div style={sectionStyle}>
          <div style={labelStyle}>{t('host.spots')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Pressable aria-label="−" style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', background: 'var(--bg-alt)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18 }} onClick={() => setSpots(Math.max(1, spots - 1))}>−</Pressable>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', minWidth: 32, textAlign: 'center' }}>{spots}</span>
            <Pressable aria-label="+" style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', background: 'var(--bg-alt)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18 }} onClick={() => setSpots(Math.min(8, spots + 1))}>+</Pressable>
          </div>
        </div>

        {/* Handicap */}
        <div style={sectionStyle}>
          <div style={labelStyle}>{t('host.handicap')}</div>
          <select
            value={handicap}
            onChange={e => setHandicap(e.target.value as HandicapRequirement)}
            style={{ width: '100%', padding: '12px 16px', border: '1.5px solid var(--line)', borderRadius: 'var(--r-md)', fontSize: 14, background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--sans)' }}
          >
            {HCP_OPTIONS.map(h => <option key={h.key} value={h.key}>{h.label}</option>)}
          </select>
        </div>

        {/* Green fee */}
        <div style={sectionStyle}>
          <div style={labelStyle}>{t('host.greenFee')}</div>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-md)', padding: '12px 16px', gap: 8 }}>
            <span style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 600 }}>NT$</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder={t('host.feePlaceholder')}
              value={greenFee}
              onChange={e => setGreenFee(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)' }}
            />
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
