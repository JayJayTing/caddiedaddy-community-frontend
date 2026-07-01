'use client'
import { CSSProperties } from 'react'
import { avatarGradient, getInitial } from '@/lib/utils'
import { useLang } from '@/contexts/LanguageContext'

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
  onClick,
  title,
}: {
  name?: string | null
  url?: string | null
  seed?: string | null
  size?: number
  fontSize?: number
  style?: CSSProperties
  className?: string
  onClick?: () => void
  title?: string
}) {
  const { t } = useLang()
  const base: CSSProperties = { width: size, height: size, flexShrink: 0, ...(onClick ? { cursor: 'pointer' } : {}), ...style }
  const label = title ?? name ?? t('ui.avatar.alt')

  if (url) {
    return (
      <div
        className={`avatar${className ? ' ' + className : ''}`}
        style={{ ...base, backgroundImage: `url("${url.replace(/"/g, '%22')}")`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
        role="img"
        aria-label={label}
        title={title}
        onClick={onClick}
      />
    )
  }

  return (
    <div
      className={`avatar${className ? ' ' + className : ''}`}
      style={{ ...base, fontSize: fontSize ?? Math.round(size * 0.4), background: avatarGradient(seed ?? name) }}
      onClick={onClick}
      title={title}
      role="img"
      aria-label={label}
    >
      {getInitial(name)}
    </div>
  )
}
