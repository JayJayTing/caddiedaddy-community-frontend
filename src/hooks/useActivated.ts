'use client'
import { useState, useEffect } from 'react'
import { useUI, Screen } from '@/contexts/UIContext'

// All six screens are always mounted (visibility is CSS), so without this they
// would each fire their data fetches at boot — a request storm. useActivated
// returns false until the screen has been shown at least once, then stays true.
// Gate fetch effects on `activated && user` so a screen loads lazily on first
// visit (and never when logged out).
export function useActivated(screen: Screen): boolean {
  const { activeScreen } = useUI()
  const [activated, setActivated] = useState(screen === 'home') // home is the default screen
  useEffect(() => {
    if (activeScreen === screen) setActivated(true)
  }, [activeScreen, screen])
  return activated
}
