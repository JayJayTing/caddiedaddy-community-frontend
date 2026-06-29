'use client'
import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useUI } from '@/contexts/UIContext'
import { PhoneFrame } from '@/components/layout/PhoneFrame'
import { BottomNav } from '@/components/layout/BottomNav'
import { AuthOverlay } from '@/components/auth/AuthOverlay'
import { HomeScreen } from '@/components/screens/HomeScreen'
import { RoundsScreen } from '@/components/screens/RoundsScreen'
import { CommunityScreen } from '@/components/screens/CommunityScreen'
import { ChatScreen } from '@/components/screens/ChatScreen'
import { ProfileScreen } from '@/components/screens/ProfileScreen'
import { HostScreen } from '@/components/screens/HostScreen'
import { RoundDetailOverlay } from '@/components/overlays/RoundDetailOverlay'
import { ManageRoundOverlay } from '@/components/overlays/ManageRoundOverlay'
import { ChatThreadOverlay } from '@/components/overlays/ChatThreadOverlay'
import { PostDetailOverlay } from '@/components/overlays/PostDetailOverlay'
import { CreateCommunityOverlay } from '@/components/overlays/CreateCommunityOverlay'
import { CommunityDetailOverlay } from '@/components/overlays/CommunityDetailOverlay'
import { BookVenueOverlay } from '@/components/overlays/BookVenueOverlay'
import { MyBookingsOverlay } from '@/components/overlays/MyBookingsOverlay'
import { FindPlayersOverlay } from '@/components/overlays/FindPlayersOverlay'
import { MapOverlay } from '@/components/overlays/MapOverlay'
import { TeeTimesOverlay } from '@/components/overlays/TeeTimesOverlay'
import { SuccessOverlay } from '@/components/overlays/SuccessOverlay'
import { Toaster } from '@/components/ui/Toaster'
import { ComposeSheet } from '@/components/sheets/ComposeSheet'
import { PlaySheet } from '@/components/sheets/PlaySheet'
import { AccountSheet } from '@/components/sheets/AccountSheet'
import { HandicapSheet } from '@/components/sheets/HandicapSheet'
import { NotificationsSheet } from '@/components/sheets/NotificationsSheet'
import { NewsDetailSheet } from '@/components/sheets/NewsDetailSheet'
import { WalletSheet } from '@/components/sheets/WalletSheet'

export default function AppLayout({ children: _children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const { backdropActive, closeSheet, closeOverlay, openOverlay, openSheet } = useUI()

  // Esc closes the topmost layer (sheet before overlay) — keyboard parity with the
  // backdrop tap. Previously there was no keyboard way to dismiss either.
  useEffect(() => {
    if (!openSheet && !openOverlay) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (openSheet) closeSheet()
      else if (openOverlay) closeOverlay()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openSheet, openOverlay, closeSheet, closeOverlay])

  return (
    <PhoneFrame>
      <div className="screens">
        <HomeScreen />
        <RoundsScreen />
        <CommunityScreen />
        <ChatScreen />
        <ProfileScreen />
        <HostScreen />
      </div>

      {/* Overlays */}
      <RoundDetailOverlay />
      <ManageRoundOverlay />
      <ChatThreadOverlay />
      <PostDetailOverlay />
      <CreateCommunityOverlay />
      <CommunityDetailOverlay />
      <BookVenueOverlay />
      <MyBookingsOverlay />
      <FindPlayersOverlay />
      <MapOverlay />
      <TeeTimesOverlay />

      {/* Global success confirmation (animated checkmark) */}
      <SuccessOverlay />

      {/* Global transient toast (failures + info) */}
      <Toaster />

      {/* Bottom Sheets */}
      <ComposeSheet />
      <PlaySheet />
      <AccountSheet />
      <HandicapSheet />
      <NotificationsSheet />
      <NewsDetailSheet />
      <WalletSheet />

      {/* Backdrop */}
      <div
        id="backdrop"
        className={backdropActive ? 'active' : ''}
        onClick={() => { closeSheet(); closeOverlay() }}
        style={{ zIndex: (openOverlay || openSheet) ? 55 : -1 }}
      />

      <BottomNav />

      {(!isLoading && !user) && <AuthOverlay onComplete={() => {}} />}
    </PhoneFrame>
  )
}
