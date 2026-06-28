export function timeAgo(date: string): string {
  const then = new Date(date).getTime()
  if (Number.isNaN(then)) return ''
  const now = Date.now()
  const diff = Math.max(0, now - then)
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  const weeks = Math.floor(days / 7)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return `${weeks}w ago`
}

export function formatMoney(cents: number | null | undefined): string {
  if (cents == null) return 'Free'
  return `NT$${Math.round(cents / 100).toLocaleString()}`
}

export function formatTeeTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  // Accept both 'YYYY-MM-DD' and full ISO datetimes from the API.
  const d = new Date(dateStr.length <= 10 ? `${dateStr}T00:00:00` : dateStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const AVATAR_COLORS = ['var(--peach)', 'var(--sky)', 'var(--lilac)', 'var(--sage)', 'var(--butter)', 'var(--rose)']

export function avatarColor(seed: string | null | undefined): string {
  const s = seed ?? ''
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
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
  const map: Record<string, string> = {
    all: 'All HCP',
    u10: 'HCP <10',
    u15: 'HCP <15',
    u20: 'HCP <20',
    u28: 'HCP <28',
  }
  return map[req] ?? req
}

export function formatFormat(fmt: string): string {
  const map: Record<string, string> = {
    stroke_play: 'Stroke Play',
    stableford: 'Stableford',
    best_ball: 'Best Ball',
    scramble: 'Scramble',
  }
  return map[fmt] ?? fmt
}
