'use client'
import { useState, useEffect } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useLang } from '@/contexts/LanguageContext'
import { useNotifications } from '@/contexts/NotificationsContext'
import { api } from '@/lib/api'
import { AppNotification, NotificationType } from '@/types/notification'
import { timeAgo } from '@/lib/utils'
import { BottomSheet } from './BottomSheet'
import { Pressable } from '@/components/ui/Pressable'

const ICON: Record<NotificationType, { emoji: string; bg: string }> = {
  round_request:   { emoji: '🏌️', bg: 'var(--primary-soft)' },
  round_accepted:  { emoji: '✅', bg: '#E8F5E9' },
  round_reminder:  { emoji: '⏰', bg: 'var(--butter)' },
  post_comment:    { emoji: '💬', bg: 'var(--sky)' },
  post_like:       { emoji: '❤️', bg: 'var(--rose)' },
  new_message:     { emoji: '✉️', bg: 'var(--lilac)' },
  community_invite:{ emoji: '👥', bg: 'var(--sage)' },
}

type Prefs = { roundsNearby: boolean; communityActivity: boolean; roundReminders: boolean; newMessages: boolean }

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <Pressable role="switch" aria-checked={on} aria-label={label} onClick={onClick} style={{ width: 46, height: 26, borderRadius: 13, background: on ? 'var(--primary)' : 'var(--line)', cursor: 'pointer', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,.2)', transition: 'left .2s' }} />
    </Pressable>
  )
}

export function NotificationsSheet() {
  const { openSheet, closeSheet, openOverlayWith, setActiveScreen } = useUI()
  const { t } = useLang()
  const { notifications, unreadCount, refresh, markAllRead, markRead } = useNotifications()
  const isOpen = openSheet === 'notifications'

  const [view, setView] = useState<'feed' | 'prefs'>('feed')
  const [prefs, setPrefs] = useState<Prefs | null>(null)

  useEffect(() => {
    if (isOpen) { setView('feed'); refresh() }
  }, [isOpen, refresh])

  useEffect(() => {
    if (view !== 'prefs') return
    api.get<{ data: Prefs }>('/notifications/prefs').then(r => setPrefs(r.data)).catch(() => {})
  }, [view])

  const savePref = (key: keyof Prefs, value: boolean) => {
    setPrefs(p => (p ? { ...p, [key]: value } : p))
    api.put('/notifications/prefs', { [key]: value }).catch(() => {})
  }

  const handleTap = async (n: AppNotification) => {
    markRead(n.id)
    if (!n.targetType || !n.targetId) return
    try {
      if (n.targetType === 'round') {
        const { data } = await api.get<{ data: unknown }>(`/rounds/${n.targetId}`)
        closeSheet()
        openOverlayWith(n.type === 'round_request' ? 'manageRound' : 'roundDetail', data)
      } else if (n.targetType === 'post') {
        const { data } = await api.get<{ data: unknown }>(`/posts/${n.targetId}`)
        closeSheet()
        openOverlayWith('postDetail', data)
      } else if (n.targetType === 'community') {
        const { data } = await api.get<{ data: unknown }>(`/communities/${n.targetId}`)
        closeSheet()
        openOverlayWith('communityDetail', data)
      } else if (n.targetType === 'thread') {
        closeSheet()
        setActiveScreen('chat')
      }
    } catch { /* target may have been removed */ }
  }

  const title = view === 'prefs' ? t('sheet.notif.settings') : t('sheet.notifications.title')

  return (
    <BottomSheet isOpen={isOpen} onClose={closeSheet} title={title}>
      {view === 'feed' ? (
        <div style={{ padding: '4px 0 24px' }}>
          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px 8px' }}>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{unreadCount > 0 ? `${unreadCount} ${t('sheet.notif.unreadSuffix')}` : t('sheet.notif.allCaughtUp')}</span>
            {unreadCount > 0 && (
              <Pressable className="link" onClick={() => markAllRead()} style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', cursor: 'pointer' }}>{t('sheet.notif.markAllRead')}</Pressable>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 24px' }}>
              <div style={{ fontSize: 34, marginBottom: 10 }}>🔔</div>
              <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>{t('sheet.notif.empty')}</div>
            </div>
          ) : (
            <div>
              {notifications.map(n => {
                const icon = ICON[n.type] ?? { emoji: '🔔', bg: 'var(--bg-alt)' }
                const unread = !n.readAt
                const tappable = !!n.targetType && !!n.targetId
                return (
                  <Pressable
                    key={n.id}
                    onClick={() => handleTap(n)}
                    style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 20px', cursor: tappable ? 'pointer' : 'default', background: unread ? 'var(--primary-soft)' : 'transparent', borderBottom: '1px solid var(--line-soft)' }}
                  >
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: icon.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{icon.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: unread ? 700 : 600, color: 'var(--ink)', lineHeight: 1.35 }}>{n.body}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>{timeAgo(n.createdAt)}</div>
                    </div>
                    {unread && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', marginTop: 6, flexShrink: 0 }} />}
                  </Pressable>
                )
              })}
            </div>
          )}

          {/* Settings link */}
          <Pressable onClick={() => setView('prefs')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px 0', cursor: 'pointer', color: 'var(--ink-3)' }}>
            <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{t('sheet.notif.settingsLabel')}</span>
          </Pressable>
        </div>
      ) : (
        <div style={{ padding: '8px 20px 28px' }}>
          <Pressable onClick={() => setView('feed')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0 8px', cursor: 'pointer', color: 'var(--primary)' }}>
            <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{t('common.back')}</span>
          </Pressable>
          {([
            ['roundsNearby', t('sheet.notifications.roundsNearby'), t('sheet.notif.roundsNearbyDesc')],
            ['communityActivity', t('sheet.notifications.communityActivity'), t('sheet.notif.communityActivityDesc')],
            ['roundReminders', t('sheet.notifications.roundReminders'), t('sheet.notif.roundRemindersDesc')],
            ['newMessages', t('sheet.notifications.newMessages'), t('sheet.notif.newMessagesDesc')],
          ] as Array<[keyof Prefs, string, string]>).map(([key, label, sub]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--line-soft)' }}>
              <div style={{ paddingRight: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{sub}</div>
              </div>
              <Toggle on={prefs ? prefs[key] : true} onClick={() => prefs && savePref(key, !prefs[key])} label={label} />
            </div>
          ))}
        </div>
      )}
    </BottomSheet>
  )
}
