export type PostType = 'round_report' | 'seeking' | 'tip' | 'general' | 'announcement'

export interface Post {
  id: string
  authorId: string
  author: { id: string; displayName: string; avatarInitial: string | null; locationText: string | null }
  type: PostType
  body: string
  locationText: string | null
  photoUrl: string | null
  visibility: 'public' | 'community'
  isLfp: boolean
  lfpPlayersNeeded: number | null
  likesCount: number
  commentsCount: number
  createdAt: string
  communities: Array<{ communityId: string; community: { name: string } }>
  userHasLiked?: boolean
}

export interface Comment {
  id: string
  postId: string
  authorId: string
  author: { id: string; displayName: string; avatarInitial: string | null }
  text: string
  createdAt: string
}
