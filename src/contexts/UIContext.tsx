'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export type Screen = 'home' | 'rounds' | 'community' | 'chat' | 'profile' | 'host'
export type Overlay = 'roundDetail' | 'manageRound' | 'postDetail' | 'createCommunity' | 'communityDetail' | 'chatThread' | 'map' | null
export type Sheet = 'compose' | 'account' | 'handicap' | 'notifications' | 'newsDetail' | null

export interface SuccessInfo { title: string; subtitle?: string }

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
  // Keyed refresh signal: a mutation calls refreshData('rounds') to invalidate a list;
  // list screens include dataVersion[key] in their fetch effect deps to re-pull.
  dataVersion: Record<string, number>
  refreshData: (key: string) => void
  // Global success confirmation (animated checkmark) shown via showSuccess().
  success: SuccessInfo | null
  showSuccess: (title: string, subtitle?: string) => void
  hideSuccess: () => void
}

const UIContext = createContext<UIContextType | undefined>(undefined)

export function UIProvider({ children }: { children: ReactNode }) {
  const [activeScreen, setActiveScreen] = useState<Screen>('home')
  const [openOverlay, setOpenOverlay] = useState<Overlay>(null)
  const [overlayData, setOverlayData] = useState<unknown>(null)
  const [openSheet, setOpenSheet] = useState<Sheet>(null)
  const [dataVersion, setDataVersion] = useState<Record<string, number>>({})
  const [success, setSuccess] = useState<SuccessInfo | null>(null)

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

  const refreshData = useCallback((key: string) =>
    setDataVersion(v => ({ ...v, [key]: (v[key] ?? 0) + 1 })), [])

  const showSuccess = useCallback((title: string, subtitle?: string) =>
    setSuccess({ title, subtitle }), [])
  const hideSuccess = useCallback(() => setSuccess(null), [])

  return (
    <UIContext.Provider value={{ activeScreen, setActiveScreen, openOverlay, openOverlayWith, closeOverlay, openSheet, openSheetWith, closeSheet, overlayData, backdropActive, dataVersion, refreshData, success, showSuccess, hideSuccess }}>
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within UIProvider')
  return ctx
}
