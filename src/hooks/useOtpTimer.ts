'use client'
import { useState, useEffect, useRef } from 'react'

export function useOtpTimer(seconds = 42) {
  const [remaining, setRemaining] = useState(0)
  const [active, setActive] = useState(false)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)

  const start = () => {
    setRemaining(seconds)
    setActive(true)
  }

  useEffect(() => {
    if (!active) return
    ref.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(ref.current!)
          setActive(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(ref.current!)
  }, [active])

  const label = active ? `0:${String(remaining).padStart(2, '0')}` : ''

  return { remaining, active, label, start }
}
