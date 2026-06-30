'use client'
import { useEffect, useState } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useLang } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { Community } from '@/types/community'
import { Post } from '@/types/post'
import { Round } from '@/types/round'
import { formatHandicap } from '@/lib/utils'
import { prepareImage, isSupportedImage, MAX_UPLOAD_BYTES } from '@/lib/image'
import { Avatar } from '@/components/ui/Avatar'
import { Pressable } from '@/components/ui/Pressable'
import { RoundCard } from '@/components/screens/RoundsScreen'
import { PostCard } from '@/components/screens/CommunityScreen'
import type { TranslationKey } from '@/lib/translations'

type CommTab = 'feed' | 'rounds' | 'members'

const TYPE_LABEL_KEYS: Record<string, TranslationKey> = {
  mixed: 'community.type.mixed',
  mens_club: 'community.type.mensClub',
  ladies_club: 'community.type.ladiesClub',
  corporate: 'community.type.corporate',
  beginner: 'community.type.beginnerFriendly',
}

export function CommunityDetailOverlay() {
  const { openOverlay, openOverlayWith, closeOverlay, openSheetWith, setActiveScreen, overlayData, refreshData, showSuccess, showError } = useUI()
  const { t } = useLang()
  const { user } = useAuth()

  const seed = overlayData as Community | null
  const isOpen = openOverlay === 'communityDetail' && seed != null

  const [detail, setDetail] = useState<Community | null>(null)
  const [feed, setFeed] = useState<Post[]>([])
  const [rounds, setRounds] = useState<Round[]>([])
  const [tab, setTab] = useState<CommTab>('feed')
  const [busy, setBusy] = useState(false)
  const [uploadingArt, setUploadingArt] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null) // member being removed
  const [confirmKick, setConfirmKick] = useState<string | null>(null) // member armed for removal (two-tap confirm)

  // (Re)load whenever the overlay opens for a community.
  useEffect(() => {
    if (!isOpen || !seed) return
    setDetail(seed)        // show the thumbnail data immediately
    setFeed([])
    setRounds([])
    setTab('feed')
    setBusy(false)
    setConfirmKick(null)
    setRemovingId(null)
    let stale = false
    api.get<{ data: Community }>(`/communities/${seed.id}`)
      .then(({ data }) => { if (!stale && data) setDetail(data) }).catch(() => {})
    api.get<{ data: Post[] }>(`/posts?scope=community&communityId=${seed.id}`)
      .then(({ data }) => { if (!stale) setFeed(data ?? []) }).catch(() => {})
    api.get<{ data: Round[] }>(`/rounds?communityId=${seed.id}`)
      .then(({ data }) => { if (!stale) setRounds(data ?? []) }).catch(() => {})
    return () => { stale = true }
  }, [isOpen, seed?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen || !detail) return null

  const c1 = detail.color1 ?? '#B8CBE0'
  const c2 = detail.color2 ?? '#5C7A9A'
  const members = detail.members ?? []
  const memberCount = detail._count?.members ?? detail.memberCount
  const isMember = !!user && members.some(m => m.user.id === user.id)
  const canJoin = detail.privacy !== 'private'
  const loaded = detail.members !== undefined // detail (vs seed) has been fetched
  const isAdmin = !!user && (detail.creatorId === user.id || members.some(m => m.user.id === user.id && m.role === 'admin'))
  const isOwner = !!user && detail.creatorId === user.id // only the owner can remove members

  const handleArtPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.files?.[0]
    e.target.value = ''
    if (!raw || !detail) return
    if (!isSupportedImage(raw)) { showError(t('error.unsupportedImage')); return }
    setUploadingArt(true)
    try {
      const file = await prepareImage(raw, { maxDim: 1280 }) // downscale + compress client-side
      if (file.size > MAX_UPLOAD_BYTES) { showError(t('error.imageTooLarge')); return }
      const { data } = await api.upload<{ data: Community }>(`/uploads/community/${detail.id}`, file)
      if (data) setDetail(data)
    } catch { showError(t('error.uploadPhotoFailed')) }
    finally { setUploadingArt(false) }
  }

  const toggleJoin = async () => {
    if (!detail || !user || busy || !canJoin) return
    const willJoin = !isMember
    setBusy(true)
    // Optimistic: flip membership + count locally, reconcile with the response.
    setDetail(d => {
      if (!d) return d
      const prev = d.members ?? []
      const nextMembers = willJoin
        ? [...prev, { id: `tmp-${user.id}`, role: 'member' as const, status: 'active',
            user: { id: user.id, displayName: user.displayName, avatarInitial: user.avatarInitial, handicapIndex: user.handicapIndex } }]
        : prev.filter(m => m.user.id !== user.id)
      const count = (d._count?.members ?? d.memberCount) + (willJoin ? 1 : -1)
      return { ...d, members: nextMembers, memberCount: count, _count: { members: count, rounds: d._count?.rounds ?? d.roundCount } }
    })
    try {
      const { data } = await api.post<{ data: Community }>(`/communities/${detail.id}/${willJoin ? 'join' : 'leave'}`)
      if (data) setDetail(data)
      refreshData('communities')
      if (willJoin) showSuccess(t('success.joined'))
    } catch {
      // Reconcile from the server on failure.
      try { const { data } = await api.get<{ data: Community }>(`/communities/${detail.id}`); if (data) setDetail(data) } catch {}
    } finally {
      setBusy(false)
    }
  }

  // Owner removes a member. Optimistic: drop the row + decrement, reconcile with the response.
  const removeMember = async (targetId: string) => {
    if (!detail || !isOwner || removingId) return
    setConfirmKick(null)
    setRemovingId(targetId)
    setDetail(d => {
      if (!d) return d
      const nextMembers = (d.members ?? []).filter(m => m.user.id !== targetId)
      const count = Math.max(0, (d._count?.members ?? d.memberCount) - 1)
      return { ...d, members: nextMembers, memberCount: count, _count: { members: count, rounds: d._count?.rounds ?? d.roundCount } }
    })
    try {
      const { data } = await api.delete<{ data: Community }>(`/communities/${detail.id}/members/${targetId}`)
      if (data) setDetail(data)
      refreshData('communities')
      showSuccess(t('community.memberRemoved'))
    } catch {
      // Reconcile from the server on failure.
      try { const { data } = await api.get<{ data: Community }>(`/communities/${detail.id}`); if (data) setDetail(data) } catch {}
      showError(t('error.generic'))
    } finally {
      setRemovingId(null)
    }
  }

  const TABS: Array<{ key: CommTab; label: TranslationKey }> = [
    { key: 'feed', label: 'community.detail.tabFeed' },
    { key: 'rounds', label: 'community.detail.tabRounds' },
    { key: 'members', label: 'community.detail.tabMembers' },
  ]

  return (
    <div className={`detail-overlay${isOpen ? ' open' : ''}`}>
      {/* Hero */}
      <div style={{ height: 190, position: 'relative', overflow: 'hidden', flexShrink: 0, ...(detail.logoUrl ? { backgroundImage: `url(${detail.logoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: `linear-gradient(135deg,${c1},${c2})` }) }}>
        {!detail.logoUrl && (
          <svg viewBox="0 0 390 190" fill="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <path d="M-4 130 Q80 100 200 120 Q310 138 394 110 L394 194 L-4 194 Z" fill="rgba(255,255,255,.15)" />
            <path d="M-4 155 Q60 140 160 152 Q260 164 394 144 L394 194 L-4 194 Z" fill="rgba(255,255,255,.1)" />
            <line x1="290" y1="108" x2="290" y2="52" stroke="rgba(255,255,255,.7)" strokeWidth="2" strokeLinecap="round" />
            <path d="M290 52 L312 62 L290 74 Z" fill="rgba(255,255,255,.8)" />
          </svg>
        )}
        <Pressable className="detail-back" onClick={closeOverlay} style={{ top: 16, left: 16 }} aria-label={t('a11y.back')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="15 18 9 12 15 6" /></svg>
        </Pressable>
        {isAdmin && (
          <>
            <label
              htmlFor="community-art-input"
              style={{ position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploadingArt ? 'default' : 'pointer', pointerEvents: uploadingArt ? 'none' : 'auto' }}
              title={t('community.detail.changeArt')}
            >
              {uploadingArt ? (
                <span style={{ fontSize: 10, color: 'white' }}>…</span>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              )}
            </label>
            <input id="community-art-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleArtPick} style={{ display: 'none' }} />
          </>
        )}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 20px', background: 'linear-gradient(transparent,rgba(0,0,0,.52))' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.7)', marginBottom: 4 }}>{TYPE_LABEL_KEYS[detail.type] ? t(TYPE_LABEL_KEYS[detail.type]) : detail.type}</div>
              <h2 className="serif" style={{ fontSize: 22, fontWeight: 500, color: 'white', lineHeight: 1.15 }}>{detail.name}</h2>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.8)', marginTop: 3 }}>
                {memberCount} {t('community.members')}{detail.homeCourse?.name ? ` · ${detail.homeCourse.name}` : ''}
              </div>
            </div>
            {loaded && (
              canJoin ? (
                <Pressable onClick={toggleJoin} style={{ background: isMember ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.22)', backdropFilter: 'blur(8px)', border: `1.5px solid ${isMember ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.4)'}`, borderRadius: 'var(--r-pill)', padding: '9px 20px', cursor: busy ? 'default' : 'pointer', flexShrink: 0, opacity: busy ? 0.7 : 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{isMember ? t('community.detail.joined') : t('common.join')}</span>
                </Pressable>
              ) : (
                <div style={{ background: 'rgba(255,255,255,.14)', border: '1.5px solid rgba(255,255,255,.22)', borderRadius: 'var(--r-pill)', padding: '9px 18px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{t('community.privacy.private')}</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Inner tabs */}
      <div style={{ display: 'flex', background: 'var(--surface)', borderBottom: '1px solid var(--line-soft)', flexShrink: 0 }}>
        {TABS.map(tb => (
          <Pressable
            key={tb.key}
            onClick={() => setTab(tb.key)}
            aria-pressed={tab === tb.key}
            style={{ flex: 1, textAlign: 'center', padding: '14px 0', fontSize: 13, fontWeight: tab === tb.key ? 700 : 600, color: tab === tb.key ? 'var(--primary)' : 'var(--ink-3)', borderBottom: `2px solid ${tab === tb.key ? 'var(--primary)' : 'transparent'}`, cursor: 'pointer' }}
          >
            {t(tb.label)}
          </Pressable>
        ))}
      </div>

      <div className="scroll-body" style={{ padding: '16px 20px 80px' }}>
        {/* Feed */}
        {tab === 'feed' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span className="label-xs">{feed.length} {t('community.detail.postsSuffix')}</span>
              <Pressable className="link" style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', cursor: 'pointer' }} onClick={() => openSheetWith('compose', { communityId: detail.id, communityName: detail.name })}>+ {t('community.newPost')}</Pressable>
            </div>
            {feed.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)', fontSize: 13 }}>{t('community.detail.noPosts')}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {feed.map(p => <PostCard key={p.id} post={p} />)}
              </div>
            )}
          </>
        )}

        {/* Rounds */}
        {tab === 'rounds' && (
          <>
            <div className="label-xs" style={{ marginBottom: 14 }}>{rounds.length} {t('community.detail.roundsSuffix')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rounds.map(r => (
                <RoundCard key={r.id} round={r} onOpenDetail={() => openOverlayWith('roundDetail', r)} />
              ))}
            </div>
            <Pressable
              onClick={() => { closeOverlay(); setActiveScreen('host') }}
              style={{ display: 'block', width: '100%', background: 'var(--primary)', borderRadius: 'var(--r-lg)', padding: 14, textAlign: 'center', cursor: 'pointer', marginTop: rounds.length ? 12 : 6 }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{t('community.detail.hostRound')}</span>
            </Pressable>
          </>
        )}

        {/* Members */}
        {tab === 'members' && (
          <>
            <div className="label-xs" style={{ marginBottom: 14 }}>{memberCount} {t('community.members')}</div>
            {members.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)', fontSize: 13 }}>{t('community.detail.noMembers')}</div>
            ) : members.map(m => {
              const isCreator = m.user.id === detail.creatorId
              const role = isCreator ? 'admin' : m.role
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--line-soft)' }}>
                  <Avatar name={m.user.displayName} url={m.user.avatarUrl} seed={m.user.id} size={40} fontSize={15} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{m.user.displayName}{m.user.id === user?.id ? ` (${t('common.you')})` : ''}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>HCP {formatHandicap(m.user.handicapIndex)}</div>
                  </div>
                  {role === 'admin' && <span className="badge" style={{ background: 'var(--primary-soft)', color: 'var(--primary-ink)', fontSize: 10 }}>{t('community.detail.roleAdmin')}</span>}
                  {role === 'leader' && <span className="badge" style={{ background: 'var(--butter)', color: 'var(--butter-deep)', fontSize: 10 }}>{t('community.detail.roleLeader')}</span>}
                  {isOwner && !isCreator && (
                    <Pressable
                      onClick={() => { if (removingId) return; confirmKick === m.user.id ? removeMember(m.user.id) : setConfirmKick(m.user.id) }}
                      disabled={removingId === m.user.id}
                      aria-label={t('community.detail.removeMember')}
                      style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 'var(--r-pill)', border: `1.5px solid ${confirmKick === m.user.id ? '#C0392B' : 'var(--line)'}`, background: confirmKick === m.user.id ? '#FDECEA' : 'var(--surface)', cursor: removingId === m.user.id ? 'default' : 'pointer' }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#C0392B' }}>
                        {removingId === m.user.id ? '…' : confirmKick === m.user.id ? t('community.detail.removeConfirm') : t('community.detail.removeMember')}
                      </span>
                    </Pressable>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
