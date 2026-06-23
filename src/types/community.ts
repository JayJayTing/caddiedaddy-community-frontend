export type CommunityType = 'mixed' | 'mens_club' | 'ladies_club' | 'corporate' | 'beginner'
export type CommunityPrivacy = 'public' | 'invite_only' | 'private'
export type CommunityMemberRole = 'admin' | 'leader' | 'member'

export interface Community {
  id: string
  creatorId: string
  creator?: { id: string; displayName: string; avatarInitial: string | null }
  name: string
  type: CommunityType
  privacy: CommunityPrivacy
  description: string | null
  color1: string | null
  color2: string | null
  logoUrl: string | null
  memberCount: number
  postCount: number
  roundCount: number
  createdAt: string
  _count?: { members: number; rounds: number }
  userMembership?: { role: CommunityMemberRole } | null
}
