import { useEffect, useState } from 'react'

// True only after the first client-side mount. Use to gate content that differs
// between server and client (time-of-day, localStorage) so it doesn't cause a
// React hydration mismatch.
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}
