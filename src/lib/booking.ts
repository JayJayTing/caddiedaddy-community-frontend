// Typed client for the merchant-booking API (venues, slots, bookings, merchant
// console). Wraps the shared `api` helper, which injects the Supabase bearer token.
import { api } from './api'

// ── Shared shapes ───────────────────────────────────────────────────────────────

export type VenueType = 'course' | 'driving_range'
export type PaymentMode = 'pay_at_venue' | 'deposit' | 'prepaid'
export type VenueStatus = 'pending' | 'approved' | 'active' | 'suspended'
export type SlotStatus = 'open' | 'blocked'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
export type OperatorRole = 'owner' | 'manager' | 'staff'

export interface VenueCard {
  id: string
  name: string
  type: VenueType
  locationText: string | null
  district: string | null
  city: string | null
  lat: number | null
  lng: number | null
  coverUrl: string | null
  paymentMode: PaymentMode
}

export interface VenueDetail extends VenueCard {
  description: string | null
  phone: string | null
  country: string
  minPartySize: number
  maxPartySize: number
  advanceBookingDays: number
  cancellationCutoffHours: number
  depositCents: number | null
  course: { id: string; name: string; holeCount: number } | null
}

export interface ConsumerSlot {
  id: string
  time: string // "HH:MM"
  holes: number | null
  capacity: number
  remaining: number
  priceCents: number
  creditPriceCents: number | null // discounted "deal" price when paying with credits; null = not eligible
}

export interface SlotRef {
  date: string
  startTime: string
  holes: number | null
}

export interface MyBooking {
  id: string
  partySize: number
  totalCents: number
  creditCents: number // >0 ⇒ paid with credits
  status: BookingStatus
  paymentStatus: string
  createdAt: string
  venue: { id: string; name: string; locationText: string | null; paymentMode: PaymentMode }
  slot: SlotRef
}

// ── Consumer ─────────────────────────────────────────────────────────────────

export const bookingApi = {
  listVenues: (params?: { city?: string; type?: VenueType; q?: string }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => v) as [string, string][],
    ).toString()
    return api.get<{ data: VenueCard[] }>(`/venues${qs ? `?${qs}` : ''}`).then((r) => r.data)
  },

  getVenue: (id: string) => api.get<{ data: VenueDetail }>(`/venues/${id}`).then((r) => r.data),

  getSlots: (venueId: string, date: string) =>
    api.get<{ data: ConsumerSlot[] }>(`/venues/${venueId}/slots?date=${date}`).then((r) => r.data),

  book: (
    venueId: string,
    slotId: string,
    body: { partySize: number; notes?: string; payWithCredits?: boolean },
  ) =>
    api.post<{ data: unknown }>(`/venues/${venueId}/slots/${slotId}/book`, body).then((r) => r.data),

  myBookings: () => api.get<{ data: MyBooking[] }>(`/bookings/mine`).then((r) => r.data),

  cancelBooking: (id: string) => api.post<{ ok: true }>(`/bookings/${id}/cancel`),
}

// ── Merchant console ─────────────────────────────────────────────────────────

export interface MerchantVenue {
  id: string
  name: string
  type: VenueType
  status: VenueStatus
  locationText: string | null
  city: string | null
  paymentMode: PaymentMode
  myRole: OperatorRole | null
  _count: { bookings: number; slots: number }
}

export interface AvailabilityRule {
  id: string
  label: string | null
  weekdayMask: number
  startMinute: number
  endMinute: number
  intervalMin: number
  holes: number | null
  capacity: number
  priceCents: number
  creditPriceCents: number | null
  validFrom: string | null
  validTo: string | null
  active: boolean
}

export type SlotSource = 'rule' | 'manual' | 'import'

export interface MerchantSlot {
  id: string
  startTime: string
  holes: number | null
  capacity: number
  bookedCount: number
  priceCents: number
  creditPriceCents: number | null
  status: SlotStatus
  source: SlotSource
}

// Full venue detail + booking policy (the /merchant/venues/:id payload).
export interface MerchantVenueDetail {
  id: string
  name: string
  type: VenueType
  status: VenueStatus
  locationText: string | null
  district: string | null
  city: string | null
  phone: string | null
  description: string | null
  coverUrl: string | null
  paymentMode: PaymentMode
  depositCents: number | null
  minPartySize: number
  maxPartySize: number
  advanceBookingDays: number
  cancellationCutoffHours: number
  commissionBps: number
  _count?: { bookings: number; slots: number; availabilityRules: number }
}

export interface VenuePolicy {
  name?: string
  locationText?: string | null
  district?: string | null
  city?: string | null
  phone?: string | null
  description?: string | null
  paymentMode?: PaymentMode
  depositCents?: number | null
  minPartySize?: number
  maxPartySize?: number
  advanceBookingDays?: number
  cancellationCutoffHours?: number
}

export interface AvailabilityException {
  id: string
  date: string // YYYY-MM-DD
  type: 'closed' | 'custom_hours'
  reason: string | null
}

export interface PeriodStat {
  bookings: number
  creditBookings: number
  earnedCents: number // net to the venue
  grossCents: number
}

export interface VenueStats {
  day: PeriodStat
  month: PeriodStat
  year: PeriodStat
}

export interface MerchantBooking {
  id: string
  partySize: number
  totalCents: number
  creditCents: number
  status: BookingStatus
  paymentStatus: string
  notes: string | null
  createdAt: string
  user: { id: string; displayName: string; avatarUrl: string | null; avatarInitial: string | null }
  slot: SlotRef
}

