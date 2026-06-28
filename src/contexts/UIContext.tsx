'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export type Screen = 'home' | 'rounds' | 'community' | 'chat' | 'profile' | 'host'
export type Overlay = 'roundDetail' | 'manageRound' | 'postDetail' | 'createCommunity' | 'map' | null
export type Sheet = 'compose' | 'account' | 'handicap' | 'notifications' | 'newsDetail' | null

interface UIContextType {
  activeScreen: Screen
  setActiveScreen: (s: Screen) => void
  openOverlay: Overlay
  openOverlayWith: (o: Overlay, data?: unknown) => void
  closeOverlay: () => void
  openSheet: Sheet
  openSheetWith: (s: Sheet) => void
  closeSheet: () => void
  overlayData: unknown
  backdropActive: boolean
}

const UIContext = createContext<UIContextType | undefined>(undefined)

export function UIProvider({ children }: { children: ReactNode }) {
  const [activeScreen, setActiveScreen] = useState<Screen>('home')
  const [openOverlay, setOpenOverlay] = useState<Overlay>(null)
  const [overlayData, setOverlayData] = useState<unknown>(null)
  const [openSheet, setOpenSheet] = useState<Sheet>(null)

  const backdropActive = openSheet !== null || openOverlay !== null

  const openOverlayWith = useCallback((o: Overlay, data?: unknown) => {
    setOverlayData(data ?? null)
    setOpenOverlay(o)
  }, [])

  const closeOverlay = useCallback(() => {
    setOpenOverlay(null)
    setOverlayData(null)
  }, [])

  const openSheetWith = useCallback((s: Sheet) => setOpenSheet(s), [])
  const closeSheet = useCallback(() => setOpenSheet(null), [])

  return (
    <UIContext.Provider value={{ activeScreen, setActiveScreen, openOverlay, openOverlayWith, closeOverlay, openSheet, openSheetWith, closeSheet, overlayData, backdropActive }}>
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within UIProvider')
  return ctx
}
