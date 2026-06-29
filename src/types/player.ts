export type Relation = 'none' | 'friends' | 'outgoing' | 'incoming'

export interface Player {
  id: string
  displayName: string
  avatarUrl: string | null
  avatarInitial: string | null
  locationText: string | null
  handicapIndex: number | null
  relation?: Relation
}
