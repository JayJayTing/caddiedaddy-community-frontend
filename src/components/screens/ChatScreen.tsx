'use client'
import { useState, useEffect } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useLang } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { ChatThread } from '@/types/chat'
import { Player } from '@/types/player'
import { timeAgo } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Pressable } from '@/components/ui/Pressable'
import { Skeleton } from '@/components/ui/Skeleton'
import { useActivated } from '@/hooks/useActivated'

type ChatTab = 'friends' | 'communities'

function ThreadRow({ thread, currentUserId, onOpen }: { thread: ChatThread; currentUserId: string; onOpen: () => void }) {
  const { t } = useLang()
  const otherParticipant = thread.participants.find(p => p.userId !== currentUserId)
  const name = thread.type === 'group' ? (thread.name ?? t('chat.groupChat')) : (otherParticipant?.user?.displayName ?? thread.name ?? t('chat.unknownThread'))
  const avatarSeed = thread.type === 'group' ? thread.id : (otherParticipant?.userId ?? thread.id)
  const avatarUrl = thread.type === 'group' ? null : (otherParticipant?.user?.avatarUrl ?? null)
  const lastMsg = thread.lastMessage ?? thread.messages?.[0] ?? null
  const myLastRead = thread.participants.find(p => p.userId === currentUserId)?.lastReadAt
  const unread = !!lastMsg && lastMsg.senderId !== currentUserId && (!myLastRead || new Date(myLastRead) < new Date(lastMsg.createdAt))

  return (
    <Pressable className="mod-row" onClick={onOpen} style={{ cursor: 'pointer' }}>
      <Avatar name={name} url={avatarUrl} seed={avatarSeed} size={44} fontSize={16} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>{name}</span>
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
            {lastMsg ? lastMsg.text : t('chat.noMessages')}
          </span>
          {unread && (
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
          )}
        </div>
      </div>
    </Pressable>
  )
}

