import { CSSProperties } from 'react'
import { avatarColor, getInitial } from '@/lib/utils'

// Renders a user's photo when `url` is set, otherwise the colored initial circle.
// Mirrors the existing `.avatar` pattern (flex-centered) used across the app.
export function Avatar({
  name,
  url,
  seed,
  size = 40,
  fontSize,
  style,
  className,
}: {
  name?: string | null
  url?: string | null
  seed?: string | null
  size?: number
  fontSize?: number
  style?: CSSProperties
  className?: string
}) {
  const base: CSSProperties = { width: size, height: size, flexShrink: 0, ...style }

  if (url) {
    return (
      <div
        className={`avatar${className ? ' ' + className : ''}`}
        style={{ ...base, backgroundImage: `url("${url.replace(/"/g, '%22')}")`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
        role="img"
        aria-label={name ?? 'avatar'}
      />
    )
  }

  return (
    <div
      className={`avatar${className ? ' ' + className : ''}`}
      style={{ ...base, fontSize: fontSize ?? Math.round(size * 0.4), background: avatarColor(seed ?? name) }}
    >
      {getInitial(name)}
    </div>
  )
}