export interface NewRuleInput {
  label?: string
  weekdayMask: number
  startMinute: number
  endMinute: number
  intervalMin: number
  holes?: number | null
  capacity: number
  priceCents: number
  creditPriceCents?: number | null
  validFrom?: string | null
  validTo?: string | null
}

export interface RulePatch {
  label?: string | null
  weekdayMask?: number
  startMinute?: number
  endMinute?: number
  intervalMin?: number
  holes?: number | null
  capacity?: number
  priceCents?: number
  creditPriceCents?: number | null
  validFrom?: string | null
  validTo?: string | null
  active?: boolean
}

export interface NewManualSlot {
  date: string // YYYY-MM-DD
  startMinute: number
  holes?: number | null
  capacity: number
  priceCents: number
  creditPriceCents?: number | null
}

export const merchantApi = {
  myVenues: () => api.get<{ data: MerchantVenue[] }>(`/merchant/venues`).then((r) => r.data),

  createVenue: (body: {
    name: string
    type: VenueType
    locationText?: string
    district?: string
    city?: string
    phone?: string
    description?: string
  }) => api.post<{ data: { id: string } }>(`/merchant/venues`, body).then((r) => r.data),

  getVenue: (venueId: string) =>
    api.get<{ data: MerchantVenueDetail; myRole: OperatorRole }>(`/merchant/venues/${venueId}`),

  updateVenue: (venueId: string, body: VenuePolicy) =>
    api.patch<{ data: MerchantVenueDetail }>(`/merchant/venues/${venueId}`, body).then((r) => r.data),

  stats: (venueId: string) =>
    api.get<{ data: VenueStats }>(`/merchant/venues/${venueId}/stats`).then((r) => r.data),

  listRules: (venueId: string) =>
    api.get<{ data: AvailabilityRule[] }>(`/merchant/venues/${venueId}/availability-rules`).then((r) => r.data),

  createRule: (venueId: string, body: NewRuleInput) =>
    api.post<{ data: AvailabilityRule }>(`/merchant/venues/${venueId}/availability-rules`, body).then((r) => r.data),

  updateRule: (venueId: string, ruleId: string, body: RulePatch) =>
    api.patch<{ data: AvailabilityRule }>(`/merchant/venues/${venueId}/availability-rules/${ruleId}`, body).then((r) => r.data),

  deleteRule: (venueId: string, ruleId: string) =>
    api.delete<{ ok: true }>(`/merchant/venues/${venueId}/availability-rules/${ruleId}`),

  generateSlots: (venueId: string, from: string, to: string) =>
    api.post<{ created: number }>(`/merchant/venues/${venueId}/slots/generate`, { from, to }),

  addManualSlot: (venueId: string, body: NewManualSlot) =>
    api.post<{ data: MerchantSlot }>(`/merchant/venues/${venueId}/slots`, body).then((r) => r.data),

  listSlots: (venueId: string, date: string) =>
    api.get<{ data: MerchantSlot[] }>(`/merchant/venues/${venueId}/slots?date=${date}`).then((r) => r.data),

  patchSlot: (venueId: string, slotId: string, body: { status?: SlotStatus; priceCents?: number; creditPriceCents?: number | null; capacity?: number }) =>
    api.patch<{ data: MerchantSlot }>(`/merchant/venues/${venueId}/slots/${slotId}`, body).then((r) => r.data),

  listBookings: (venueId: string, date?: string) =>
    api
      .get<{ data: MerchantBooking[] }>(`/merchant/venues/${venueId}/bookings${date ? `?date=${date}` : ''}`)
      .then((r) => r.data),

  setBookingStatus: (venueId: string, bookingId: string, status: BookingStatus) =>
    api.patch<{ ok: true }>(`/merchant/venues/${venueId}/bookings/${bookingId}`, { status }),

  // Closures / date overrides
  listExceptions: (venueId: string) =>
    api.get<{ data: AvailabilityException[] }>(`/merchant/venues/${venueId}/exceptions`).then((r) => r.data),

  addException: (venueId: string, body: { date: string; reason?: string }) =>
    api
      .post<{ data: AvailabilityException; removedSlots: number; activeBookings: number }>(
        `/merchant/venues/${venueId}/exceptions`,
        body,
      ),

  deleteException: (venueId: string, exceptionId: string) =>
    api.delete<{ ok: true }>(`/merchant/venues/${venueId}/exceptions/${exceptionId}`),
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function formatCents(cents: number): string {
  return `NT$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export function minutesToLabel(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function weekdayMaskLabel(mask: number): string {
  const days = WEEKDAY_LABELS.filter((_, i) => mask & (1 << i))
  if (days.length === 7) return 'Every day'
  if (mask === 0b0111110) return 'Mon–Fri'
  if (mask === 0b1000001) return 'Weekends'
  return days.join(', ')
}

export function labelToMinutes(label: string): number {
  const [h, m] = label.split(':').map(Number)
  return h * 60 + m
}

// Convenience weekday bitmasks (bit 0 = Sunday … bit 6 = Saturday)
export const MASK_WEEKDAYS = 0b0111110 // Mon–Fri
export const MASK_WEEKEND = 0b1000001 // Sat + Sun
export const MASK_EVERYDAY = 0b1111111
