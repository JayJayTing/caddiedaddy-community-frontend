'use client'
import { useState, useEffect } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useLang } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { Post } from '@/types/post'
import { Community } from '@/types/community'
import { timeAgo } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Pressable } from '@/components/ui/Pressable'
import { PostCardSkeleton } from '@/components/ui/Skeleton'
import { useActivated } from '@/hooks/useActivated'
import type { TranslationKey } from '@/lib/translations'

type CommunityTab = 'discover' | 'following' | 'mine'
type PostFilter = 'all' | 'round_report' | 'seeking' | 'tip'

const TYPE_LABEL_KEYS: Record<string, TranslationKey> = {
  round_report: 'post.type.roundReport',
  seeking: 'post.type.seeking',
  tip: 'post.type.tip',
  general: 'post.type.general',
  announcement: 'post.type.announcement',
}

const TYPE_COLORS: Record<string, [string, string]> = {
  round_report: ['var(--primary-soft)', 'var(--primary-ink)'],
  seeking: ['var(--butter)', 'var(--butter-deep)'],
  tip: ['var(--sage)', 'var(--sage-deep)'],
  general: ['var(--bg-alt)', 'var(--ink-2)'],
  announcement: ['var(--sky)', 'var(--sky-deep)'],
}

// A post counts as "looking for players" if explicitly flagged, or it's the
// seeking type (covers posts created before the isLfp flag was wired up).
export function isLfpPost(p: Post) {
  return p.isLfp || p.type === 'seeking'
}

export function PostCard({ post }: { post: Post }) {
  const { openOverlayWith, showError } = useUI()
  const { t } = useLang()
  const [expanded, setExpanded] = useState(false)
  const [liked, setLiked] = useState(post.userHasLiked ?? false)
  const [likeCount, setLikeCount] = useState(post.likesCount)
  const [liking, setLiking] = useState(false)

  const [bg, fg] = TYPE_COLORS[post.type] ?? ['var(--bg-alt)', 'var(--ink-2)']

  // The like endpoint is a server-side toggle returning the authoritative
  // { liked, likesCount }; optimistically flip, then reconcile with the response.
  const handleLike = async () => {
    if (liking) return
    setLiking(true)
    const next = !liked
    setLiked(next)
    setLikeCount(c => c + (next ? 1 : -1))
    try {
      const res = await api.post<{ liked: boolean; likesCount: number }>(`/posts/${post.id}/like`)
      setLiked(res.liked)
      setLikeCount(res.likesCount)
    } catch {
      setLiked(!next)
      setLikeCount(c => c + (next ? -1 : 1))
      showError(t('error.like'))
    } finally {
      setLiking(false)
    }
  }

  return (
    <div className="post-card">
      {/* Looking-for-Players banner — players needed + location, up top where it's scannable */}
      {isLfpPost(post) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 12px', background: 'var(--primary-soft)', borderRadius: 'var(--r-md)' }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--primary-ink)' }}>🏌️ {t('lfp.lookingForPlayers')}</span>
          {post.lfpPlayersNeeded ? (
            <span style={{ fontSize: 11, fontWeight: 700, color: 'white', background: 'var(--primary)', padding: '2px 9px', borderRadius: 'var(--r-pill)' }}>{post.lfpPlayersNeeded} {t('lfp.playersNeededSuffix')}</span>
          ) : null}
          {post.locationText ? (
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary-ink)', marginLeft: 'auto' }}>📍 {post.locationText}</span>
          ) : null}
        </div>
      )}
      {/* Author row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Avatar name={post.author.displayName} url={post.author.avatarUrl} seed={post.authorId} size={36} fontSize={13} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{post.author.displayName}</span>
            <span className="badge" style={{ background: bg, color: fg, fontSize: 10 }}>{t(TYPE_LABEL_KEYS[post.type] ?? 'post.type.general')}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            {post.communities[0]?.community.name && <span>{post.communities[0].community.name} · </span>}
            {timeAgo(post.createdAt)}
          </div>
        </div>
      </div>
      {/* Body */}
      <Pressable
        className={expanded ? '' : 'post-text-clamped'}
        style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, marginBottom: 10, cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        {post.body}
      </Pressable>
      {post.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.photoUrl} alt="" style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 'var(--r-md)', marginBottom: 10, display: 'block' }} />
      )}
      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Pressable aria-label={t('a11y.like')} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }} onClick={handleLike}>
          <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill={liked ? 'var(--primary)' : 'none'} stroke={liked ? 'var(--primary)' : 'var(--ink-3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span style={{ fontSize: 12, color: liked ? 'var(--primary)' : 'var(--ink-3)' }}>{likeCount}</span>
        </Pressable>
        <Pressable aria-label={t('a11y.comment')} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }} onClick={() => openOverlayWith('postDetail', post)}>
          <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{post.commentsCount}</span>
        </Pressable>
        <Pressable style={{ marginLeft: 'auto', cursor: 'pointer' }} onClick={() => openOverlayWith('postDetail', post)}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>{t('community.view')}</span>
        </Pressable>
      </div>
    </div>
  )
}

