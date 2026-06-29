'use client'
import { useEffect, useState } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useLang } from '@/contexts/LanguageContext'
import { Pressable } from '@/components/ui/Pressable'
import { bookingApi, VenueCard } from '@/lib/booking'

// Standalone "Find a tee time" destination — a first-class venue list reached
// from the Play menu (previously only buried in Home's tee-times tab). Tapping a
// venue opens the booking overlay.
export function TeeTimesOverlay() {
  const { openOverlay, closeOverlay, openOverlayWith, dataVersion } = useUI()
  const { t } = useLang()
  const isOpen = openOverlay === 'teeTimes'
  const [venues, setVenues] = useState<VenueCard[] | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setVenues(null)
    let stale = false
    bookingApi.listVenues().then((v) => { if (!stale) setVenues(v) }).catch(() => { if (!stale) setVenues([]) })
    return () => { stale = true }
  }, [isOpen, dataVersion.bookings])

  if (!isOpen) return null

  const palette = [['var(--butter)', 'var(--butter-deep)'], ['var(--sage)', 'var(--sage-deep)'], ['var(--lilac)', 'var(--lilac-deep)']]

  return (
    <div className="detail-overlay open">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px 12px', flexShrink: 0, borderBottom: '1px solid var(--line-soft)' }}>
        <Pressable onClick={closeOverlay} aria-label={t('a11y.back')} style={{ width: 34, height: 34, background: 'var(--bg-alt)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Pressable>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 500, color: 'var(--ink)' }}>{t('teeTimes.title')}</h2>
        <Pressable onClick={() => openOverlayWith('myBookings')} style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: 'var(--primary)', cursor: 'pointer' }}>
          {t('home.teeTimes.myBookings')}
        </Pressable>
      </div>

      <div className="scroll-body" style={{ padding: '12px 16px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {venues === null ? (
          <div style={{ textAlign: 'center', padding: 24, fontSize: 13, color: 'var(--ink-3)' }}>{t('loading')}</div>
        ) : venues.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 28, fontSize: 13, color: 'var(--ink-3)', background: 'var(--surface)', borderRadius: 'var(--r-lg)' }}>{t('home.teeTimes.empty')}</div>
        ) : (
          venues.map((v, idx) => {
            const [c1, c2] = palette[idx % 3]
            return (
              <div key={v.id} style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', background: `linear-gradient(135deg,${c1},${c2})`, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 1 }}>{v.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}>
                    {v.type === 'driving_range' ? t('booking.range') : t('booking.course')}{v.locationText ? ` · ${v.locationText}` : ''}
                  </div>
                </div>
                <Pressable onClick={() => openOverlayWith('bookVenue', v)} style={{ background: 'var(--primary)', borderRadius: 'var(--r-md)', padding: '7px 14px', cursor: 'pointer', flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>{t('home.teeTimes.book')}</span>
                </Pressable>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