export function ChatScreen() {
  const { activeScreen, setActiveScreen, openOverlayWith, dataVersion, refreshData, showError } = useUI()
  const { t } = useLang()
  const { user } = useAuth()
  const activated = useActivated('chat')
  const [tab, setTab] = useState<ChatTab>('friends')
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [loading, setLoading] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [requestCount, setRequestCount] = useState(0)
  // New-message (start a DM) picker.
  const [newMsgOpen, setNewMsgOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [friends, setFriends] = useState<Player[]>([])
  const [pickerResults, setPickerResults] = useState<Player[]>([])
  const [loadingPicker, setLoadingPicker] = useState(false)
  const [creatingDm, setCreatingDm] = useState(false)

  useEffect(() => {
    if (!user || !activated) return
    let alive = true
    api.get<{ data: ChatThread[] }>('/threads')
      .then(r => { if (alive) setThreads(r.data ?? []) })
      .catch(() => { if (alive) setThreads([]) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [user, activated, dataVersion.threads])

  // Incoming friend-request count for the Find Players badge — refreshes whenever
  // the chat screen is (re)opened or a friend action bumps dataVersion.friends.
  useEffect(() => {
    if (!user || !activated) return
    let alive = true
    api.get<{ data: unknown[] }>('/users/friends/requests')
      .then(r => { if (alive) setRequestCount(r.data?.length ?? 0) })
      .catch(() => {})
    return () => { alive = false }
  }, [user, activated, dataVersion.friends])

  // New-message picker: load friends on open, reset on close.
  useEffect(() => {
    if (!newMsgOpen) { setPickerQuery(''); setPickerResults([]); setLoadingPicker(false); return }
    setLoadingPicker(true)
    api.get<{ data: Player[] }>('/users/friends')
      .then(r => setFriends(r.data ?? [])).catch(() => {})
      .finally(() => setLoadingPicker(false))
  }, [newMsgOpen])

  // Debounced people search within the picker.
  useEffect(() => {
    const q = pickerQuery.trim()
    if (!q) { setPickerResults([]); setLoadingPicker(false); return }
    setLoadingPicker(true)
    const id = setTimeout(() => {
      api.get<{ data: Player[] }>(`/users/search?q=${encodeURIComponent(q)}`)
        .then(r => setPickerResults(r.data ?? []))
        .catch(() => setPickerResults([]))
        .finally(() => setLoadingPicker(false))
    }, 300)
    return () => clearTimeout(id)
  }, [pickerQuery])

  // Find-or-create a DM with the chosen person, then open the thread.
  const startDm = async (targetId: string) => {
    if (creatingDm) return
    setCreatingDm(true)
    try {
      const { data } = await api.post<{ data: ChatThread }>('/threads', { userId: targetId })
      setNewMsgOpen(false)
      refreshData('threads')
      openOverlayWith('chatThread', data)
    } catch {
      showError(t('error.generic'))
    } finally {
      setCreatingDm(false)
    }
  }

  const pickerList = pickerQuery.trim() ? pickerResults : friends

  const threadName = (th: ChatThread) => {
    const other = th.participants.find(p => p.userId !== (user?.id ?? ''))
    return th.type === 'group' ? (th.name ?? t('chat.groupChat')) : (other?.user?.displayName ?? th.name ?? '')
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
        <h1 className="serif" style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)' }}>{t('chat.title')}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Pressable
            aria-label={t('a11y.search')}
            onClick={() => { setSearchOpen(o => { if (o) setQuery(''); return !o }) }}
            style={{ width: 36, height: 36, background: searchOpen ? 'var(--primary-soft)' : 'var(--surface)', border: '1px solid var(--line)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={searchOpen ? 'var(--primary)' : 'var(--ink-2)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </Pressable>
          <Pressable
            aria-label={t('chat.newMessage')}
            onClick={() => setNewMsgOpen(true)}
            style={{ width: 36, height: 36, background: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: '50%', boxShadow: 'var(--shadow-cta)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </Pressable>
          <Avatar name={user?.displayName} url={user?.avatarUrl} seed={user?.id} size={34} fontSize={13} onClick={() => setActiveScreen('profile')} title={t('common.profile')} />
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
          <Pressable aria-pressed={tab === 'friends'} className={`toggle-tab${tab === 'friends' ? ' active' : ''}`} onClick={() => setTab('friends')}>
            {t('chat.tab.friends')}
          </Pressable>
          <Pressable aria-pressed={tab === 'communities'} className={`toggle-tab${tab === 'communities' ? ' active' : ''}`} onClick={() => setTab('communities')}>
            {t('chat.tab.communities')}
          </Pressable>
        </div>
      </div>

      <div className="scroll-body">
        {loading ? (
          <div style={{ marginTop: 8 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px' }}>
                <Skeleton w={44} h={44} r="50%" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <Skeleton w="45%" h={13} />
                  <Skeleton w="70%" h={11} />
                </div>
              </div>
            ))}
          </div>
        ) : tab === 'friends' ? (
          <div style={{ marginTop: 8 }}>
            {/* Find players entry */}
            <Pressable className="mod-row" onClick={() => openOverlayWith('findPlayers')} style={{ cursor: 'pointer' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h3"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="serif" style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>{t('chat.findPlayers')}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{t('chat.findBuddiesSubtitle')}</div>
              </div>
              {requestCount > 0 && (
                <div style={{ minWidth: 22, height: 22, padding: '0 6px', borderRadius: 11, background: 'var(--primary)', color: 'white', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{requestCount}</div>
              )}
            </Pressable>
            {dmThreads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 24px', color: 'var(--ink-3)', fontSize: 13 }}>{t('chat.noThreads')}</div>
            ) : (
              dmThreads.map(thread => (
                <ThreadRow key={thread.id} thread={thread} currentUserId={user?.id ?? ''} onOpen={() => openOverlayWith('chatThread', thread)} />
              ))
            )}
          </div>
        ) : (
          groupThreads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 24px' }}>
              <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>{t('chat.joinCommunityPrompt')}</div>
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

      {/* New-message picker — start a DM with a friend or searched player */}
      {newMsgOpen && (
        <div onClick={() => setNewMsgOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(26,35,50,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, maxHeight: '82%', background: 'var(--bg)', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column', padding: '16px 18px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 500, color: 'var(--ink)' }}>{t('chat.newMessage')}</div>
              <Pressable aria-label={t('a11y.close')} onClick={() => setNewMsgOpen(false)} style={{ padding: 4 }}>
                <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </Pressable>
            </div>
            <div className="search-bar" style={{ marginBottom: 12 }}>
              <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              <input autoFocus value={pickerQuery} onChange={e => setPickerQuery(e.target.value)} placeholder={t('players.search')} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)' }} />
            </div>
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {loadingPicker && pickerList.length === 0 ? (
                [0, 1, 2].map(i => (
                  <div key={i} className="mod-row" style={{ alignItems: 'center' }}>
                    <Skeleton w={40} h={40} r="50%" />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                      <Skeleton w="42%" h={13} />
                      <Skeleton w="60%" h={11} />
                    </div>
                  </div>
                ))
              ) : pickerList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--ink-3)', fontSize: 13 }}>
                  {pickerQuery.trim() ? t('players.noResults') : t('chat.noFriendsYet')}
                </div>
              ) : (
                pickerList.map(p => (
                  <Pressable key={p.id} className="mod-row" onClick={() => startDm(p.id)} disabled={creatingDm} style={{ cursor: creatingDm ? 'default' : 'pointer', opacity: creatingDm ? 0.6 : 1 }}>
                    <Avatar name={p.displayName} url={p.avatarUrl} seed={p.id} size={40} fontSize={15} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{p.displayName}</div>
                      {p.locationText && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{p.locationText}</div>}
                    </div>
                  </Pressable>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
