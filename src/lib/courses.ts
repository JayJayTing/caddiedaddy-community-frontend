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