function CommunityThumb({ comm, onOpen }: { comm: Community; onOpen: () => void }) {
  const { t } = useLang()
  const c1 = comm.color1 ?? '#B8CBE0'
  const c2 = comm.color2 ?? '#5C7A9A'
  return (
    <Pressable className="comm-thumb" onClick={onOpen} style={{ cursor: 'pointer' }}>
      <div
        className="comm-thumb-art"
        style={comm.logoUrl
          ? { backgroundImage: `url(${comm.logoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: `linear-gradient(135deg,${c1},${c2})` }}
      >
        <div style={{ position: 'absolute', bottom: 8, left: 10 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 'var(--r-pill)', background: 'rgba(255,255,255,.22)', color: 'white' }}>
            {comm.memberCount} {t('community.members')}
          </span>
        </div>
      </div>
      <div className="comm-thumb-body">
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2, marginBottom: 2 }}>{comm.name}</div>
        <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>{comm.roundCount ?? 0} {t('community.roundsSuffix')}</div>
      </div>
    </Pressable>
  )
}

export function CommunityScreen() {
  const { activeScreen, openOverlayWith, openSheetWith, setActiveScreen, dataVersion } = useUI()
  const { t } = useLang()
  const { user } = useAuth()
  const activated = useActivated('community')
  const [tab, setTab] = useState<CommunityTab>('discover')
  const [postFilter, setPostFilter] = useState<PostFilter>('all')
  const [showAllComms, setShowAllComms] = useState(false)
  const [discoverLfp, setDiscoverLfp] = useState(false)

  const [discoverCommunities, setDiscoverCommunities] = useState<Community[]>([])
  const [discoverPosts, setDiscoverPosts] = useState<Post[]>([])
  const [followingPosts, setFollowingPosts] = useState<Post[]>([])
  const [myCommunities, setMyCommunities] = useState<Community[]>([])

  const [loadingDiscover, setLoadingDiscover] = useState(true)
  const [loadingFollowing, setLoadingFollowing] = useState(false)

  useEffect(() => {
    if (!user || !activated) return
    Promise.all([
      api.get<{ data: Community[] }>('/communities').then(r => setDiscoverCommunities(r.data ?? [])).catch(() => {}),
      api.get<{ data: Post[] }>('/posts?scope=discover').then(r => setDiscoverPosts(r.data ?? [])).catch(() => {}),
    ]).finally(() => setLoadingDiscover(false))
  }, [user, activated, dataVersion.communities, dataVersion.posts])

  // Re-fetch the active tab's data whenever it's opened OR a relevant mutation bumps
  // dataVersion (e.g. creating/joining a community must show up in "Mine" immediately).
  useEffect(() => {
    if (!user || !activated) return
    if (tab === 'following') {
      setLoadingFollowing(true)
      api.get<{ data: Post[] }>('/posts?scope=following')
        .then(r => setFollowingPosts(r.data ?? []))
        .catch(() => {})
        .finally(() => setLoadingFollowing(false))
    }
    if (tab === 'mine') {
      api.get<{ data: Community[] }>('/communities/mine')
        .then(r => setMyCommunities(r.data ?? []))
        .catch(() => {})
    }
  }, [user, activated, tab, dataVersion.communities, dataVersion.posts]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredFollowing = followingPosts.filter(p => {
    if (postFilter === 'all') return true
    return p.type === postFilter
  })

  const discoverShown = discoverLfp ? discoverPosts.filter(isLfpPost) : discoverPosts

  const POST_FILTER_OPTS: Array<{ key: PostFilter; label: string }> = [
    { key: 'all', label: t('community.filter.all') },
    { key: 'round_report', label: t('community.filter.roundReports') },
    { key: 'seeking', label: t('community.filter.seeking') },
    { key: 'tip', label: t('community.filter.tips') },
  ]

  return (
    <div className={`screen${activeScreen === 'community' ? ' active' : ''}`}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 0', flexShrink: 0 }}>
        <h1 className="serif" style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)' }}>{t('community.title')}</h1>
        <Pressable style={{ background: 'var(--primary)', borderRadius: 'var(--r-md)', padding: '8px 14px', cursor: 'pointer' }} onClick={() => openSheetWith('compose')}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>+ {t('community.newPost')}</span>
        </Pressable>
      </div>

      {/* Toggle tabs */}
      <div style={{ padding: '14px 20px 0', flexShrink: 0 }}>
        <div className="toggle-tabs">
          {(['discover', 'following', 'mine'] as CommunityTab[]).map(t2 => (
            <Pressable key={t2} aria-pressed={tab === t2} className={`toggle-tab${tab === t2 ? ' active' : ''}`} onClick={() => setTab(t2)}>
              {t2 === 'discover' ? t('community.tab.discover') : t2 === 'following' ? t('community.tab.following') : t('community.tab.mine')}
            </Pressable>
          ))}
        </div>
      </div>

      <div className="scroll-body" style={{ paddingBottom: 24 }}>
        {/* Discover */}
        {tab === 'discover' && (
          <>
            <div className="section-row" style={{ marginTop: 16 }}>
              <span className="label-xs">{t('community.golfCommunities')}</span>
              {discoverCommunities.length > 0 && (
                <Pressable className="see-all link" style={{ cursor: 'pointer' }} onClick={() => setShowAllComms(v => !v)}>
                  {showAllComms ? t('community.showLess') : t('community.seeAll')}
                </Pressable>
              )}
            </div>
            {loadingDiscover ? null : showAllComms ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '0 16px', marginBottom: 20 }}>
                {discoverCommunities.map(c => <CommunityThumb key={c.id} comm={c} onOpen={() => openOverlayWith('communityDetail', c)} />)}
              </div>
            ) : (
              <div className="hscroll" style={{ marginBottom: 20 }}>
                {discoverCommunities.map(c => <CommunityThumb key={c.id} comm={c} onOpen={() => openOverlayWith('communityDetail', c)} />)}
                <div style={{ width: 4, flexShrink: 0 }} />
              </div>
            )}
            <div className="section-row">
              <span className="label-xs">{discoverLfp ? t('community.lfp') : t('community.recentPosts')}</span>
            </div>
            {/* Looking-for-Players filter — finding players is the priority surface */}
            <div className="hscroll" style={{ padding: '0 16px 10px', gap: 8 }}>
              <Pressable aria-pressed={!discoverLfp} className={`fchip${!discoverLfp ? ' active' : ''}`} onClick={() => setDiscoverLfp(false)}>
                {t('community.allPosts')}
              </Pressable>
              <Pressable aria-pressed={discoverLfp} className={`fchip${discoverLfp ? ' active' : ''}`} onClick={() => setDiscoverLfp(true)}>
                🏌️ {t('community.lfp')}
              </Pressable>
            </div>
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {loadingDiscover ? (
                <>{[0, 1, 2].map(i => <PostCardSkeleton key={i} />)}</>
              ) : discoverShown.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 16px' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>⛳️</div>
                  <div style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 14 }}>{discoverLfp ? t('lfp.none') : t('community.followPrompt')}</div>
                  {/* Bridge to a booking: hosting a round creates an open game others can join */}
                  <Pressable onClick={() => setActiveScreen('host')} style={{ display: 'inline-block', background: 'var(--primary)', borderRadius: 'var(--r-md)', padding: '10px 20px' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>+ {t('rounds.host')}</span>
                  </Pressable>
                </div>
              ) : discoverShown.map(p => <PostCard key={p.id} post={p} />)}
            </div>
          </>
        )}

        {/* Following */}
        {tab === 'following' && (
          <>
            <div className="hscroll" style={{ padding: '14px 20px 4px', gap: 8 }}>
              {POST_FILTER_OPTS.map(f => (
                <Pressable key={f.key} aria-pressed={postFilter === f.key} className={`fchip${postFilter === f.key ? ' active' : ''}`} onClick={() => setPostFilter(f.key)}>
                  {f.label}
                </Pressable>
              ))}
            </div>
            <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {loadingFollowing ? (
                <>{[0, 1, 2].map(i => <PostCardSkeleton key={i} />)}</>
              ) : filteredFollowing.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>👋</div>
                  <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>{t('community.followPrompt')}</div>
                </div>
              ) : filteredFollowing.map(p => <PostCard key={p.id} post={p} />)}
            </div>
          </>
        )}

        {/* Mine */}
        {tab === 'mine' && (
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Create CTA */}
            <Pressable
              style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 20, textAlign: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-sm)', border: '2px dashed var(--line)' }}
              onClick={() => openOverlayWith('createCommunity')}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>🏌️</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>{t('community.createCommunity')}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{t('community.createSubtitle')}</div>
            </Pressable>

            {myCommunities.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', margin: '8px 4px 4px' }}>
                  {t('community.yourCommunities')}
                </div>
                {myCommunities.map(c => {
                  const c1 = c.color1 ?? '#B8CBE0', c2 = c.color2 ?? '#5C7A9A'
                  return (
                    <Pressable key={c.id} className="comm-full-card" onClick={() => openOverlayWith('communityDetail', c)} style={{ cursor: 'pointer' }}>
                      <div style={{ height: 70, position: 'relative', ...(c.logoUrl ? { backgroundImage: `url("${c.logoUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: `linear-gradient(135deg,${c1},${c2})` }) }}>
                        {c.logoUrl && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,rgba(0,0,0,.5),rgba(0,0,0,.15))' }} />}
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 16px' }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: 'white', textShadow: c.logoUrl ? '0 1px 4px rgba(0,0,0,.6)' : 'none' }}>{c.name}</span>
                        </div>
                      </div>
                      <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{c.memberCount} {t('community.members')} · {c.roundCount} {t('community.roundsSuffix')}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', cursor: 'pointer' }}>
                          {c.userMembership?.role === 'admin' ? t('community.manage') : t('community.view')}
                        </span>
                      </div>
                    </Pressable>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
