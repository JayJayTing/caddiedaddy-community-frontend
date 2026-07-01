import { Avatar } from 'caddiedaddy-community-frontend'

// Colored initial circle (deterministic colour from `seed`) or a photo when
// `url` is set. Used for players, hosts, and message threads across the app.
export function Initials() {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Avatar name="Mike Chen" seed="mike" size={44} />
      <Avatar name="Alex Johnson" seed="alex" size={44} />
      <Avatar name="Sara Lee" seed="sara-lee" size={44} />
      <Avatar name="Yuki Tan" seed="yuki" size={44} />
    </div>
  )
}

export function Sizes() {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Avatar name="Mike Chen" seed="mike" size={24} />
      <Avatar name="Mike Chen" seed="mike" size={36} />
      <Avatar name="Mike Chen" seed="mike" size={48} />
      <Avatar name="Mike Chen" seed="mike" size={64} />
    </div>
  )
}

// The overlapping cluster used on round cards to show who's playing.
export function Stack() {
  return (
    <div style={{ display: 'flex' }}>
      {['mike', 'alex', 'sara', 'yuki'].map((s, i) => (
        <Avatar key={s} name={s} seed={s} size={34} style={{ border: '2px solid var(--surface)', marginLeft: i === 0 ? 0 : -10 }} />
      ))}
    </div>
  )
}
