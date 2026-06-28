'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { api } from '@/lib/api'
import { useAuth } from './AuthContext'
import { AppNotification } from '@/types/notification'

interface NotificationsContextType {
  notifications: AppNotification[]
  unreadCount: number
  refresh: () => Promise<void>
  markAllRead: () => Promise<void>
  markRead: (id: string) => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined)

const POLL_MS = 25000

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const r = await api.get<{ data: AppNotification[]; unreadCount: number }>('/notifications')
      setNotifications(r.data ?? [])
      setUnreadCount(r.unreadCount ?? 0)
    } catch { /* keep last-known */ }
  }, [])

  // Poll for new notifications while logged in; clear everything on logout.
  useEffect(() => {
    if (!user) { setNotifications([]); setUnreadCount(0); return }
    refresh()
    const id = setInterval(refresh, POLL_MS)
    return () => clearInterval(id)
  }, [user, refresh])

  const markAllRead = useCallback(async () => {
    setUnreadCount(0)
    setNotifications(ns => ns.map(n => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })))
    try { await api.post('/notifications/read-all') } catch { refresh() }
  }, [refresh])

  const markRead = useCallback(async (id: string) => {
    setNotifications(ns => ns.map(n => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n)))
    setUnreadCount(c => Math.max(0, c - 1))
    try { await api.patch(`/notifications/${id}/read`) } catch { /* will reconcile on next poll */ }
  }, [])

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, refresh, markAllRead, markRead }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}
