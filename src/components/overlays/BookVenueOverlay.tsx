'use client'
import { useEffect, useMemo, useState } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useLang } from '@/contexts/LanguageContext'
import { formatMoney } from '@/lib/utils'
import { ApiError } from '@/lib/api'
import { bookingApi, VenueCard, VenueDetail, ConsumerSlot } from '@/lib/booking'
import { creditsApi } from '@/lib/credits'
import { WeekDatePicker } from '@/components/ui/WeekDatePicker'

type PayMethod = 'venue' | 'credits'

// Local date helper — overlays only render after a user interaction, so new Date()
// here runs client-side (no SSR/hydration concern).
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function BookVenueOverlay() {
  const { openOverlay, closeOverlay, overlayData, refreshData, showSuccess, openSheetWith, dataVersion } = useUI()
  const { t, lang } = useLang()

  const seed = overlayData as VenueCard | null
  const isOpen = openOverlay === 'bookVenue' && seed != null

  const [venue, setVenue] = useState<VenueDetail | null>(null)
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState<ConsumerSlot[] | null>(null)
  const [selected, setSelected] = useState<ConsumerSlot | null>(null)
  const [party, setParty] = useState(1)
  const [payMethod, setPayMethod] = useState<PayMethod>('venue')
  const [balance, setBalance] = useState<number | null>(null)
  const [booking, setBooking] = useState(false)
  const [openAsRound, setOpenAsRound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dayLabels = useMemo(() => {
    const locale = lang === 'zh' ? 'zh-TW' : 'en-US'
    return Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: 'short' }))
  }, [lang])
  const monthFmt = useMemo(
    () => (y: number, m: number) => new Date(y, m, 1).toLocaleDateString(lang === 'zh' ? 'zh-TW' : 'en-US', { month: 'long', year: 'numeric' }),
    [lang],
  )

  // Reset + load venue detail each time the overlay opens.
  useEffect(() => {
    if (!seed || !isOpen) return
    setVenue(null)
    setSelected(null)
    setParty(1)
    setPayMethod('venue')
    setOpenAsRound(false)
    setError(null)
    setDate(isoDate(new Date()))
    let stale = false
    bookingApi.getVenue(seed.id).then((v) => { if (!stale) setVenue(v) }).catch(() => {})
    return () => { stale = true }
  }, [isOpen, seed?.id])

  // Wallet balance — re-pull when credits change (e.g. after a top-up).
  useEffect(() => {
    if (!isOpen) return
    let stale = false
    creditsApi.getWallet().then((w) => { if (!stale) setBalance(w.balanceCents) }).catch(() => {})
    return () => { stale = true }
  }, [isOpen, dataVersion.credits])

  // Load slots whenever the selected date changes.
  useEffect(() => {
    if (!seed || !isOpen || !date) return
    setSlots(null)
    setSelected(null)
    let stale = false
    bookingApi.getSlots(seed.id, date).then((s) => { if (!stale) setSlots(s) }).catch(() => { if (!stale) setSlots([]) })
    return () => { stale = true }
  }, [isOpen, seed?.id, date])

  if (!isOpen || !seed) return null

  const v = venue ?? (seed as unknown as VenueDetail)
  const maxParty = Math.min(selected?.remaining ?? 1, venue?.maxPartySize ?? 4)
  const partyOptions = Array.from({ length: Math.max(1, maxParty) }, (_, i) => i + 1)
  const creditEligible = selected?.creditPriceCents != null
  const venueTotal = selected ? selected.priceCents * party : 0
  const creditTotal = creditEligible ? (selected!.creditPriceCents ?? 0) * party : 0
  const usingCredits = payMethod === 'credits' && creditEligible
  const total = usingCredits ? creditTotal : venueTotal
  const insufficient = usingCredits && balance != null && balance < creditTotal

  const handleBook = async () => {
    if (!selected || booking) return
    if (insufficient) { openSheetWith('wallet'); return } // top up instead of booking
    setBooking(true)
    setError(null)
    try {
      const result = await bookingApi.book(seed.id, selected.id, {
        partySize: party,
        payWithCredits: usingCredits,
        openAsRound: openAsRound && venue?.course != null,
      })
      refreshData('bookings')
      if (usingCredits) refreshData('credits')
      const madeRound = !!result?.roundId
      if (madeRound) refreshData('rounds')
      closeOverlay()
      showSuccess(madeRound ? t('booking.successWithRound') : t('booking.success'), `${v.name} · ${date} · ${selected.time}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('booking.failed'))
      // The slot may have just filled — refresh availability.
      bookingApi.getSlots(seed.id, date).then(setSlots).catch(() => {})
      setSelected(null)
    } finally {
      setBooking(false)
    }
  }

  return (
    <div className={`detail-overlay${isOpen ? ' open' : ''}`}>
      {/* Hero */}
      <div
        className="detail-hero"
        style={{ background: 'linear-gradient(135deg,#3A6080,#5C7A9A)', flexShrink: 0 }}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 45%, rgba(0,0,0,.5))' }} />
        <div className="detail-back" onClick={closeOverlay}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </div>
        <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 'var(--r-pill)', background: 'rgba(255,255,255,.22)', color: 'white' }}>
            {v.type === 'driving_range' ? t('booking.range') : t('booking.course')}
          </span>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, color: 'white', lineHeight: 1.2, marginTop: 8 }}>{v.name}</div>
          {v.locationText && <div style={{ fontSize: 13, color: 'rgba(255,255,255,.8)', marginTop: 4 }}>{v.locationText}</div>}
        </div>
      </div>

      <div className="scroll-body" style={{ padding: '18px 20px 120px' }}>
        {v.description && (
          <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 18 }}>{v.description}</div>
        )}

        {/* Pay-at-venue notice */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--primary-soft)', color: 'var(--primary-ink)', borderRadius: 'var(--r-md)', padding: '10px 12px', fontSize: 12, fontWeight: 600, marginBottom: 18 }}>
          <span>💳</span><span>{t('booking.payAtVenue')}</span>
        </div>

        {/* Date picker — swipeable week strip */}
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>{t('booking.selectDate')}</div>
        <div style={{ marginBottom: 20 }}>
          <WeekDatePicker selectedDate={date} onDateSelect={setDate} dayLabels={dayLabels} monthFormatter={monthFmt} />
        </div>

        {/* Slots */}
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>{t('booking.slotsFor')}</div>
        {slots === null ? (
          <div style={{ textAlign: 'center', padding: 20, fontSize: 13, color: 'var(--ink-3)' }}>{t('loading')}</div>
        ) : slots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, fontSize: 13, color: 'var(--ink-3)', background: 'var(--surface)', borderRadius: 'var(--r-lg)' }}>{t('booking.noSlots')}</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {slots.map((s) => {
              const on = selected?.id === s.id
              return (
                <div
                  key={s.id}
                  onClick={() => { setSelected(s); setParty(1); setPayMethod(s.creditPriceCents != null ? 'credits' : 'venue') }}
                  style={{
                    position: 'relative', padding: '10px 6px', textAlign: 'center', cursor: 'pointer',
                    borderRadius: 'var(--r-md)', border: `1.5px solid ${on ? 'var(--primary)' : 'var(--line)'}`,
                    background: on ? 'var(--primary-soft)' : 'var(--surface)',
                  }}
                >
                  {s.creditPriceCents != null && (
                    <span style={{ position: 'absolute', top: 4, right: 4, fontSize: 8, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#2E7D32', background: '#E8F5E9', borderRadius: 'var(--r-pill)', padding: '1px 5px' }}>{t('booking.deal')}</span>
                  )}
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{s.time}</div>
                  {s.creditPriceCents != null ? (
                    <div style={{ marginTop: 2 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>{formatMoney(s.creditPriceCents)}</div>
                      <div style={{ fontSize: 10, color: 'var(--ink-3)', textDecoration: 'line-through' }}>{formatMoney(s.priceCents)}</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{formatMoney(s.priceCents)}</div>
                  )}
                  {s.holes ? <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>{s.holes}{t('booking.holes')}</div> : null}
                </div>
              )
            })}
          </div>
        )}

        {error && <div style={{ marginTop: 16, background: '#FDECEA', color: '#B71C1C', borderRadius: 'var(--r-md)', padding: '10px 12px', fontSize: 13 }}>{error}</div>}
      </div>

      {/* Confirm bar */}
      {selected && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 20px 24px', background: 'linear-gradient(transparent,var(--bg) 30%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)' }}>{t('booking.party')}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {partyOptions.map((n) => (
                <div
                  key={n}
                  onClick={() => setParty(n)}
                  style={{
                    width: 34, height: 34, borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    border: `1px solid ${party === n ? 'var(--primary)' : 'var(--line)'}`,
                    background: party === n ? 'var(--primary)' : 'var(--surface)',
                    color: party === n ? 'white' : 'var(--ink-2)', fontSize: 14, fontWeight: 700,
                  }}
                >
                  {n}
                </div>
              ))}
            </div>
          </div>

          {/* Pay method — only when this slot has a credit deal */}
          {creditEligible && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {([
                ['venue', t('booking.payAtVenueOption'), venueTotal] as [PayMethod, string, number],
                ['credits', t('booking.payWithCredits'), creditTotal] as [PayMethod, string, number],
              ]).map(([m, label, amt]) => {
                const active = payMethod === m
                const short = m === 'credits' && balance != null && balance < creditTotal
                return (
                  <div
                    key={m}
                    onClick={() => setPayMethod(m)}
                    style={{
                      flex: 1, padding: '9px 8px', borderRadius: 'var(--r-md)', cursor: 'pointer', textAlign: 'center',
                      border: `1.5px solid ${active ? 'var(--primary)' : 'var(--line)'}`,
                      background: active ? 'var(--primary-soft)' : 'var(--surface)',
                    }}
                  >
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: active ? 'var(--primary-ink)' : 'var(--ink-2)' }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginTop: 2 }}>{formatMoney(amt)}</div>
                    {m === 'credits' && (
                      short
                        ? <div style={{ fontSize: 10, color: '#C0392B', marginTop: 1 }}>{t('booking.insufficientCredits')}</div>
                        : balance != null ? <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 1 }}>{formatMoney(balance)}</div> : null
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Open this tee time as a joinable round — only when the venue maps to a course */}
          {venue?.course && (
            <div
              onClick={() => setOpenAsRound((o) => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '10px 12px', borderRadius: 'var(--r-md)', border: `1.5px solid ${openAsRound ? 'var(--primary)' : 'var(--line)'}`, background: openAsRound ? 'var(--primary-soft)' : 'var(--surface)', cursor: 'pointer' }}
            >
              <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: `1.5px solid ${openAsRound ? 'var(--primary)' : 'var(--line)'}`, background: openAsRound ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {openAsRound && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="20 6 9 17 4 12" /></svg>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>{t('booking.openAsRound')}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{t('booking.openAsRoundHint')}</div>
              </div>
            </div>
          )}
          <div onClick={handleBook} style={{ background: 'var(--primary)', borderRadius: 'var(--r-lg)', padding: 16, textAlign: 'center', cursor: booking ? 'default' : 'pointer', boxShadow: '0 4px 20px rgba(92,122,154,.35)' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>
              {booking
                ? t('booking.booking')
                : insufficient
                  ? `${t('booking.topUp')} · ${formatMoney(creditTotal)}`
                  : `${t('booking.confirm')} · ${formatMoney(total)}`}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
