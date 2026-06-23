'use client'
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
import { PostDetailOverlay } from '@/components/overlays/PostDetailOverlay'
import { CreateCommunityOverlay } from '@/components/overlays/CreateCommunityOverlay'
import { ComposeSheet } from '@/components/sheets/ComposeSheet'
import { AccountSheet } from '@/components/sheets/AccountSheet'
import { HandicapSheet } from '@/components/sheets/HandicapSheet'
import { NotificationsSheet } from '@/components/sheets/NotificationsSheet'

export default function AppLayout({ children: _children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const { backdropActive, closeSheet, closeOverlay, openOverlay, openSheet } = useUI()

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
      <PostDetailOverlay />
      <CreateCommunityOverlay />

      {/* Bottom Sheets */}
      <ComposeSheet />
      <AccountSheet />
      <HandicapSheet />
      <NotificationsSheet />

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
