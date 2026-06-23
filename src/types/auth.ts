export interface AuthUser {
  id: string
  displayName: string
  avatarUrl: string | null
  avatarInitial: string | null
  bio: string | null
  locationText: string | null
  handicapIndex: number | null
  memberSince: string | null
  createdAt: string
  homeCourse?: { id: string; name: string; locationText: string | null } | null
}

export interface AuthSession {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

export interface AuthResponse {
  session: AuthSession
  user: AuthUser
}
