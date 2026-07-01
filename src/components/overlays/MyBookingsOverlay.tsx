'use client'
import { useEffect, useState } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useLang } from '@/contexts/LanguageContext'
import { formatMoney, formatDate } from '@/lib/utils'
import { ApiError } from '@/lib/api'
import { bookingApi, MyBooking, BookingStatus } from '@/lib/booking'
import type { TranslationKey } from '@/lib/translations'

const STATUS_KEY: Record<BookingStatus, TranslationKey> = {
  confirmed: 'booking.status.confirmed',
  pending: 'booking.status.confirmed',
  cancelled: 'booking.status.cancelled',
  completed: 'booking.status.completed',
  no_show: 'booking.status.no_show',
}
const STATUS_COLOR: Record<BookingStatus, [string, string]> = {
  confirmed: ['#E8F5E9', '#2E7D32'],
  pending: ['#E8F5E9', '#2E7D32'],
  cancelled: ['#FDECEA', '#B71C1C'],
  completed: ['var(--primary-soft)', 'var(--primary-ink)'],
  no_show: ['#FDECEA', '#B71C1C'],
}

export function MyBookingsOverlay() {
  const { openOverlay, closeOverlay, dataVersion, refreshData, showSuccess } = useUI()
  const { t } = useLang()
  const isOpen = openOverlay === 'myBookings'

  const [bookings, setBookings] = useState<MyBooking[] | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setBookings(null)
    setError(null)
    let stale = false
    bookingApi.myBookings().then((b) => { if (!stale) setBookings(b) }).catch(() => { if (!stale) setBookings([]) })
    return () => { stale = true }
  }, [isOpen, dataVersion.bookings])

  if (!isOpen) return null

  const cancel = async (id: string) => {
    if (cancelling) return
    setCancelling(id)
    setError(null)
    try {
      await bookingApi.cancelBooking(id)
      refreshData('bookings')
      showSuccess(t('booking.cancelled'))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('booking.failed'))
    } finally {
      setCancelling(null)
    }
  }

  return (
    <div className={`detail-overlay${isOpen ? ' open' : ''}`}>
      <div className="detail-hero" style={{ background: 'linear-gradient(135deg,#D9430A,#FF6A1A)', flexShrink: 0, minHeight: 140 }}>
        <div className="detail-back" onClick={closeOverlay}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </div>
        <div style={{ position: 'absolute', bottom: 20, left: 20 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, color: 'white' }}>{t('booking.myBookingsTitle')}</div>
        </div>
      </div>

      <div className="scroll-body" style={{ padding: '18px 20px 100px' }}>
        {error && <div style={{ background: '#FDECEA', color: '#B71C1C', borderRadius: 'var(--r-md)', padding: '10px 12px', fontSize: 13, marginBottom: 14 }}>{error}</div>}

        {bookings === null ? (
          <div style={{ textAlign: 'center', padding: 24, fontSize: 13, color: 'var(--ink-3)' }}>{t('loading')}</div>
        ) : bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 36 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🗓️</div>
            <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>{t('booking.noBookings')}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {bookings.map((b) => {
              const [bg, fg] = STATUS_COLOR[b.status] ?? ['var(--bg-alt)', 'var(--ink-3)']
              const canCancel = b.status === 'confirmed' || b.status === 'pending'
              return (
                <div key={b.id} style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 16, boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{b.venue.name}</div>
                    <span style={{ flexShrink: 0, padding: '3px 9px', borderRadius: 'var(--r-pill)', fontSize: 11, fontWeight: 700, background: bg, color: fg }}>{t(STATUS_KEY[b.status])}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500, marginBottom: 12 }}>
                    {formatDate(b.slot.date)} · {b.slot.startTime.slice(11, 16)}
                    {b.slot.holes ? ` · ${b.slot.holes}${t('booking.holes')}` : ''}
                    {' · '}{b.partySize} {t('booking.party')} · {formatMoney(b.totalCents)}
                  </div>
                  {b.creditCents > 0 && (
                    <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#2E7D32', background: '#E8F5E9', borderRadius: 'var(--r-pill)', padding: '2px 9px', marginBottom: 12 }}>
                      {t('booking.paidWithCredits')}
                    </div>
                  )}
                  {canCancel && (
                    <div onClick={() => cancel(b.id)} style={{ textAlign: 'center', background: 'var(--bg-alt)', borderRadius: 'var(--r-md)', padding: 10, cursor: cancelling ? 'default' : 'pointer' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#B71C1C' }}>{cancelling === b.id ? '…' : t('booking.cancel')}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
