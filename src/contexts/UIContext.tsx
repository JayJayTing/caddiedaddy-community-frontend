'use client'
import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react'

export type Screen = 'home' | 'rounds' | 'community' | 'chat' | 'profile' | 'host'
export type Overlay = 'roundDetail' | 'manageRound' | 'postDetail' | 'createCommunity' | 'communityDetail' | 'chatThread' | 'findPlayers' | 'map' | 'bookVenue' | 'myBookings' | null
export type Sheet = 'compose' | 'account' | 'handicap' | 'notifications' | 'newsDetail' | 'wallet' | null

export interface SuccessInfo { title: string; subtitle?: string }
export type ToastVariant = 'error' | 'info'
export interface ToastInfo { id: number; message: string; variant: ToastVariant }

interface UIContextType {
  activeScreen: Screen
  setActiveScreen: (s: Screen) => void
  // When hosting from inside a community, the round is pre-targeted to it.
  hostCommunity: { id: string; name: string } | null
  setHostCommunity: (c: { id: string; name: string } | null) => void
  openOverlay: Overlay
  openOverlayWith: (o: Overlay, data?: unknown) => void
  closeOverlay: () => void
  openSheet: Sheet
  openSheetWith: (s: Sheet, data?: unknown) => void
  closeSheet: () => void
  overlayData: unknown
  sheetData: unknown
  backdropActive: boolean
  // Keyed refresh signal: a mutation calls refreshData('rounds') to invalidate a list;
  // list screens include dataVersion[key] in their fetch effect deps to re-pull.
  dataVersion: Record<string, number>
  refreshData: (key: string) => void
  // Global success confirmation (animated checkmark) shown via showSuccess().
  success: SuccessInfo | null
  showSuccess: (title: string, subtitle?: string) => void
  hideSuccess: () => void
  // Global transient message (esp. failures). showError() is the shorthand that
  // replaces the app's previously-silent catch blocks.
  toast: ToastInfo | null
  showToast: (message: string, variant?: ToastVariant) => void
  showError: (message: string) => void
  hideToast: () => void
}

const UIContext = createContext<UIContextType | undefined>(undefined)

export function UIProvider({ children }: { children: ReactNode }) {
  const [activeScreen, setActiveScreenState] = useState<Screen>('home')
  const [hostCommunity, setHostCommunity] = useState<{ id: string; name: string } | null>(null)
  const [openOverlay, setOpenOverlay] = useState<Overlay>(null)

  // Restore the last screen after a reload (e.g. mobile pull-to-refresh) so the
  // user stays put instead of being bounced to Home. Client-only, so no SSR
  // hydration mismatch.
  useEffect(() => {
    const saved = sessionStorage.getItem('caddie_screen') as Screen | null
    if (saved) setActiveScreenState(saved)
  }, [])

  const setActiveScreen = useCallback((s: Screen) => {
    setActiveScreenState(s)
    try { sessionStorage.setItem('caddie_screen', s) } catch { /* private mode */ }
  }, [])
  const [overlayData, setOverlayData] = useState<unknown>(null)
  const [openSheet, setOpenSheet] = useState<Sheet>(null)
  const [sheetData, setSheetData] = useState<unknown>(null)
  const [dataVersion, setDataVersion] = useState<Record<string, number>>({})
  const [success, setSuccess] = useState<SuccessInfo | null>(null)
  const [toast, setToast] = useState<ToastInfo | null>(null)
  const toastSeq = useRef(0)

  const backdropActive = openSheet !== null || openOverlay !== null

  const openOverlayWith = useCallback((o: Overlay, data?: unknown) => {
    setOverlayData(data ?? null)
    setOpenOverlay(o)
  }, [])

  const closeOverlay = useCallback(() => {
    setOpenOverlay(null)
    setOverlayData(null)
  }, [])

  const openSheetWith = useCallback((s: Sheet, data?: unknown) => {
    setSheetData(data ?? null)
    setOpenSheet(s)
  }, [])
  const closeSheet = useCallback(() => {
    setOpenSheet(null)
    setSheetData(null)
  }, [])

  const refreshData = useCallback((key: string) =>
    setDataVersion(v => ({ ...v, [key]: (v[key] ?? 0) + 1 })), [])

  const showSuccess = useCallback((title: string, subtitle?: string) =>
    setSuccess({ title, subtitle }), [])
  const hideSuccess = useCallback(() => setSuccess(null), [])

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') =>
    setToast({ id: (toastSeq.current += 1), message, variant }), [])
  const showError = useCallback((message: string) =>
    setToast({ id: (toastSeq.current += 1), message, variant: 'error' }), [])
  const hideToast = useCallback(() => setToast(null), [])

  return (
    <UIContext.Provider value={{ activeScreen, setActiveScreen, hostCommunity, setHostCommunity, openOverlay, openOverlayWith, closeOverlay, openSheet, openSheetWith, closeSheet, overlayData, sheetData, backdropActive, dataVersion, refreshData, success, showSuccess, hideSuccess, toast, showToast, showError, hideToast }}>
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within UIProvider')
  return ctx
}
