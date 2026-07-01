import { translations, type Language, type TranslationKey } from '@/lib/translations'

// These formatting helpers run outside React, so they can't read LanguageContext.
// LanguageProvider keeps this in sync via setFormatLang() on mount and on toggle.
let _lang: Language = 'zh'
export function setFormatLang(l: Language) { _lang = l }

export function timeAgo(date: string): string {
  const then = new Date(date).getTime()
  if (Number.isNaN(then)) return ''
  const now = Date.now()
  const diff = Math.max(0, now - then)
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  const weeks = Math.floor(days / 7)
  if (_lang === 'zh') {
    if (mins < 1) return '剛剛'
    if (mins < 60) return `${mins} 分鐘前`
    if (hours < 24) return `${hours} 小時前`
    if (days < 7) return `${days} 天前`
    return `${weeks} 週前`
  }
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return `${weeks}w ago`
}

export function formatMoney(cents: number | null | undefined): string {
  if (cents == null) return _lang === 'zh' ? '免費' : 'Free'
  return `NT$${Math.round(cents / 100).toLocaleString()}`
}

export function formatTeeTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(_lang === 'zh' ? 'zh-TW' : 'en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  // Accept both 'YYYY-MM-DD' and full ISO datetimes from the API.
  const d = new Date(dateStr.length <= 10 ? `${dateStr}T00:00:00` : dateStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(_lang === 'zh' ? 'zh-TW' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const _locale = () => (_lang === 'zh' ? 'zh-TW' : 'en-US')

// Clock time (e.g. chat message timestamps). Language-aware; pass an ISO string.
export function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(_locale(), { hour: 'numeric', minute: '2-digit' })
}

// Long, written-out date (e.g. news detail, "member since"): "June 30, 2026".
export function formatDateLong(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr.length <= 10 ? `${dateStr}T00:00:00` : dateStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(_locale(), { year: 'numeric', month: 'long', day: 'numeric' })
}

// Full, unambiguous date with the weekday spelled out — for detail headers where
// clarity matters. en: "Monday, July 6, 2026"  ·  zh: "2026年7月6日 星期一".
export function formatDateFull(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr.length <= 10 ? `${dateStr}T00:00:00` : dateStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(_locale(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

// Month + year header (date pickers). Takes a Date.
export function formatMonthYear(d: Date): string {
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(_locale(), { month: 'long', year: 'numeric' })
}

// Weekday + short date (home greeting header): "Monday, Jun 30".
export function formatWeekdayShort(d: Date): string {
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(_locale(), { weekday: 'long', month: 'short', day: 'numeric' })
}

// Per-user avatar identity: warm gradient pairs (Forely). Each entry is
// [start, end] — the design's flag examples (orange / violet / blue /
// deep-orange / green). avatarColor returns the start stop (for use as a solid
// or as a stop inside another gradient); avatarGradient returns the full fill.
const AVATAR_GRADIENTS: [string, string][] = [
  ['#FFB020', '#FF6A1A'], // orange
  ['#7A5AF0', '#4E32C7'], // violet
  ['#2E9BE4', '#1668C7'], // blue
  ['#FF8A3D', '#E24E00'], // deep-orange
  ['#159A5B', '#0C6B3E'], // green
]

function avatarIndex(seed: string | null | undefined): number {
  const s = seed ?? ''
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % AVATAR_GRADIENTS.length
}

// Solid color (the gradient's start stop) — safe to embed as a color stop.
export function avatarColor(seed: string | null | undefined): string {
  return AVATAR_GRADIENTS[avatarIndex(seed)][0]
}

// Full linear-gradient fill for avatar circles.
export function avatarGradient(seed: string | null | undefined): string {
  const [a, b] = AVATAR_GRADIENTS[avatarIndex(seed)]
  return `linear-gradient(135deg,${a},${b})`
}

export function getInitial(name: string | null | undefined): string {
  return ((name || '?')[0] || '?').toUpperCase()
}

export function formatHandicap(hcp: number | string | null | undefined): string {
  if (hcp == null) return '—'
  // The API sends handicapIndex as a Prisma Decimal, which serializes to a string.
  const n = typeof hcp === 'number' ? hcp : Number(hcp)
  return Number.isFinite(n) ? n.toFixed(1) : '—'
}

export function formatHcpReq(req: string): string {
  const key = `hcp.${req}` as TranslationKey
  return translations[_lang][key] ?? req
}

export function formatFormat(fmt: string): string {
  const key = `format.${fmt}` as TranslationKey
  return translations[_lang][key] ?? fmt
}

// Google Static Maps satellite tile for a course, built from its lat/lng.
// Returns null when there's no API key or no coords — callers fall back to the
// gradient art. Key is provided via NEXT_PUBLIC_MAPS_KEY (build key-ready).
export function courseMapImage(
  course: { lat?: number | string | null; lng?: number | string | null } | null | undefined,
  opts: { w?: number; h?: number; zoom?: number } = {},
): string | null {
  const key = process.env.NEXT_PUBLIC_MAPS_KEY
  if (!key || !course) return null
  const lat = course.lat != null ? Number(course.lat) : NaN
  const lng = course.lng != null ? Number(course.lng) : NaN
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null
  const { w = 640, h = 320, zoom = 15 } = opts
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${w}x${h}&scale=2&maptype=satellite&key=${key}`
}

// Golf-themed placeholder photos for announcements that don't carry their own
// image. Deterministic per announcement id, so a card keeps the same photo
// across renders. Each entry is a base Unsplash URL; sizing/crop params are
// appended at call time.
const ANNOUNCEMENT_PHOTOS = [
  'https://images.unsplash.com/photo-1535131749006-b7f58c99034b',
  'https://images.unsplash.com/photo-1535132011086-b8818f016104',
  'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa',
  'https://images.unsplash.com/photo-1592919505780-303950717480',
  'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb',
  'https://images.unsplash.com/photo-1551632811-561732d1e306',
]

// Cover image for an announcement: its own imageUrl when present, otherwise a
// stable golf placeholder picked from the pool above by hashing the id.
export function announcementImage(
  ann: { id: string; imageUrl?: string | null },
  opts: { w?: number; h?: number } = {},
): string {
  if (ann.imageUrl) return ann.imageUrl
  let hash = 0
  for (let i = 0; i < ann.id.length; i++) {
    hash = (hash * 31 + ann.id.charCodeAt(i)) | 0
  }
  const photo = ANNOUNCEMENT_PHOTOS[Math.abs(hash) % ANNOUNCEMENT_PHOTOS.length]
  const { w = 480, h = 320 } = opts
  return `${photo}?auto=format&fit=crop&q=70&w=${w}&h=${h}`
}

// Thumbnail for a round card/hero. Prefers the course's own cover photo, then a
// Google Maps satellite view (when a maps key + coords exist), and finally a
// stable golf photo keyed off the course id. Always returns an image URL — this
// replaces the old off-theme colour gradient so round imagery is consistent and
// on-brand everywhere a round is shown.
export function roundThumbImage(
  round:
    | {
        id?: string
        course?: {
          id?: string
          coverPhotoUrl?: string | null
          lat?: number | string | null
          lng?: number | string | null
        } | null
      }
    | null
    | undefined,
  opts: { w?: number; h?: number; zoom?: number } = {},
): string {
  const course = round?.course
  if (course?.coverPhotoUrl) return course.coverPhotoUrl
  const map = courseMapImage(course, opts)
  if (map) return map
  const seed = course?.id ?? round?.id ?? ''
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  const photo = ANNOUNCEMENT_PHOTOS[Math.abs(hash) % ANNOUNCEMENT_PHOTOS.length]
  const { w = 480, h = 320 } = opts
  return `${photo}?auto=format&fit=crop&q=70&w=${w}&h=${h}`
}
