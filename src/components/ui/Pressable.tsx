'use client'
import { ButtonHTMLAttributes, forwardRef } from 'react'

// A real, accessible <button> styled to drop in wherever the app used a
// `<div onClick>`. Keyboard-focusable, Enter/Space-activatable, and announced
// by screen readers — none of which the old divs were. Defaults to
// type="button" so it never accidentally submits a form. Accepts every native
// button attribute (style, aria-*, data-*, disabled, title, …).
type PressableProps = ButtonHTMLAttributes<HTMLButtonElement>

export const Pressable = forwardRef<HTMLButtonElement, PressableProps>(
  function Pressable({ className, type, children, ...props }, ref) {
    return (
      <button ref={ref} type={type ?? 'button'} className={`pressable${className ? ' ' + className : ''}`} {...props}>
        {children}
      </button>
    )
  },
)
