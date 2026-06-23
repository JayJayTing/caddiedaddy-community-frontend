'use client'
import { useState } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useLang } from '@/contexts/LanguageContext'
import { BottomSheet } from './BottomSheet'

interface ToggleRowProps {
  label: string
  sublabel: string
  value: boolean
  onChange: (v: boolean) => void
}

function ToggleRow({ label, sublabel, value, onChange }: ToggleRowProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--line-soft)' }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{sublabel}</div>
      </div>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: 46, height: 26, borderRadius: 13,
          background: value ? 'var(--primary)' : 'var(--line)',
          cursor: 'pointer', position: 'relative', transition: 'background .2s', flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 3, left: value ? 23 : 3,
          width: 20, height: 20, borderRadius: '50%',
          background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,.2)',
          transition: 'left .2s',
        }} />
      </div>
    </div>
  )
}

export function NotificationsSheet() {
  const { openSheet, closeSheet } = useUI()
  const { t } = useLang()
  const isOpen = openSheet === 'notifications'

  const [roundsNearby, setRoundsNearby] = useState(true)
  const [communityActivity, setCommunityActivity] = useState(true)
  const [roundReminders, setRoundReminders] = useState(true)
  const [newMessages, setNewMessages] = useState(true)

  return (
    <BottomSheet isOpen={isOpen} onClose={closeSheet} title={t('sheet.notifications.title')}>
      <div style={{ padding: '8px 20px 28px' }}>
        <ToggleRow
          label={t('sheet.notifications.roundsNearby')}
          sublabel="Get notified when new rounds open near you"
          value={roundsNearby}
          onChange={setRoundsNearby}
        />
        <ToggleRow
          label={t('sheet.notifications.communityActivity')}
          sublabel="New posts and activity in your communities"
          value={communityActivity}
          onChange={setCommunityActivity}
        />
        <ToggleRow
          label={t('sheet.notifications.roundReminders')}
          sublabel="Reminders before your upcoming rounds"
          value={roundReminders}
          onChange={setRoundReminders}
        />
        <ToggleRow
          label={t('sheet.notifications.newMessages')}
          sublabel="New messages from players and communities"
          value={newMessages}
          onChange={setNewMessages}
        />

        <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--primary-soft)', borderRadius: 'var(--r-md)' }}>
          <div style={{ fontSize: 12, color: 'var(--primary-ink)', lineHeight: 1.5 }}>
            Notification preferences are saved locally. Backend integration coming soon.
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}
