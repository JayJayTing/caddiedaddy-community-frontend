'use client'
import { useEffect, useState } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useLang } from '@/contexts/LanguageContext'
import { api } from '@/lib/api'
import { Round, RoundParticipant, RoundFormat, HandicapRequirement, RoundStatus } from '@/types/round'
import { avatarColor, getInitial, formatDate } from '@/lib/utils'

// NOTE: This is a FRONTEND-ONLY mockup. Accept/decline/edit/cancel mutate local
// React state only. The backend write endpoints are deferred to a later pass — see
// the `TODO(backend)` markers for exactly where each call will plug in. (We DO read
// the existing GET /rounds/:id to load participant names.)
export function ManageRoundOverlay() {
  const { openOverlay, openOverlayWith, overlayData } = useUI()
  const { t } = useLang()

  const round = overlayData as Round | null
  const isOpen = openOverlay === 'manageRound' && round != null

  // Local copies so mock actions are visibly reflected. Identify participants by userId
  // (the API does not return a participant `id`).
  const [participants, setParticipants] = useState<RoundParticipant[]>([])
  const [status, setStatus] = useState<RoundStatus>('open')
  const [date, setDate] = useState('')
  const [teeTime, setTeeTime] = useState('')
  const [format, setFormat] = useState<RoundFormat>('stroke_play')
  const [holes, setHoles] = useState<number>(18)
  const [spots, setSpots] = useState(4)
  const [handicap, setHandicap] = useState<HandicapRequirement>('all')
  const [greenFee, setGreenFee] = useState('')
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  // Re-seed each time the overlay opens: immediately from the (minimal) list data,
  // then refine from GET /rounds/:id which includes participant names.
  useEffect(() => {
    if (!round || !isOpen) return
    const seed = (r: Round) => {
      setParticipants(r.participants ?? [])
      setStatus(r.status)
      setDate((r.date ?? '').slice(0, 10))
      const d = new Date(r.teeTime)
      setTeeTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
      setFormat(r.format)
      setHoles(r.holes)
      setSpots(r.totalSpots)
      setHandicap(r.handicapRequirement)
      setGreenFee(r.greenFeeCents != null ? String(Math.round(r.greenFeeCents / 100)) : '')
      setNotes(r.notes ?? '')
    }
    seed(round)
    setSaved(false)
    setConfirmingCancel(false)
    let stale = false
    api.get<{ data: Round }>(`/rounds/${round.id}`)
      .then(({ data }) => { if (!stale && data) seed(data) })
      .catch(() => {})
    return () => { stale = true }
  }, [isOpen, round?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen || !round) return null

  const requests = participants.filter(p => p.role === 'requested')
  const players = participants.filter(p => p.role === 'accepted' || p.role === 'host')
  const openSpots = Math.max(0, spots - players.length)
  const cancelled = status === 'cancelled'

  const c1 = round.color1 ?? '#B8CBE0'
  const c2 = round.color2 ?? '#5C7A9A'

  // Optimistic local update + real backend call; revert role on failure.
  const setRole = (userId: string, role: RoundParticipant['role']) =>
    setParticipants(ps => ps.map(p => (p.userId === userId ? { ...p, role } : p)))

  const acceptRequest = async (userId: string) => {
    setRole(userId, 'accepted')
    try { await api.patch(`/rounds/${round.id}/participants/${userId}`, { role: 'accepted' }) }
    catch { setRole(userId, 'requested') }
  }
  const declineRequest = async (userId: string) => {
    setRole(userId, 'declined')
    try { await api.patch(`/rounds/${round.id}/participants/${userId}`, { role: 'declined' }) }
    catch { setRole(userId, 'requested') }
  }
  const saveChanges = async () => {
    try {
      await api.patch(`/rounds/${round.id}`, {
        date,
        teeTime,
        format,
        holes,
        totalSpots: spots,
        handicapRequirement: handicap,
        greenFeeCents: greenFee ? Math.round(parseFloat(greenFee) * 100) : null,
        notes: notes || null,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { /* leave form values so the host can retry */ }
  }
  const confirmCancel = async () => {
    setConfirmingCancel(false)
    try { await api.delete(`/rounds/${round.id}`); setStatus('cancelled') }
    catch { /* no-op */ }
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

  const sectionStyle = { marginBottom: 22 }
  const labelStyle = { fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' as const, color: 'var(--ink-3)', marginBottom: 10 }
  const inputStyle = { width: '100%', padding: '12px 14px', border: '1.5px solid var(--line)', borderRadius: 'var(--r-md)', fontSize: 14, background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--sans)' }

  return (
    <div className={`detail-overlay${isOpen ? ' open' : ''}`}>
      {/* Hero */}
      <div className="detail-hero" style={{ background: `linear-gradient(135deg,${c1},${c2})`, flexShrink: 0 }}>
        <div className="detail-back" onClick={() => openOverlayWith('roundDetail', round)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </div>
        <div style={{ position: 'absolute', bottom: 20, left: 20 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.8)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>{t('manage.title')}</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, color: 'white', lineHeight: 1.2, marginTop: 2 }}>{round.course.name}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.8)', marginTop: 4 }}>{formatDate(date)}</div>
        </div>
      </div>

      <div className="scroll-body" style={{ padding: '20px 20px 40px' }}>
        {cancelled && (
          <div style={{ background: '#FDECEA', color: '#C0392B', borderRadius: 'var(--r-md)', padding: '12px 14px', marginBottom: 20, fontSize: 14, fontWeight: 600, textAlign: 'center' }}>
            {t('manage.cancelled')}
          </div>
        )}

        {/* Join Requests */}
        <div style={sectionStyle}>
          <div style={labelStyle}>{t('manage.requests')} {requests.length > 0 ? `(${requests.length})` : ''}</div>
          {requests.length === 0 ? (
            <div style={{ fontSize: 14, color: 'var(--ink-3)', padding: '14px', background: 'var(--surface)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-sm)' }}>
              {t('manage.noRequests')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {requests.map(p => (
                <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-sm)' }}>
                  <div className="avatar" style={{ width: 40, height: 40, fontSize: 15, background: avatarColor(p.userId), flexShrink: 0 }}>
                    {p.user ? getInitial(p.user.displayName) : '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{p.user?.displayName ?? 'Player'}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{t('manage.requests')}</div>
                  </div>
                  {!cancelled && (
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button onClick={() => declineRequest(p.userId)} style={{ border: '1.5px solid var(--line)', background: 'var(--surface)', color: 'var(--ink-2)', borderRadius: 'var(--r-pill)', padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                        {t('manage.decline')}
                      </button>
                      <button onClick={() => acceptRequest(p.userId)} style={{ border: 'none', background: 'var(--primary)', color: 'white', borderRadius: 'var(--r-pill)', padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                        {t('manage.accept')}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Players */}
        <div style={sectionStyle}>
          <div style={labelStyle}>{t('manage.players')} ({players.length}/{spots})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {players.map(p => (
              <div key={p.userId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div className="avatar" style={{ width: 44, height: 44, fontSize: 16, background: avatarColor(p.userId) }}>
                  {p.user ? getInitial(p.user.displayName) : '?'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 600 }}>{p.role === 'host' ? 'Host' : (p.user?.displayName?.split(' ')[0] ?? 'Player')}</div>
              </div>
            ))}
            {Array.from({ length: openSpots }).map((_, i) => (
              <div key={`empty-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', border: '2px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 18, color: 'var(--ink-3)' }}>+</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>Open</div>
              </div>
            ))}
          </div>
        </div>

        {/* Edit Details */}
        <div style={{ ...sectionStyle, opacity: cancelled ? 0.5 : 1, pointerEvents: cancelled ? 'none' : 'auto' }}>
          <div style={labelStyle}>{t('manage.edit')}</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>{t('host.date')}</div>
              <input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={e => setDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>{t('host.teeTime')}</div>
              <input type="time" value={teeTime} onChange={e => setTeeTime(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>{t('host.format')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {FORMATS.map(f => (
                <div key={f.key} className={`host-toggle-btn${format === f.key ? ' active' : ''}`} onClick={() => setFormat(f.key)}>{f.label}</div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>{t('host.holes')}</div>
              <div className="host-toggle-row">
                <div className={`host-toggle-btn${holes === 9 ? ' active' : ''}`} onClick={() => setHoles(9)}>{t('holes.9')}</div>
                <div className={`host-toggle-btn${holes === 18 ? ' active' : ''}`} onClick={() => setHoles(18)}>{t('holes.18')}</div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>{t('host.spots')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: 'var(--bg-alt)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18 }} onClick={() => setSpots(Math.max(Math.max(1, players.length), spots - 1))}>−</div>
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', minWidth: 24, textAlign: 'center' }}>{spots}</span>
                <div style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: 'var(--bg-alt)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18 }} onClick={() => setSpots(Math.min(8, spots + 1))}>+</div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>{t('host.handicap')}</div>
            <select value={handicap} onChange={e => setHandicap(e.target.value as HandicapRequirement)} style={inputStyle}>
              {HCP_OPTIONS.map(h => <option key={h.key} value={h.key}>{h.label}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>{t('host.greenFee')}</div>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-md)', padding: '12px 16px', gap: 8 }}>
              <span style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 600 }}>NT$</span>
              <input type="number" inputMode="numeric" placeholder={t('host.feePlaceholder')} value={greenFee} onChange={e => setGreenFee(e.target.value)} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)' }} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>{t('host.notes')}</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder={t('host.notesPlaceholder')} style={{ ...inputStyle, minHeight: 76, resize: 'vertical' }} />
          </div>

          <div onClick={saveChanges} style={{ background: saved ? 'var(--bg-alt)' : 'var(--primary)', borderRadius: 'var(--r-lg)', padding: 15, textAlign: 'center', cursor: 'pointer', boxShadow: saved ? 'none' : '0 4px 16px rgba(92,122,154,.3)' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: saved ? 'var(--primary-ink)' : 'white' }}>{saved ? t('manage.saved') : t('manage.save')}</span>
          </div>
        </div>

        {/* Cancel Round */}
        {!cancelled && (
          <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 20 }}>
            {!confirmingCancel ? (
              <div onClick={() => setConfirmingCancel(true)} style={{ border: '1.5px solid #E8A99E', borderRadius: 'var(--r-lg)', padding: 14, textAlign: 'center', cursor: 'pointer' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#C0392B' }}>{t('manage.cancel')}</span>
              </div>
            ) : (
              <div style={{ background: '#FDECEA', borderRadius: 'var(--r-lg)', padding: 16 }}>
                <div style={{ fontSize: 14, color: '#C0392B', textAlign: 'center', marginBottom: 14, fontWeight: 600 }}>{t('manage.cancelConfirm')}</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div onClick={() => setConfirmingCancel(false)} style={{ flex: 1, border: '1.5px solid var(--line)', background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: 12, textAlign: 'center', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--ink-2)' }}>{t('manage.cancelKeep')}</div>
                  <div onClick={confirmCancel} style={{ flex: 1, background: '#C0392B', borderRadius: 'var(--r-md)', padding: 12, textAlign: 'center', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'white' }}>{t('manage.cancelYes')}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
