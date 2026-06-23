'use client'
import { useState, useEffect } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useLang } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { ChatThread } from '@/types/chat'
import { avatarColor, getInitial, timeAgo } from '@/lib/utils'

type ChatTab = 'friends' | 'communities'

function ThreadRow({ thread, currentUserId }: { thread: ChatThread; currentUserId: string }) {
  const otherParticipant = thread.participants.find(p => p.userId !== currentUserId)
  const name = thread.name ?? otherParticipant?.user?.displayName ?? 'Unknown'
  const initial = getInitial(name)
  const color = avatarColor(otherParticipant?.userId ?? thread.id)
  const unread = thread.lastMessage && !thread.participants.find(p => p.userId === currentUserId)?.lastReadAt

  return (
    <div className="mod-row">
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div className="avatar" style={{ width: 44, height: 44, fontSize: 16, background: color }}>
          {initial}
        </div>
        {/* Online dot (visual) */}
        <div style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: '#4CAF50', border: '2px solid var(--bg)' }} />
      </div>
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
            {thread.lastMessage ? thread.lastMessage.text : 'No messages yet'}
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
  const { activeScreen } = useUI()
  const { t } = useLang()
  const { user } = useAuth()
  const [tab, setTab] = useState<ChatTab>('friends')
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ threads: ChatThread[] }>('/threads')
      .then(r => setThreads(r.threads ?? []))
      .catch(() => setThreads([]))
      .finally(() => setLoading(false))
  }, [])

  const dmThreads = threads.filter(t2 => t2.type === 'dm')
  const groupThreads = threads.filter(t2 => t2.type === 'group')

  return (
    <div className={`screen${activeScreen === 'chat' ? ' active' : ''}`}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 0', flexShrink: 0 }}>
        <div className="serif" style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)' }}>{t('chat.title')}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ width: 36, height: 36, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <div style={{ width: 36, height: 36, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
        </div>
      </div>

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
              <div style={{ background: 'var(--primary)', borderRadius: 'var(--r-md)', padding: '11px 24px', display: 'inline-block', cursor: 'pointer' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{t('chat.findPlayers')}</span>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>
              {dmThreads.map(thread => (
                <ThreadRow key={thread.id} thread={thread} currentUserId={user?.id ?? ''} />
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
                <ThreadRow key={thread.id} thread={thread} currentUserId={user?.id ?? ''} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
