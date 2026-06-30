import { CSSProperties } from 'react'

// Small rotating loading indicator for in-progress searches and busy actions.
// Decorative — paired with visible/spoken text where it matters; hidden from
// screen readers here. Respects prefers-reduced-motion via the global guard.
export function Spinner({
  size = 18, color, style,
}: { size?: number; color?: string; style?: CSSProperties }) {
  return (
    <span
      className="spinner"
      aria-hidden
      style={{ width: size, height: size, ...(color ? { borderTopColor: color } : {}), ...style }}
    />
  )
}
