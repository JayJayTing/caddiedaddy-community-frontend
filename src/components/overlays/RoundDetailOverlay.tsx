'use client'
import { useEffect, useState } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LanguageContext'
import { api } from '@/lib/api'
import { Round } from '@/types/round'
import { formatDate, formatTeeTime, formatMoney, courseMapImage } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Pressable } from '@/components/ui/Pressable'

// Players may back out of a round for up to a minute after joining. Mirrors the
// server-enforced window so the UI and backend agree on when the option ends.
const BACKOUT_WINDOW_MS = 60_000

export function RoundDetailOverlay() {
  const { openOverlay, openOverlayWith, closeOverlay, overlayData, refreshData, showSuccess, showError } = useUI()
  const { user } = useAuth()
  const { t } = useLang()
  const [joining, setJoining] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [nowMs, setNowMs] = useState(0) // drives the back-out countdown; 0 until the ticker starts
  // Fresh detail (incl. the viewer's own participant row) fetched from GET /rounds/:id.
  // The list data in overlayData can be stale and omit the viewer's pending request,
  // which would otherwise make the button show "Request to Join" after already requesting.
  const [detail, setDetail] = useState<Round | null>(null)

  const seed = overlayData as Round | null
  const isOpen = openOverlay === 'roundDetail' && seed != null
  // Prefer freshly fetched detail; fall back to the list seed for instant render.
  const round = detail?.id === seed?.id ? detail ?? seed : seed

  // Re-fetch each time the overlay opens so request/host state reflects the server.
  useEffect(() => {
    if (!seed || !isOpen) return
    setJoining(false)
    let stale = false
    api.get<{ data: Round }>(`/rounds/${seed.id}`)
      .then(({ data }) => { if (!stale && data) setDetail(data) })
      .catch(() => {})
    return () => { stale = true }
  }, [isOpen, seed?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const accepted = round?.participants?.filter(p => p.role === 'accepted' || p.role === 'host').length ?? 0
  const openSpots = round ? Math.max(0, round.totalSpots - accepted) : 0

  const userP = user && round?.participants?.find(p => p.userId === user.id)
  const myRole = userP?.role
  const hasRequested = myRole === 'requested'
  const isHost = myRole === 'host'
  const isParticipant = myRole === 'accepted' || myRole === 'requested'
  const cancelled = round?.status === 'cancelled'

  // Back-out window: open for BACKOUT_WINDOW_MS after the viewer joined.
  const joinedMs = userP?.joinedAt ? new Date(userP.joinedAt).getTime() : 0
  const remainingMs = Math.max(0, BACKOUT_WINDOW_MS - (nowMs - joinedMs))
  const canBackOut = isParticipant && !isHost && nowMs > 0 && joinedMs > 0 && remainingMs > 0
  const backOutSec = Math.ceil(remainingMs / 1000)

  // Tick once a second while the viewer holds a spot, so the countdown updates.
  useEffect(() => {
    if (!isOpen || !isParticipant || isHost) return
    setNowMs(Date.now())
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [isOpen, isParticipant, isHost])

  const c1 = round?.color1 ?? '#B8CBE0'
  const c2 = round?.color2 ?? '#5C7A9A'
  const heroImg = courseMapImage(round?.course, { w: 780, h: 400, zoom: 15 })

  const handleJoin = async () => {
    if (!round || joining || hasRequested || isHost || cancelled) return
    setJoining(true)
    try {
      await api.post(`/rounds/${round.id}/join`)
      // Re-fetch so the players list and button reflect the new pending request.
      const { data } = await api.get<{ data: Round }>(`/rounds/${round.id}`)
      if (data) setDetail(data)
      refreshData('rounds')
      showSuccess(t('success.requestSent'))
    } catch (e) {
      showError(e instanceof Error ? e.message : t('error.join'))
    }
    setJoining(false)
  }

  const handleLeave = async () => {
    if (!round || leaving) return
    setLeaving(true)
    try {
      await api.post(`/rounds/${round.id}/leave`)
      const { data } = await api.get<{ data: Round }>(`/rounds/${round.id}`)
      if (data) setDetail(data)
      refreshData('rounds')
      showSuccess(t('success.leftRound'))
    } catch (e) {
      showError(e instanceof Error ? e.message : t('error.cancelJoin'))
    }
    setLeaving(false)
  }

  if (!isOpen || !round) return null

  return (
    <div className={`detail-overlay${isOpen ? ' open' : ''}`}>
      {/* Hero */}
      <div className="detail-hero" style={heroImg ? { backgroundImage: `url(${heroImg})`, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 } : { background: `linear-gradient(135deg,${c1},${c2})`, flexShrink: 0 }}>
        {!heroImg && (
          <svg viewBox="0 0 390 200" fill="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <path d="M-10 130 Q100 100 200 120 Q300 140 410 110 L410 210 L-10 210 Z" fill="rgba(255,255,255,.12)"/>
            <path d="M-10 160 Q80 145 200 155 Q320 165 410 148 L410 210 L-10 210 Z" fill="rgba(255,255,255,.08)"/>
            <line x1="290" y1="100" x2="290" y2="40" stroke="rgba(255,255,255,.7)" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M290 40 L318 52 L290 64 Z" fill="rgba(255,255,255,.85)"/>
          </svg>
        )}
        {/* Scrim so the title stays legible over satellite imagery */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 45%, rgba(0,0,0,.5))' }} />
        <Pressable className="detail-back" onClick={closeOverlay} aria-label={t('a11y.back')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </Pressable>
        <div style={{ position: 'absolute', bottom: 20, left: 20 }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, color: 'white', lineHeight: 1.2 }}>{round.course.name}</h2>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.8)', marginTop: 4 }}>{formatDate(round.date)} · {formatTeeTime(round.teeTime)}</div>
        </div>
      </div>

      <div className="scroll-body" style={{ padding: '20px 20px 100px' }}>
        {cancelled && (
          <div style={{ background: '#FDECEA', color: '#C0392B', borderRadius: 'var(--r-md)', padding: '12px 14px', marginBottom: 18, fontSize: 14, fontWeight: 600, textAlign: 'center' }}>
            {t('manage.cancelled')}
          </div>
        )}
        {/* Status badges */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          <span style={{ padding: '4px 12px', borderRadius: 'var(--r-pill)', fontSize: 12, fontWeight: 600, background: openSpots > 0 ? '#E8F5E9' : 'var(--bg-alt)', color: openSpots > 0 ? '#2E7D32' : 'var(--ink-3)' }}>
            {openSpots > 0 ? `${openSpots} ${t('home.spotsOpen')}` : t('common.full')}
          </span>
          <span style={{ padding: '4px 12px', borderRadius: 'var(--r-pill)', fontSize: 12, fontWeight: 600, background: 'var(--primary-soft)', color: 'var(--primary-ink)' }}>
            {round.venueType === 'driving_range' ? t('host.drivingRange') : `${round.holes} ${t('common.holesSuffix')}`}
          </span>
        </div>

        {/* Host */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '14px', background: 'var(--surface)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)' }}>
          <Avatar name={round.hostUser?.displayName} url={round.hostUser?.avatarUrl} seed={round.hostUserId} size={44} fontSize={16} />
          <div>
            <div style={{ fontSize: '11px', color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' } as React.CSSProperties}>{t('common.host')}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{round.hostUser?.displayName ?? t('common.host')}</div>
          </div>
        </div>

        {/* Details grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            [t('rounds.teeTime'), formatTeeTime(round.teeTime)],
            [t('host.date'), formatDate(round.date)],
            round.venueType === 'driving_range'
              ? [t('host.venue'), t('host.drivingRange')]
              : [t('rounds.holes'), `${round.holes} ${t('common.holesSuffix')}`],
            [t('rounds.greenFee'), formatMoney(round.greenFeeCents)],
          ].map(([label, val]) => (
            <div key={label} style={{ background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: '12px 14px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Notes */}
        {round.notes && (
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: '14px', marginBottom: 20, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>{t('round.hostNotes')}</div>
            <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6 }}>{round.notes}</div>
          </div>
        )}

        {/* Participants */}
        {round.participants?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 12 }}>{t('round.playersLabel')} ({accepted}/{round.totalSpots})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {round.participants
                .filter(p => p.role === 'host' || p.role === 'accepted')
                .map(p => (
                <div key={p.userId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <Avatar name={p.user?.displayName} url={p.user?.avatarUrl} seed={p.userId} size={44} fontSize={16} />
                  <div style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 600 }}>{p.role === 'host' ? t('common.host') : (p.user?.displayName?.split(' ')[0] ?? t('common.player'))}</div>
                </div>
              ))}
              {Array.from({ length: openSpots }).map((_, i) => {
                const requestedSpot = hasRequested && i === 0 // surface the viewer's pending request
                const canJoin = !isHost && !isParticipant && !cancelled
                const circle = (
                  <div style={{ width: 44, height: 44, borderRadius: '50%', border: `2px dashed ${requestedSpot ? 'var(--primary)' : 'var(--line)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: requestedSpot ? 15 : 18, color: requestedSpot ? 'var(--primary)' : 'var(--ink-3)' }}>{requestedSpot ? '⏳' : '+'}</span>
                  </div>
                )
                const label = (
                  <div style={{ fontSize: 10, color: requestedSpot ? 'var(--primary)' : 'var(--ink-3)', fontWeight: requestedSpot ? 700 : 400 }}>
                    {requestedSpot ? t('rounds.requested') : t('round.openSpot')}
                  </div>
                )
                if (canJoin) {
                  return (
                    <Pressable key={`empty-${i}`} onClick={handleJoin} disabled={joining} aria-label={t('rounds.requestToJoin')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none' }}>
                      {circle}{label}
                    </Pressable>
                  )
                }
                return (
                  <div key={`empty-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    {circle}{label}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Action button */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 20px 24px', background: 'linear-gradient(transparent,var(--bg) 40%)' }}>
        {isHost ? (
          <Pressable
            onClick={() => openOverlayWith('manageRound', round)}
            style={{
              display: 'block',
              width: '100%',
              background: 'var(--primary)',
              borderRadius: 'var(--r-lg)',
              padding: 18,
              textAlign: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(92,122,154,.35)',
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>{t('manage.title')}</span>
          </Pressable>
        ) : cancelled ? (
          <div style={{ width: '100%', background: 'var(--bg-alt)', borderRadius: 'var(--r-lg)', padding: 18, textAlign: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-3)' }}>{t('rounds.cancelled')}</span>
          </div>
        ) : isParticipant ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ width: '100%', background: 'var(--primary-soft)', borderRadius: 'var(--r-lg)', padding: 16, textAlign: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary-ink)' }}>✓ {t('round.youreIn')}</span>
            </div>
            {canBackOut && (
              <Pressable
                onClick={handleLeave}
                disabled={leaving}
                style={{
                  display: 'block',
                  width: '100%',
                  background: 'var(--surface)',
                  border: '1.5px solid var(--line)',
                  borderRadius: 'var(--r-lg)',
                  padding: 14,
                  textAlign: 'center',
                  cursor: leaving ? 'default' : 'pointer',
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 700, color: '#C0392B' }}>
                  {leaving ? '…' : `${t('round.backOut')} · ${backOutSec}s`}
                </span>
              </Pressable>
            )}
          </div>
        ) : (
          <Pressable
            onClick={handleJoin}
            disabled={joining}
            style={{
              display: 'block',
              width: '100%',
              background: 'var(--primary)',
              borderRadius: 'var(--r-lg)',
              padding: 18,
              textAlign: 'center',
              cursor: joining ? 'default' : 'pointer',
              boxShadow: '0 4px 20px rgba(92,122,154,.35)',
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>
              {joining ? '…' : t('rounds.requestToJoin')}
            </span>
          </Pressable>
        )}
      </div>
    </div>
  )
}
