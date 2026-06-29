'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LanguageContext'
import { api } from '@/lib/api'
import { Round } from '@/types/round'
import { formatTeeTime, formatMoney, courseMapImage, formatMonthYear } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Pressable } from '@/components/ui/Pressable'
import { RoundCardSkeleton } from '@/components/ui/Skeleton'
import { useMounted } from '@/lib/useMounted'
import { useActivated } from '@/hooks/useActivated'
import type { TranslationKey } from '@/lib/translations'

type Filter = 'all' | 'morning' | 'afternoon' | '9h' | '18h' | 'communities'

// ─── Date picker ─────────────────────────────────────────────────────────────

function WeekDatePicker({
  selectedDate, onSelect, roundDates,
}: { selectedDate: string | null; onSelect: (d: string | null) => void; roundDates: Set<string> }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const mounted = useMounted()
  const { t } = useLang()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const WEEKS = 13
  const DAY_LABELS: TranslationKey[] = ['day.mon', 'day.tue', 'day.wed', 'day.thu', 'day.fri', 'day.sat', 'day.sun']

  // Monday of the current week (weeks run Mon → Sun).
  const startMonday = new Date(today)
  startMonday.setDate(today.getDate() - ((today.getDay() + 6) % 7))

  const weeks = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startMonday)
      d.setDate(startMonday.getDate() + w * 7 + i)
      return d
    }),
  )
  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const [monthLabel, setMonthLabel] = useState(() => formatMonthYear(weeks[0][3]))

  // Snaps one whole week at a time; the month header follows the visible week.
  const handleScroll = () => {
    const el = scrollRef.current
    if (!el || el.clientWidth === 0) return
    const wIdx = Math.min(weeks.length - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth)))
    setMonthLabel(formatMonthYear(weeks[wIdx][3]))
  }

  return (
    <div className="dp-wrap">
      <div className="dp-month-row dp-month-center">
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{mounted ? monthLabel : ''}</span>
      </div>
      <div className="dp-day-labels">
        {DAY_LABELS.map((d, i) => <div key={i} className="dp-day-label">{t(d)}</div>)}
      </div>
      <div className="dp-weeks" ref={scrollRef} onScroll={handleScroll}>
        {mounted && weeks.map((week, wi) => (
          <div key={wi} className="dp-week-page">
            {week.map((d) => {
              const ds = toDateStr(d)
              const isSelected = selectedDate === ds
              const isToday = d.getTime() === today.getTime()
              const isPast = d < today
              const hasDot = roundDates.has(ds)
              return (
                <Pressable key={ds} className="dp-cell" aria-pressed={isSelected} onClick={() => onSelect(isSelected ? null : ds)}>
                  <div className="dp-circle" style={{
                    background: isSelected ? 'var(--primary)' : isToday ? 'var(--primary-soft)' : 'transparent',
                    color: isSelected ? 'white' : isPast ? 'var(--ink-3)' : 'var(--ink)',
                    fontWeight: isToday || isSelected ? 700 : 400,
                    opacity: isPast && !isSelected ? 0.45 : 1,
                  }}>
                    {d.getDate()}
                  </div>
                  <div className="dp-dot" style={{ visibility: hasDot && !isSelected ? 'visible' : 'hidden' }} />
                </Pressable>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Round card ───────────────────────────────────────────────────────────────

export function RoundCard({ round, onOpenDetail }: { round: Round; onOpenDetail: () => void }) {
  const { t } = useLang()
  const { user } = useAuth()
  const { refreshData, showSuccess, showError } = useUI()
  const [expanded, setExpanded] = useState(false)
  const [joined, setJoined] = useState(false)
  const [joining, setJoining] = useState(false)

  const accepted = round.participants?.filter(p => p.role === 'accepted' || p.role === 'host').length ?? 0
  const openSpots = Math.max(0, round.totalSpots - accepted)
  const c1 = round.color1 ?? '#B8CBE0'
  const c2 = round.color2 ?? '#5C7A9A'
  const art = courseMapImage(round.course, { w: 240, h: 240, zoom: 15 })
  const userP = user && round.participants?.find(p => p.userId === user.id)
  const hasRequested = userP?.role === 'requested' || joined
  const isHost = userP?.role === 'host'

  const handleJoin = async () => {
    if (joining || hasRequested || isHost) return
    setJoining(true)
    try {
      await api.post(`/rounds/${round.id}/join`)
      setJoined(true)
      refreshData('rounds')
      showSuccess(t('success.requestSent'))
    } catch {
      showError(t('error.join'))
    }
    setJoining(false)
  }

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
      <div role="button" tabIndex={0} style={{ display: 'flex', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(!expanded) } }}>
        <div style={{ width: 80, flexShrink: 0, position: 'relative', overflow: 'hidden', minHeight: 80, ...(art ? { backgroundImage: `url(${art})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: `linear-gradient(135deg,${c1},${c2})` }) }}>
          {!art && (
            <svg viewBox="0 0 80 100" fill="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              <path d="M-2 66 Q20 50 40 58 Q60 66 82 54 L82 104 L-2 104 Z" fill="rgba(255,255,255,.2)"/>
              <line x1="56" y1="52" x2="56" y2="28" stroke="rgba(255,255,255,.7)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M56 28 L68 34 L56 40 Z" fill="rgba(255,255,255,.85)"/>
            </svg>
          )}
        </div>
        <div style={{ flex: 1, padding: '13px 13px 13px 11px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 5 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2 }}>{round.course.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <span style={{ padding: '3px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: openSpots > 0 ? '#E8F5E9' : 'var(--bg-alt)', color: openSpots > 0 ? '#2E7D32' : 'var(--ink-3)' }}>
                {openSpots > 0 ? `${openSpots} ${t('rounds.open')}` : t('common.full')}
              </span>
              <svg className={`round-card-chevron${expanded ? ' open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500, marginBottom: 8 }}>
            {formatTeeTime(round.teeTime)} · {round.venueType === 'driving_range' ? t('host.drivingRange') : `${round.holes}h`} · {formatMoney(round.greenFeeCents)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex' }}>
              {round.participants?.slice(0, 3).map((p, i) => (
                <Avatar key={p.id} name={p.user?.displayName} url={p.user?.avatarUrl} seed={p.userId} size={24} fontSize={9} style={{ border: '2px solid var(--surface)', marginLeft: i === 0 ? 0 : -8 }} />
              ))}
            </div>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{round.hostUser.displayName} {t('home.hosting')}</span>
          </div>
        </div>
      </div>
      <div className={`round-card-expand${expanded ? ' open' : ''}`}>
        <div style={{ borderTop: '1px solid var(--line-soft)', padding: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {[
              [t('rounds.teeTime'), formatTeeTime(round.teeTime)],
              round.venueType === 'driving_range'
                ? [t('host.venue'), t('host.drivingRange')]
                : [t('rounds.holes'), `${round.holes} ${t('common.holesSuffix')}`],
              [t('rounds.greenFee'), formatMoney(round.greenFeeCents)],
            ].map(([label, val]) => (
              <div key={label} style={{ background: 'var(--bg-alt)', borderRadius: 'var(--r-sm)', padding: '10px 12px' }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{val}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Pressable
              style={{ flex: 1, background: hasRequested || isHost ? 'var(--bg-alt)' : 'var(--primary)', borderRadius: 'var(--r-md)', padding: 11, textAlign: 'center', cursor: hasRequested || isHost ? 'default' : 'pointer' }}
              onClick={handleJoin}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: hasRequested || isHost ? 'var(--ink-3)' : 'white' }}>
                {isHost ? t('round.yours') : hasRequested ? t('rounds.requested') : joining ? '…' : t('rounds.requestToJoin')}
              </span>
            </Pressable>
            <Pressable style={{ background: 'var(--bg-alt)', borderRadius: 'var(--r-md)', padding: '11px 14px', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={onOpenDetail}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>{t('common.fullPage')}</span>
            </Pressable>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function RoundsScreen() {
  const { activeScreen, setActiveScreen, openOverlayWith, dataVersion } = useUI()
  const { t } = useLang()
  const { user } = useAuth()
  const activated = useActivated('rounds')
  const [rounds, setRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<Filter>('all')

  useEffect(() => {
    if (!user || !activated) return
    let alive = true
    api.get<{ data: Round[] }>('/rounds')
      .then(r => { if (alive) setRounds(r.data ?? []) })
      .catch(() => { if (alive) setRounds([]) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [user, activated, dataVersion.rounds])

  const roundDates = new Set(rounds.map(r => (r.date ?? '').slice(0, 10)))

  const filtered = rounds.filter(r => {
    if (search && !r.course.name.toLowerCase().includes(search.toLowerCase())) return false
    if (selectedDate && (r.date ?? '').slice(0, 10) !== selectedDate) return false
    if (activeFilter === 'morning') {
      const h = new Date(r.teeTime).getHours()
      if (h >= 12) return false
    }
    if (activeFilter === 'afternoon') {
      const h = new Date(r.teeTime).getHours()
      if (h < 12) return false
    }
    if (activeFilter === '9h') {
      if (r.venueType !== 'course' || r.holes !== 9) return false
    }
    if (activeFilter === '18h') {
      if (r.venueType !== 'course' || r.holes !== 18) return false
    }
    return true
  })

  const FILTERS: Array<{ key: Filter; label: string }> = [
    { key: 'all', label: t('rounds.filter.all') },
    { key: 'morning', label: t('rounds.filter.morning') },
    { key: 'afternoon', label: t('rounds.filter.afternoon') },
    { key: '9h', label: t('rounds.filter.9h') },
    { key: '18h', label: t('rounds.filter.18h') },
  ]

  return (
    <div className={`screen${activeScreen === 'rounds' ? ' active' : ''}`}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', flexShrink: 0 }}>
        <h1 className="serif" style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)' }}>{t('rounds.title')}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Pressable
            style={{ background: 'var(--primary)', borderRadius: 'var(--r-md)', padding: '8px 16px', cursor: 'pointer' }}
            onClick={() => setActiveScreen('host')}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>+ {t('rounds.host')}</span>
          </Pressable>
          <Avatar name={user?.displayName} url={user?.avatarUrl} seed={user?.id} size={34} fontSize={13} onClick={() => setActiveScreen('profile')} title={t('common.profile')} />
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '0 20px 12px', flexShrink: 0 }}>
        <div className="search-bar">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder={t('rounds.search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)' }}
          />
        </div>
      </div>

      {/* Date picker */}
      <WeekDatePicker selectedDate={selectedDate} onSelect={setSelectedDate} roundDates={roundDates} />

      {/* Filter pills */}
      <div style={{ flexShrink: 0 }}>
        <div className="hscroll" style={{ padding: '8px 20px', gap: 8 }}>
          {FILTERS.map(f => (
            <Pressable key={f.key} className={`filter-pill${activeFilter === f.key ? ' active' : ''}`} aria-pressed={activeFilter === f.key} onClick={() => setActiveFilter(f.key)}>
              {f.label}
            </Pressable>
          ))}
        </div>
        {selectedDate && (
          <div style={{ padding: '0 20px 8px' }}>
            <Pressable
              className="filter-pill active link"
              onClick={() => setSelectedDate(null)}
              style={{ fontSize: 11 }}
            >
              {t('rounds.clearDate')}
            </Pressable>
          </div>
        )}
      </div>

      {/* List */}
      <div className="scroll-body" style={{ padding: '8px 20px 24px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{[0, 1, 2, 3].map(i => <RoundCardSkeleton key={i} />)}</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⛳️</div>
            <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>{t('rounds.noRounds')}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(r => (
              <RoundCard key={r.id} round={r} onOpenDetail={() => openOverlayWith('roundDetail', r)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
