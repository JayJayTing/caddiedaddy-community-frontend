export type RoundFormat = 'stroke_play' | 'stableford' | 'best_ball' | 'scramble'
export type HandicapRequirement = 'all' | 'u10' | 'u15' | 'u20' | 'u28'
export type RoundStatus = 'open' | 'full' | 'cancelled' | 'completed'
export type ParticipantRole = 'host' | 'accepted' | 'requested' | 'declined' | 'waitlisted'

export interface Round {
  id: string
  hostUserId: string
  hostUser: { id: string; displayName: string; avatarInitial: string | null; avatarUrl?: string | null }
  courseId: string
  course: { id: string; name: string; locationText: string | null; coverPhotoUrl?: string | null; lat?: number | string | null; lng?: number | string | null }
  date: string           // YYYY-MM-DD
  teeTime: string        // ISO datetime, use time part
  venueType: 'course' | 'driving_range'
  format: RoundFormat
  holes: number
  totalSpots: number
  greenFeeCents: number | null
  handicapRequirement: HandicapRequirement
  visibility: 'public' | 'community'
  communityId: string | null
  notes: string | null
  color1: string | null
  color2: string | null
  status: RoundStatus
  createdAt: string
  participants: RoundParticipant[]
  _count?: { participants: number }
}

export interface RoundParticipant {
  id: string
  roundId: string
  userId: string
  user?: { id: string; displayName: string; avatarInitial: string | null; avatarUrl?: string | null }
  role: ParticipantRole
  joinedAt: string
}

export interface Course {
  id: string
  name: string
  locationText: string | null
  district: string | null
  city: string | null
  holeCount: number
  venueType?: 'course' | 'driving_range'
  lat?: number | string | null
  lng?: number | string | null
  coverPhotoUrl?: string | null
  photos?: string[]
}
