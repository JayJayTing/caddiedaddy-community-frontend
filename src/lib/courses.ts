import { api } from './api'
import type { Course } from '@/types/round'

export type CourseStatus = 'pending' | 'approved' | 'rejected'

export interface CourseSubmission {
  name: string
  locationText?: string
  district?: string
  city?: string
  holeCount?: number
  venueType?: 'course' | 'driving_range'
  lat: number
  lng: number
  coverPhotoUrl?: string
  photos?: string[]
}

export interface PendingCourse extends Course {
  status: CourseStatus
  rejectionReason: string | null
  createdAt: string
  submittedBy: {
    id: string
    displayName: string
    avatarInitial: string | null
    avatarUrl: string | null
  } | null
}

// Approved courses for the explore map + search. Omit `q` to get every pin.
export const listCourses = (q?: string) =>
  api.get<{ data: Course[] }>(`/courses${q ? `?q=${encodeURIComponent(q)}` : ''}`).then((r) => r.data)

export const getCourse = (id: string) =>
  api.get<{ data: Course }>(`/courses/${id}`).then((r) => r.data)

export const submitCourse = (body: CourseSubmission) =>
  api.post<{ data: Course }>('/courses', body).then((r) => r.data)

export const uploadCoursePhoto = (file: File) =>
  api.upload<{ data: { url: string } }>('/uploads/course', file).then((r) => r.data.url)

// ── Admin (gated server-side by ADMIN_USER_IDS; non-admins get 403) ──────────────

export const listCourseQueue = (status: CourseStatus = 'pending') =>
  api.get<{ data: PendingCourse[] }>(`/courses/admin/queue?status=${status}`).then((r) => r.data)

export const moderateCourse = (
  id: string,
  body: Partial<CourseSubmission> & { status?: CourseStatus; rejectionReason?: string | null },
) => api.patch<{ data: Course }>(`/courses/admin/${id}`, body).then((r) => r.data)

export const deleteCourse = (id: string) => api.delete(`/courses/admin/${id}`)

// Prisma Decimal lat/lng arrive as strings — coerce to a number or null.
export const coord = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined) return null
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : null
}

// ── Location search — OpenStreetMap (Nominatim), free & key-less ─────────────────
// Lets submitters SEARCH for a place by name/address instead of only dropping a
// pin. Same OSM provider as the map tiles. Nominatim allows CORS; callers debounce
// and the queries are country-biased + capped to stay within its usage policy.

export interface PlaceResult {
  label: string
  lat: number
  lng: number
  city?: string
  district?: string
}

const NOMINATIM = 'https://nominatim.openstreetmap.org'

function placeFromAddress(a: Record<string, string> | undefined): { city?: string; district?: string } {
  if (!a) return {}
  return {
    city: a.city || a.county || a.state || a.town || a.city_district,
    district: a.suburb || a.city_district || a.town || a.village || a.neighbourhood,
  }
}

export async function searchPlaces(q: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const url = `${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=tw&accept-language=zh-TW&q=${encodeURIComponent(q)}`
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) return []
  const rows = (await res.json()) as Array<{
    display_name: string
    lat: string
    lon: string
    address?: Record<string, string>
  }>
  return rows.map((r) => ({
    label: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    ...placeFromAddress(r.address),
  }))
}

export async function reverseGeocode(lat: number, lng: number): Promise<PlaceResult | null> {
  const url = `${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&accept-language=zh-TW&lat=${lat}&lon=${lng}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  const r = (await res.json()) as { display_name?: string; address?: Record<string, string> }
  if (!r.display_name) return null
  return { label: r.display_name, lat, lng, ...placeFromAddress(r.address) }
}
