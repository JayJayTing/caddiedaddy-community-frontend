export type ThreadType = 'dm' | 'group'

export interface ChatThread {
  id: string
  type: ThreadType
  communityId: string | null
  name: string | null
  lastMessageAt: string | null
  createdAt: string
  participants: ThreadParticipant[]
  lastMessage?: Message | null
}

export interface ThreadParticipant {
  threadId: string
  userId: string
  user?: { id: string; displayName: string; avatarInitial: string | null }
  lastReadAt: string | null
  isMuted: boolean
}

export interface Message {
  id: string
  threadId: string
  senderId: string
  sender?: { id: string; displayName: string; avatarInitial: string | null }
  text: string
  createdAt: string
  editedAt: string | null
}
