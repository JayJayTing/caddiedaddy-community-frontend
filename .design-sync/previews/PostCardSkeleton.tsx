import { PostCardSkeleton } from 'caddiedaddy-community-frontend'

// Loading placeholder shaped like a community post (author row + body lines).
export function Default() {
  return (
    <div style={{ width: 360 }}>
      <PostCardSkeleton />
    </div>
  )
}
