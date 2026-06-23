'use client'
import { useState } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { Round } from '@/types/round'
import { avatarColor, getInitial, formatDate, formatTeeTime, formatMoney, formatFormat, formatHcpReq } from '@/lib/utils'

export function RoundDetailOverlay() {
  const { openOverlay, closeOverlay, overlayData } = useUI()
  const { user } = useAuth()
  const [joined, setJoined] = useState(false)
  const [joining, setJoining] = useState(false)

  const round = overlayData as Round | null
  const isOpen = openOverlay === 'roundDetail' && round != null

  const accepted = round?.participants?.filter(p => p.role === 'accepted' || p.role === 'host').length ?? 0
  const openSpots = round ? Math.max(0, round.totalSpots - accepted) : 0

  const userP = user && round?.participants?.find(p => p.userId === user.id)
  const hasRequested = userP?.role === 'requested' || joined
  const isHost = userP?.role === 'host'

  const c1 = round?.color1 ?? '#B8CBE0'
  const c2 = round?.color2 ?? '#5C7A9A'

  const handleJoin = async () => {
    if (!round || joining || hasRequested || isHost) return
    setJoining(true)
    try { await api.post(`/rounds/${round.id}/join`); setJoined(true) } catch {}
    setJoining(false)
  }

  if (!round) return null

  return (
    <div className={`detail-overlay${isOpen ? ' open' : ''}`}>
      {/* Hero */}
      <div className="detail-hero" style={{ background: `linear-gradient(135deg,${c1},${c2})`, flexShrink: 0 }}>
        <svg viewBox="0 0 390 200" fill="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <path d="M-10 130 Q100 100 200 120 Q300 140 410 110 L410 210 L-10 210 Z" fill="rgba(255,255,255,.12)"/>
          <path d="M-10 160 Q80 145 200 155 Q320 165 410 148 L410 210 L-10 210 Z" fill="rgba(255,255,255,.08)"/>
          <line x1="290" y1="100" x2="290" y2="40" stroke="rgba(255,255,255,.7)" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M290 40 L318 52 L290 64 Z" fill="rgba(255,255,255,.85)"/>
        </svg>
        <div className="detail-back" onClick={closeOverlay}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </div>
        <div style={{ position: 'absolute', bottom: 20, left: 20 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, color: 'white', lineHeight: 1.2 }}>{round.course.name}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.8)', marginTop: 4 }}>{formatDate(round.date)} · {formatTeeTime(round.teeTime)}</div>
        </div>
      </div>

      <div className="scroll-body" style={{ padding: '20px 20px 100px' }}>
        {/* Status badges */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          <span style={{ padding: '4px 12px', borderRadius: 'var(--r-pill)', fontSize: 12, fontWeight: 600, background: openSpots > 0 ? '#E8F5E9' : 'var(--bg-alt)', color: openSpots > 0 ? '#2E7D32' : 'var(--ink-3)' }}>
            {openSpots > 0 ? `${openSpots} spots open` : 'Full'}
          </span>
          <span style={{ padding: '4px 12px', borderRadius: 'var(--r-pill)', fontSize: 12, fontWeight: 600, background: 'var(--primary-soft)', color: 'var(--primary-ink)' }}>
            {round.holes}h · {formatFormat(round.format)}
          </span>
          <span style={{ padding: '4px 12px', borderRadius: 'var(--r-pill)', fontSize: 12, fontWeight: 600, background: 'var(--bg-alt)', color: 'var(--ink-2)' }}>
            {formatHcpReq(round.handicapRequirement)}
          </span>
        </div>

        {/* Host */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '14px', background: 'var(--surface)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="avatar" style={{ width: 44, height: 44, fontSize: 16, background: avatarColor(round.hostUserId) }}>
            {getInitial(round.hostUser.displayName)}
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' } as React.CSSProperties}>Host</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{round.hostUser.displayName}</div>
          </div>
        </div>

        {/* Details grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            ['Tee Time', formatTeeTime(round.teeTime)],
            ['Date', formatDate(round.date)],
            ['Format', formatFormat(round.format)],
            ['Holes', `${round.holes} holes`],
            ['Handicap', formatHcpReq(round.handicapRequirement)],
            ['Green Fee', formatMoney(round.greenFeeCents)],
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
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>Notes from Host</div>
            <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6 }}>{round.notes}</div>
          </div>
        )}

        {/* Participants */}
        {round.participants?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 12 }}>Players ({accepted}/{round.totalSpots})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {round.participants.map(p => (
                <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div className="avatar" style={{ width: 44, height: 44, fontSize: 16, background: avatarColor(p.userId) }}>
                    {p.user ? getInitial(p.user.displayName) : '?'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 600 }}>{p.role === 'host' ? 'Host' : p.role}</div>
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
        )}
      </div>

      {/* Join button */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 20px 24px', background: 'linear-gradient(transparent,var(--bg) 40%)' }}>
        <div
          onClick={handleJoin}
          style={{
            background: hasRequested || isHost ? 'var(--bg-alt)' : 'var(--primary)',
            borderRadius: 'var(--r-lg)',
            padding: 18,
            textAlign: 'center',
            cursor: hasRequested || isHost ? 'default' : 'pointer',
            boxShadow: hasRequested || isHost ? 'none' : '0 4px 20px rgba(92,122,154,.35)',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: hasRequested || isHost ? 'var(--ink-3)' : 'white' }}>
            {isHost ? 'Your Round' : hasRequested ? 'Requested ✓' : joining ? '…' : 'Request to Join'}
          </span>
        </div>
      </div>
    </div>
  )
}
