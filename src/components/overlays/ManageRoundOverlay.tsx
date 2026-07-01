'use client'
import { useEffect, useState } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useLang } from '@/contexts/LanguageContext'
import { api } from '@/lib/api'
import { Round, RoundParticipant, RoundStatus } from '@/types/round'
import { Player } from '@/types/player'
import { formatDate, formatHandicap } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Pressable } from '@/components/ui/Pressable'
import { DateField } from '@/components/ui/DateField'

// Accept/decline/edit/cancel call the real backend endpoints (PATCH/DELETE /rounds/:id…)
// with optimistic local updates that revert on failure. Participant names are loaded
// from GET /rounds/:id on open.
export function ManageRoundOverlay() {
  const { openOverlay, openOverlayWith, overlayData, refreshData, showError } = useUI()
  const { t } = useLang()

  const round = overlayData as Round | null
  const isOpen = openOverlay === 'manageRound' && round != null

  // Local copies so mock actions are visibly reflected. Identify participants by userId
  // (the API does not return a participant `id`).
  const [participants, setParticipants] = useState<RoundParticipant[]>([])
  const [status, setStatus] = useState<RoundStatus>('open')
  const [date, setDate] = useState('')
  const [teeTime, setTeeTime] = useState('')
  const [holes, setHoles] = useState<number>(18)
  const [spots, setSpots] = useState(4)
  const [greenFee, setGreenFee] = useState('')
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  // Invite picker (host fills an open spot directly).
  const [inviteOpen, setInviteOpen] = useState(false)
  const [friends, setFriends] = useState<Player[]>([])
  const [inviteQuery, setInviteQuery] = useState('')
  const [inviteResults, setInviteResults] = useState<Player[]>([])
  const [invitingId, setInvitingId] = useState<string | null>(null)

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
      setHoles(r.holes)
      setSpots(Math.min(r.totalSpots, r.venueType === 'driving_range' ? 10 : 4))
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

  // Load the host's friends when the invite picker opens.
  useEffect(() => {
    if (!inviteOpen) { setInviteQuery(''); setInviteResults([]); return }
    api.get<{ data: Player[] }>('/users/friends').then(r => setFriends(r.data ?? [])).catch(() => {})
  }, [inviteOpen])

  // Debounced player search inside the invite picker.
  useEffect(() => {
    const q = inviteQuery.trim()
    if (!q) { setInviteResults([]); return }
    const id = setTimeout(() => {
      api.get<{ data: Player[] }>(`/users/search?q=${encodeURIComponent(q)}`)
        .then(r => setInviteResults(r.data ?? []))
        .catch(() => setInviteResults([]))
    }, 300)
    return () => clearTimeout(id)
  }, [inviteQuery])

  if (!isOpen || !round) return null

  const requests = participants.filter(p => p.role === 'requested')
  const players = participants.filter(p => p.role === 'accepted' || p.role === 'host')
  const openSpots = Math.max(0, spots - players.length)
  const cancelled = status === 'cancelled'

  const c1 = round.color1 ?? '#FF8A3D'
  const c2 = round.color2 ?? '#E24E00'

  // Optimistic local update + real backend call; revert role on failure.
  const setRole = (userId: string, role: RoundParticipant['role']) =>
    setParticipants(ps => ps.map(p => (p.userId === userId ? { ...p, role } : p)))

  const acceptRequest = async (userId: string) => {
    setRole(userId, 'accepted')
    try { await api.patch(`/rounds/${round.id}/participants/${userId}`, { role: 'accepted' }); refreshData('rounds') }
    catch { setRole(userId, 'requested'); showError(t('error.generic')) }
  }
  const declineRequest = async (userId: string) => {
    setRole(userId, 'declined')
    try { await api.patch(`/rounds/${round.id}/participants/${userId}`, { role: 'declined' }); refreshData('rounds') }
    catch { setRole(userId, 'requested'); showError(t('error.generic')) }
  }
  const saveChanges = async () => {
    try {
      await api.patch(`/rounds/${round.id}`, {
        date,
        teeTime,
        holes: round.venueType === 'course' ? holes : undefined,
        totalSpots: spots,
        greenFeeCents: greenFee ? Math.round(parseFloat(greenFee) * 100) : null,
        notes: notes || null,
      })
      refreshData('rounds')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { showError(t('error.saveProfile')) /* leave form values so the host can retry */ }
  }
  const confirmCancel = async () => {
    setConfirmingCancel(false)
    try { await api.delete(`/rounds/${round.id}`); setStatus('cancelled'); refreshData('rounds') }
    catch { showError(t('error.generic')) }
  }

  const handleInvite = async (userId: string) => {
    if (invitingId) return
    setInvitingId(userId)
    try {
      const { data } = await api.post<{ data: Round }>(`/rounds/${round.id}/invite`, { userId })
      if (data?.participants) {
        setParticipants(data.participants)
        const taken = data.participants.filter(p => p.role === 'accepted' || p.role === 'host').length
        if (taken >= (data.totalSpots ?? spots)) setInviteOpen(false) // close once full
      }
      refreshData('rounds')
    } catch {
      showError(t('error.generic'))
    } finally {
      setInvitingId(null)
    }
  }

  const existingIds = new Set(participants.map(p => p.userId))
  const inviteList = (inviteQuery.trim() ? inviteResults : friends).filter(p => !existingIds.has(p.id))

  // Player cap depends on venue: a flight is max 4 on a course, a range up to 10.
  const maxSpots = round.venueType === 'driving_range' ? 10 : 4
  const spotOptions = Array.from({ length: maxSpots - 1 }, (_, i) => i + 2) // 2..max

  const sectionStyle = { marginBottom: 22 }
  const labelStyle = { fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' as const, color: 'var(--ink-3)', marginBottom: 10 }
  const inputStyle = { width: '100%', padding: '12px 14px', border: '1.5px solid var(--line)', borderRadius: 'var(--r-md)', fontSize: 14, background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--sans)' }

  return (
    <div className={`detail-overlay${isOpen ? ' open' : ''}`}>
      {/* Hero */}
      <div className="detail-hero" style={{ background: `linear-gradient(135deg,${c1},${c2})`, flexShrink: 0 }}>
        <Pressable className="detail-back" onClick={() => openOverlayWith('roundDetail', round)} aria-label={t('a11y.back')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Pressable>
        <div style={{ position: 'absolute', bottom: 20, left: 20 }}>
          <h2 style={{ fontSize: 12, color: 'rgba(255,255,255,.8)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>{t('manage.title')}</h2>
          <div className="serif" style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginTop: 2 }}>{round.course.name}</div>
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
                  <Avatar name={p.user?.displayName} url={p.user?.avatarUrl} seed={p.userId} size={40} fontSize={15} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{p.user?.displayName ?? t('common.player')}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{t('manage.requests')}</div>
                  </div>
                  {!cancelled && (
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button onClick={() => declineRequest(p.userId)} style={{ border: '1.5px solid var(--line)', background: 'var(--surface)', color: 'var(--ink-2)', borderRadius: 'var(--r-pill)', padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                        {t('manage.decline')}
                      </button>
                      <button onClick={() => acceptRequest(p.userId)} className="serif" style={{ border: 'none', background: 'var(--primary)', color: 'white', borderRadius: 'var(--r-pill)', padding: '7px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
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
                <Avatar name={p.user?.displayName} url={p.user?.avatarUrl} seed={p.userId} size={44} fontSize={16} />
                <div style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 600 }}>{p.role === 'host' ? t('common.host') : (p.user?.displayName?.split(' ')[0] ?? t('common.player'))}</div>
              </div>
            ))}
            {Array.from({ length: openSpots }).map((_, i) => (
              <Pressable
                key={`empty-${i}`}
                onClick={() => setInviteOpen(true)}
                disabled={cancelled}
                aria-label={t('manage.inviteTitle')}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none' }}
              >
                <div style={{ width: 44, height: 44, borderRadius: '50%', border: '2px dashed var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 18, color: 'var(--primary)' }}>+</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 600 }}>{t('manage.invite')}</div>
              </Pressable>
            ))}
          </div>
        </div>

        {/* Edit Details */}
        <div style={{ ...sectionStyle, opacity: cancelled ? 0.5 : 1, pointerEvents: cancelled ? 'none' : 'auto' }}>
          <div style={labelStyle}>{t('manage.edit')}</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>{t('host.date')}</div>
              <DateField value={date} onChange={setDate} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>{t('host.teeTime')}</div>
              <input type="time" value={teeTime} onChange={e => setTeeTime(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {round.venueType === 'course' && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>{t('host.holes')}</div>
              <div className="host-toggle-row">
                <Pressable className={`host-toggle-btn${holes === 9 ? ' active' : ''}`} onClick={() => setHoles(9)} aria-pressed={holes === 9}>{t('holes.9')}</Pressable>
                <Pressable className={`host-toggle-btn${holes === 18 ? ' active' : ''}`} onClick={() => setHoles(18)} aria-pressed={holes === 18}>{t('holes.18')}</Pressable>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span>{t('host.spots')}</span>
              <span style={{ fontWeight: 700, color: 'var(--ink-3)' }}>{spots} / {maxSpots}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {spotOptions.map(n => {
                const active = spots === n
                const disabled = n < players.length // can't drop below seated players
                return (
                  <Pressable
                    key={n}
                    aria-pressed={active}
                    aria-label={`${n}`}
                    disabled={disabled}
                    onClick={() => !disabled && setSpots(n)}
                    style={{
                      width: 42, height: 42, borderRadius: 'var(--r-md)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15, fontWeight: 700,
                      cursor: disabled ? 'default' : 'pointer',
                      opacity: disabled ? 0.35 : 1,
                      border: active ? '1.5px solid var(--primary)' : '1.5px solid var(--line)',
                      background: active ? 'var(--primary)' : 'var(--surface)',
                      color: active ? '#fff' : 'var(--ink)',
                    }}
                  >
                    {n}
                  </Pressable>
                )
              })}
            </div>
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

          <Pressable onClick={saveChanges} style={{ display: 'block', width: '100%', background: saved ? 'var(--bg-alt)' : 'var(--primary)', borderRadius: 'var(--r-lg)', padding: 15, textAlign: 'center', cursor: 'pointer', boxShadow: saved ? 'none' : 'var(--shadow-cta)' }}>
            <span className="serif" style={{ fontSize: 15, fontWeight: 800, color: saved ? 'var(--primary-ink)' : 'white' }}>{saved ? t('manage.saved') : t('manage.save')}</span>
          </Pressable>
        </div>

        {/* Cancel Round */}
        {!cancelled && (
          <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 20 }}>
            {!confirmingCancel ? (
              <Pressable onClick={() => setConfirmingCancel(true)} style={{ display: 'block', width: '100%', border: '1.5px solid #E8A99E', borderRadius: 'var(--r-lg)', padding: 14, textAlign: 'center', cursor: 'pointer' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#C0392B' }}>{t('manage.cancel')}</span>
              </Pressable>
            ) : (
              <div style={{ background: '#FDECEA', borderRadius: 'var(--r-lg)', padding: 16 }}>
                <div style={{ fontSize: 14, color: '#C0392B', textAlign: 'center', marginBottom: 14, fontWeight: 600 }}>{t('manage.cancelConfirm')}</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Pressable onClick={() => setConfirmingCancel(false)} style={{ flex: 1, border: '1.5px solid var(--line)', background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: 12, textAlign: 'center', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--ink-2)' }}>{t('manage.cancelKeep')}</Pressable>
                  <Pressable onClick={confirmCancel} style={{ flex: 1, background: '#C0392B', borderRadius: 'var(--r-md)', padding: 12, textAlign: 'center', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'white' }}>{t('manage.cancelYes')}</Pressable>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite picker — host fills an open spot from friends / search */}
      {inviteOpen && (
        <div onClick={() => setInviteOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(26,35,50,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, maxHeight: '82%', background: 'var(--bg)', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column', padding: '16px 18px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 500, color: 'var(--ink)' }}>{t('manage.inviteTitle')}</div>
              <Pressable aria-label={t('a11y.close')} onClick={() => setInviteOpen(false)} style={{ padding: 4 }}>
                <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </Pressable>
            </div>
            <div className="search-bar" style={{ marginBottom: 12 }}>
              <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              <input value={inviteQuery} onChange={e => setInviteQuery(e.target.value)} placeholder={t('players.search')} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)' }} />
            </div>
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {inviteList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--ink-3)', fontSize: 13 }}>{inviteQuery.trim() ? t('players.noResults') : t('players.noFriends')}</div>
              ) : inviteList.map(p => (
                <div key={p.id} className="mod-row" style={{ alignItems: 'center', cursor: 'default' }}>
                  <Avatar name={p.displayName} url={p.avatarUrl} seed={p.id} size={42} fontSize={15} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{p.displayName}</div>
                    {(p.handicapIndex != null || p.locationText) && (
                      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                        {[p.handicapIndex != null ? `${t('profile.stat.hcp')} ${formatHandicap(p.handicapIndex)}` : null, p.locationText || null].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                  <Pressable onClick={() => handleInvite(p.id)} disabled={invitingId === p.id} style={{ background: 'var(--primary)', color: 'white', borderRadius: 'var(--r-pill)', padding: '7px 16px', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                    {invitingId === p.id ? '…' : t('manage.invite')}
                  </Pressable>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
