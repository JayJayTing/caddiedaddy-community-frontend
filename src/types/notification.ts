export type NotificationType =
  | 'round_request'
  | 'round_accepted'
  | 'community_invite'
  | 'new_message'
  | 'post_like'
  | 'post_comment'
  | 'round_reminder'

export type NotificationTargetType = 'round' | 'community' | 'post' | 'thread'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  targetType: NotificationTargetType | null
  targetId: string | null
  readAt: string | null
  createdAt: string
}
