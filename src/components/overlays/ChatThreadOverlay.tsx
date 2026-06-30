'use client'
import { useEffect, useRef, useState } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LanguageContext'
import { api } from '@/lib/api'
import { ChatThread, Message } from '@/types/chat'
import { Avatar } from '@/components/ui/Avatar'
import { Pressable } from '@/components/ui/Pressable'
import { Spinner } from '@/components/ui/Spinner'
import { formatTime } from '@/lib/utils'
import { getRealtime } from '@/lib/supabaseRealtime'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function ChatThreadOverlay() {
  const { openOverlay, closeOverlay, overlayData, showError } = useUI()
  const { user } = useAuth()
  const { t } = useLang()

  const thread = overlayData as ChatThread | null
  const isOpen = openOverlay === 'chatThread' && thread != null

  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Load history + mark read on open. Live updates come from a Supabase Realtime
  // broadcast subscription (instant); a slow poll is kept as a safety net (and the
  // sole mechanism if Realtime env isn't configured).
  useEffect(() => {
    if (!isOpen || !thread) return
    setMessages([]) // clear the previous thread's messages so they don't flash under this one
    setLoadingMsgs(true)
    let stale = false
    const load = () =>
      api.get<{ data: Message[] }>(`/threads/${thread.id}/messages`)
        .then(({ data }) => { if (!stale) setMessages((data ?? []).slice().reverse()) }) // API returns newest-first
        .catch(() => {})
    // Only the first load drives the spinner; the poll silently refreshes.
    load().finally(() => { if (!stale) setLoadingMsgs(false) })
    api.patch(`/threads/${thread.id}/read`).catch(() => {})

    const sb = getRealtime()
    let channel: RealtimeChannel | null = null
    if (sb) {
      channel = sb.channel(`thread-${thread.id}`, { config: { broadcast: { self: false } } })
      channel.on('broadcast', { event: 'message' }, ({ payload }) => {
        const msg = payload as Message
        setMessages(ms => (ms.some(m => m.id === msg.id) ? ms : [...ms, msg]))
      }).subscribe()
      channelRef.current = channel
    }

    const poll = setInterval(load, sb ? 10000 : 2000)
    return () => {
      stale = true
      clearInterval(poll)
      if (sb && channel) sb.removeChannel(channel)
      channelRef.current = null
    }
  }, [isOpen, thread?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep scrolled to the newest message.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, isOpen])

  if (!isOpen || !thread) return null

  const other = thread.participants.find(p => p.userId !== user?.id)
  const title = thread.type === 'group' ? (thread.name ?? t('chat.groupChat')) : (other?.user?.displayName ?? thread.name ?? t('chat.title'))
  const avatarSeed = thread.type === 'group' ? thread.id : (other?.userId ?? thread.id)
  const avatarUrl = thread.type === 'group' ? null : (other?.user?.avatarUrl ?? null)
  const subtitle = thread.type === 'group' ? `${thread.participants.length} ${t('community.members')}` : ''

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    try {
      const { data } = await api.post<{ data: Message }>(`/threads/${thread.id}/messages`, { text })
      setMessages(ms => (ms.some(m => m.id === data.id) ? ms : [...ms, data]))
      channelRef.current?.send({ type: 'broadcast', event: 'message', payload: data })
    } catch {
      setInput(text) // restore on failure so the user can retry
      showError(t('error.sendMessage'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={`detail-overlay${isOpen ? ' open' : ''}`}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px 12px', flexShrink: 0, borderBottom: '1px solid var(--line-soft)' }}>
        <Pressable style={{ width: 34, height: 34, background: 'var(--bg-alt)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }} onClick={closeOverlay} aria-label={t('a11y.back')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="15 18 9 12 15 6" /></svg>
        </Pressable>
        <Avatar name={title} url={avatarUrl} seed={avatarSeed} size={38} fontSize={14} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{subtitle}</div>}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="scroll-body" style={{ padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loadingMsgs ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}><Spinner size={22} /></div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, marginTop: 40 }}>{t('chat.threadNoMessages')}</div>
        ) : messages.map((m, i) => {
          const own = m.senderId === user?.id
          const showSender = thread.type === 'group' && !own && (i === 0 || messages[i - 1].senderId !== m.senderId)
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: own ? 'flex-end' : 'flex-start' }}>
              {showSender && <div style={{ fontSize: 11, color: 'var(--ink-3)', margin: '2px 0 2px 10px' }}>{m.sender?.displayName}</div>}
              <div style={{
                maxWidth: '76%', padding: '9px 13px', fontSize: 14, lineHeight: 1.4,
                background: own ? 'var(--primary)' : 'var(--surface)',
                color: own ? 'white' : 'var(--ink)',
                borderRadius: 16,
                borderBottomRightRadius: own ? 5 : 16,
                borderBottomLeftRadius: own ? 16 : 5,
                boxShadow: own ? '0 1px 6px rgba(92,122,154,.25)' : 'var(--shadow-sm)',
                wordBreak: 'break-word',
              }}>
                {m.text}
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink-3)', margin: '2px 6px 0' }}>{formatTime(m.createdAt)}</div>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, padding: '10px 14px 18px', borderTop: '1px solid var(--line-soft)', display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={t('chat.messagePlaceholder')}
          rows={1}
          style={{ flex: 1, resize: 'none', maxHeight: 100, padding: '10px 14px', border: '1.5px solid var(--line)', borderRadius: 20, fontSize: 14, fontFamily: 'var(--sans)', background: 'var(--surface)', color: 'var(--ink)', outline: 'none' }}
        />
        <Pressable aria-label={t('a11y.send')} onClick={send} style={{ width: 40, height: 40, borderRadius: '50%', background: input.trim() ? 'var(--primary)' : 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() ? 'pointer' : 'default', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? 'white' : 'var(--ink-3)'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
        </Pressable>
      </div>
    </div>
  )
}
