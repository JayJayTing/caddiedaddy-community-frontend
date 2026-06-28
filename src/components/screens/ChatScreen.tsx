'use client'
import { useState, useEffect } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useLang } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { ChatThread } from '@/types/chat'
import { timeAgo } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'

type ChatTab = 'friends' | 'communities'

function ThreadRow({ thread, currentUserId, onOpen }: { thread: ChatThread; currentUserId: string; onOpen: () => void }) {
  const otherParticipant = thread.participants.find(p => p.userId !== currentUserId)
  const name = thread.type === 'group' ? (thread.name ?? 'Group chat') : (otherParticipant?.user?.displayName ?? thread.name ?? 'Unknown')
  const avatarSeed = thread.type === 'group' ? thread.id : (otherParticipant?.userId ?? thread.id)
  const avatarUrl = thread.type === 'group' ? null : (otherParticipant?.user?.avatarUrl ?? null)
  const lastMsg = thread.lastMessage ?? thread.messages?.[0] ?? null
  const myLastRead = thread.participants.find(p => p.userId === currentUserId)?.lastReadAt
  const unread = !!lastMsg && lastMsg.senderId !== currentUserId && (!myLastRead || new Date(myLastRead) < new Date(lastMsg.createdAt))

  return (
    <div className="mod-row" onClick={onOpen} style={{ cursor: 'pointer' }}>
      <Avatar name={name} url={avatarUrl} seed={avatarSeed} size={44} fontSize={16} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{name}</span>
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            {thread.lastMessageAt ? timeAgo(thread.lastMessageAt) : ''}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 12, color: 'var(--ink-3)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontWeight: unread ? 600 : 400,
          }}>
            {lastMsg ? lastMsg.text : 'No messages yet'}
          </span>
          {unread && (
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
          )}
        </div>
      </div>
    </div>
  )
}

export function ChatScreen() {
  const { activeScreen, openOverlayWith, setActiveScreen } = useUI()
  const { t } = useLang()
  const { user } = useAuth()
  const [tab, setTab] = useState<ChatTab>('friends')
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [loading, setLoading] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    api.get<{ data: ChatThread[] }>('/threads')
      .then(r => setThreads(r.data ?? []))
      .catch(() => setThreads([]))
      .finally(() => setLoading(false))
  }, [])

  const threadName = (th: ChatThread) => {
    const other = th.participants.find(p => p.userId !== (user?.id ?? ''))
    return th.type === 'group' ? (th.name ?? 'Group chat') : (other?.user?.displayName ?? th.name ?? '')
  }
  const matchesQuery = (th: ChatThread) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    const last = th.lastMessage?.text ?? th.messages?.[0]?.text ?? ''
    return threadName(th).toLowerCase().includes(q) || last.toLowerCase().includes(q)
  }

  const dmThreads = threads.filter(t2 => t2.type === 'dm' && matchesQuery(t2))
  const groupThreads = threads.filter(t2 => t2.type === 'group' && matchesQuery(t2))

  return (
    <div className={`screen${activeScreen === 'chat' ? ' active' : ''}`}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 0', flexShrink: 0 }}>
        <div className="serif" style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)' }}>{t('chat.title')}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div
            onClick={() => { setSearchOpen(o => { if (o) setQuery(''); return !o }) }}
            style={{ width: 36, height: 36, background: searchOpen ? 'var(--primary-soft)' : 'var(--surface)', border: '1px solid var(--line)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={searchOpen ? 'var(--primary)' : 'var(--ink-2)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <div
            onClick={() => setActiveScreen('community')}
            style={{ width: 36, height: 36, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Search */}
      {searchOpen && (
        <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('chat.searchPlaceholder')}
            style={{ width: '100%', padding: '10px 14px', fontSize: 14, color: 'var(--ink)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', outline: 'none' }}
          />
        </div>
      )}

      {/* Toggle tabs */}
      <div style={{ padding: '14px 20px 0', flexShrink: 0 }}>
        <div className="toggle-tabs">
          <div className={`toggle-tab${tab === 'friends' ? ' active' : ''}`} onClick={() => setTab('friends')}>
            {t('chat.tab.friends')}
          </div>
          <div className={`toggle-tab${tab === 'communities' ? ' active' : ''}`} onClick={() => setTab('communities')}>
            {t('chat.tab.communities')}
          </div>
        </div>
      </div>

      <div className="scroll-body">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><span style={{ color: 'var(--ink-3)', fontSize: 13 }}>Loading…</span></div>
        ) : tab === 'friends' ? (
          dmThreads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 24px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⛳️</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>{t('chat.findBuddies')}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 20 }}>{t('chat.findBuddiesSubtitle')}</div>
              <div onClick={() => setActiveScreen('rounds')} style={{ background: 'var(--primary)', borderRadius: 'var(--r-md)', padding: '11px 24px', display: 'inline-block', cursor: 'pointer' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{t('chat.findPlayers')}</span>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>
              {dmThreads.map(thread => (
                <ThreadRow key={thread.id} thread={thread} currentUserId={user?.id ?? ''} onOpen={() => openOverlayWith('chatThread', thread)} />
              ))}
            </div>
          )
        ) : (
          groupThreads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 24px' }}>
              <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>Join communities to see their channels here</div>
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>
              {groupThreads.map(thread => (
                <ThreadRow key={thread.id} thread={thread} currentUserId={user?.id ?? ''} onOpen={() => openOverlayWith('chatThread', thread)} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
