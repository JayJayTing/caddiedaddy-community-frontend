'use client'
import { useState, useEffect, useCallback, ReactNode } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useLang } from '@/contexts/LanguageContext'
import { api } from '@/lib/api'
import { Player, Relation } from '@/types/player'
import type { TranslationKey } from '@/lib/translations'
import { formatHandicap } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Pressable } from '@/components/ui/Pressable'

type Translate = (k: TranslationKey) => string

export function FindPlayersOverlay() {
  const { openOverlay, closeOverlay, showSuccess, refreshData, showError } = useUI()
  const { t } = useLang()
  const isOpen = openOverlay === 'findPlayers'

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Player[]>([])
  const [requests, setRequests] = useState<Player[]>([])
  const [friends, setFriends] = useState<Player[]>([])
  const [searching, setSearching] = useState(false)

  const loadLists = useCallback(() => {
    api.get<{ data: Player[] }>('/users/friends/requests').then((r) => setRequests(r.data ?? [])).catch(() => {})
    api.get<{ data: Player[] }>('/users/friends').then((r) => setFriends(r.data ?? [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!isOpen) { setQuery(''); setResults([]); return }
    loadLists()
  }, [isOpen, loadLists])

  // Debounced search
  useEffect(() => {
    const q = query.trim()
    if (!q) { setResults([]); setSearching(false); return }
    setSearching(true)
    const id = setTimeout(() => {
      api.get<{ data: Player[] }>(`/users/search?q=${encodeURIComponent(q)}`)
        .then((r) => setResults(r.data ?? []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 300)
    return () => clearTimeout(id)
  }, [query])

  const setRelation = (id: string, relation: Relation) =>
    setResults((rs) => rs.map((p) => (p.id === id ? { ...p, relation } : p)))

  const handleAdd = async (p: Player) => {
    setRelation(p.id, 'outgoing') // optimistic
    try {
      const { data } = await api.post<{ data: { status: string } }>(`/users/friends/${p.id}/request`)
      if (data.status === 'accepted') {
        setRelation(p.id, 'friends')
        showSuccess(t('players.nowFriends'))
        loadLists()
        refreshData('friends')
      } else {
        showSuccess(t('players.added'))
      }
    } catch {
      setRelation(p.id, 'none')
      showError(t('error.generic'))
    }
  }

  const handleAccept = async (p: Player) => {
    try {
      await api.post(`/users/friends/${p.id}/accept`)
      setRequests((rs) => rs.filter((r) => r.id !== p.id))
      setRelation(p.id, 'friends')
      showSuccess(t('players.nowFriends'))
      loadLists()
      refreshData('friends')
    } catch { showError(t('error.generic')) }
  }

  const handleDecline = async (p: Player) => {
    setRequests((rs) => rs.filter((r) => r.id !== p.id)) // optimistic
    try { await api.post(`/users/friends/${p.id}/decline`); refreshData('friends') } catch { loadLists(); showError(t('error.generic')) }
  }

  if (!isOpen) return null

  return (
    <div className={`detail-overlay${isOpen ? ' open' : ''}`}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px 12px', flexShrink: 0, borderBottom: '1px solid var(--line-soft)' }}>
        <Pressable onClick={closeOverlay} style={{ width: 34, height: 34, background: 'var(--bg-alt)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }} aria-label={t('a11y.back')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="15 18 9 12 15 6" /></svg>
        </Pressable>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 500, color: 'var(--ink)' }}>{t('players.title')}</h2>
      </div>

      {/* Search */}
      <div style={{ padding: '12px 20px 4px', flexShrink: 0 }}>
        <div className="search-bar">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('players.search')}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)' }}
          />
        </div>
      </div>

      <div className="scroll-body" style={{ padding: '8px 16px 24px' }}>
        {query.trim() ? (
          searching && results.length === 0 ? (
            <Hint>{t('loading')}</Hint>
          ) : results.length === 0 ? (
            <Hint>{t('players.noResults')}</Hint>
          ) : (
            results.map((p) => <PlayerRow key={p.id} p={p} t={t} onAdd={() => handleAdd(p)} onAccept={() => handleAccept(p)} />)
          )
        ) : (
          <>
            {requests.length > 0 && (
              <>
                <SectionLabel>{t('players.requests')} · {requests.length}</SectionLabel>
                {requests.map((p) => (
                  <PlayerRow key={p.id} p={p} t={t} request onAccept={() => handleAccept(p)} onDecline={() => handleDecline(p)} />
                ))}
                <div style={{ height: 14 }} />
              </>
            )}
            <SectionLabel>{t('players.friends')}{friends.length ? ` · ${friends.length}` : ''}</SectionLabel>
            {friends.length === 0 ? (
              <Hint>{t('players.noFriends')}</Hint>
            ) : (
              friends.map((p) => <PlayerRow key={p.id} p={{ ...p, relation: 'friends' }} t={t} />)
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── bits ──────────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="label-xs" style={{ padding: '10px 4px 8px' }}>{children}</div>
}

function Hint({ children }: { children: ReactNode }) {
  return <div style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--ink-3)', fontSize: 13 }}>{children}</div>
}

function Btn({ children, primary, onClick }: { children: ReactNode; primary?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: primary ? 'none' : '1.5px solid var(--line)',
        background: primary ? 'var(--primary)' : 'var(--surface)',
        color: primary ? 'white' : 'var(--ink-2)',
        borderRadius: 'var(--r-pill)', padding: '7px 16px', fontSize: 13, fontWeight: 700,
        cursor: 'pointer', fontFamily: 'var(--sans)', flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

function Tag({ children }: { children: ReactNode }) {
  return <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', padding: '7px 12px', flexShrink: 0 }}>{children}</span>
}

function PlayerRow({
  p, t, request, onAdd, onAccept, onDecline,
}: {
  p: Player; t: Translate; request?: boolean
  onAdd?: () => void; onAccept?: () => void; onDecline?: () => void
}) {
  const parts = [
    p.handicapIndex != null ? `${t('profile.stat.hcp')} ${formatHandicap(p.handicapIndex)}` : null,
    p.locationText || null,
  ].filter(Boolean)
  const relation: Relation = p.relation ?? 'none'

  return (
    <div className="mod-row" style={{ alignItems: 'center' }}>
      <Avatar name={p.displayName} url={p.avatarUrl} seed={p.id} size={44} fontSize={16} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{p.displayName}</div>
        {parts.length > 0 && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{parts.join(' · ')}</div>}
      </div>
      {request ? (
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Btn onClick={onDecline}>{t('players.decline')}</Btn>
          <Btn primary onClick={onAccept}>{t('players.accept')}</Btn>
        </div>
      ) : relation === 'friends' ? (
        <Tag>{t('players.friend')} ✓</Tag>
      ) : relation === 'outgoing' ? (
        <Tag>{t('players.requested')}</Tag>
      ) : relation === 'incoming' ? (
        <Btn primary onClick={onAccept}>{t('players.accept')}</Btn>
      ) : (
        <Btn primary onClick={onAdd}>{t('players.add')}</Btn>
      )}
    </div>
  )
}
