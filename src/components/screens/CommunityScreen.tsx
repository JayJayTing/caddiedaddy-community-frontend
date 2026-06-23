'use client'
import { useState, useEffect } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useLang } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { Post } from '@/types/post'
import { Community } from '@/types/community'
import { avatarColor, getInitial, timeAgo } from '@/lib/utils'

type CommunityTab = 'discover' | 'following' | 'mine'
type PostFilter = 'all' | 'round_report' | 'seeking' | 'tip'

const TYPE_LABELS: Record<string, string> = {
  round_report: 'Round Report',
  seeking: 'Looking for Players',
  tip: 'Tip',
  general: 'General',
  announcement: 'Announcement',
}

const TYPE_COLORS: Record<string, [string, string]> = {
  round_report: ['var(--primary-soft)', 'var(--primary-ink)'],
  seeking: ['var(--butter)', 'var(--butter-deep)'],
  tip: ['var(--sage)', 'var(--sage-deep)'],
  general: ['var(--bg-alt)', 'var(--ink-2)'],
  announcement: ['var(--sky)', 'var(--sky-deep)'],
}

function PostCard({ post }: { post: Post }) {
  const { openOverlayWith } = useUI()
  const [expanded, setExpanded] = useState(false)
  const [liked, setLiked] = useState(post.userHasLiked ?? false)
  const [likeCount, setLikeCount] = useState(post.likesCount)

  const [bg, fg] = TYPE_COLORS[post.type] ?? ['var(--bg-alt)', 'var(--ink-2)']

  const handleLike = async () => {
    if (liked) return
    setLiked(true)
    setLikeCount(c => c + 1)
    try { await api.post(`/posts/${post.id}/like`) } catch { setLiked(false); setLikeCount(c => c - 1) }
  }

  return (
    <div className="post-card">
      {/* Author row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div className="avatar" style={{ width: 36, height: 36, fontSize: 13, background: avatarColor(post.authorId), flexShrink: 0 }}>
          {getInitial(post.author.displayName)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{post.author.displayName}</span>
            <span className="badge" style={{ background: bg, color: fg, fontSize: 10 }}>{TYPE_LABELS[post.type]}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            {post.communities[0]?.community.name && <span>{post.communities[0].community.name} · </span>}
            {timeAgo(post.createdAt)}
          </div>
        </div>
      </div>
      {/* Body */}
      <div
        className={expanded ? '' : 'post-text-clamped'}
        style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, marginBottom: 10, cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        {post.body}
      </div>
      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }} onClick={handleLike}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill={liked ? 'var(--primary)' : 'none'} stroke={liked ? 'var(--primary)' : 'var(--ink-3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span style={{ fontSize: 12, color: liked ? 'var(--primary)' : 'var(--ink-3)' }}>{likeCount}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }} onClick={() => openOverlayWith('postDetail', post)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{post.commentsCount}</span>
        </div>
        <div style={{ marginLeft: 'auto', cursor: 'pointer' }} onClick={() => openOverlayWith('postDetail', post)}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>View</span>
        </div>
      </div>
    </div>
  )
}

function CommunityThumb({ comm }: { comm: Community }) {
  const c1 = comm.color1 ?? '#B8CBE0'
  const c2 = comm.color2 ?? '#5C7A9A'
  return (
    <div className="comm-thumb">
      <div className="comm-thumb-art" style={{ background: `linear-gradient(135deg,${c1},${c2})` }}>
        <div style={{ position: 'absolute', bottom: 8, left: 10 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 'var(--r-pill)', background: 'rgba(255,255,255,.22)', color: 'white' }}>
            {comm.memberCount} members
          </span>
        </div>
      </div>
      <div className="comm-thumb-body">
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2, marginBottom: 2 }}>{comm.name}</div>
        <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>{comm.roundCount ?? 0} rounds</div>
      </div>
    </div>
  )
}

export function CommunityScreen() {
  const { activeScreen, openOverlayWith, openSheetWith } = useUI()
  const { t } = useLang()
  const { user } = useAuth()
  const [tab, setTab] = useState<CommunityTab>('discover')
  const [postFilter, setPostFilter] = useState<PostFilter>('all')

  const [discoverCommunities, setDiscoverCommunities] = useState<Community[]>([])
  const [discoverPosts, setDiscoverPosts] = useState<Post[]>([])
  const [followingPosts, setFollowingPosts] = useState<Post[]>([])
  const [myCommunities, setMyCommunities] = useState<Community[]>([])

  const [loadingDiscover, setLoadingDiscover] = useState(true)
  const [loadingFollowing, setLoadingFollowing] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get<{ communities: Community[] }>('/communities').then(r => setDiscoverCommunities(r.communities ?? [])).catch(() => {}),
      api.get<{ posts: Post[] }>('/posts?scope=discover').then(r => setDiscoverPosts(r.posts ?? [])).catch(() => {}),
    ]).finally(() => setLoadingDiscover(false))
  }, [])

  useEffect(() => {
    if (tab === 'following' && followingPosts.length === 0) {
      setLoadingFollowing(true)
      api.get<{ posts: Post[] }>('/posts?scope=following')
        .then(r => setFollowingPosts(r.posts ?? []))
        .catch(() => {})
        .finally(() => setLoadingFollowing(false))
    }
    if (tab === 'mine' && myCommunities.length === 0) {
      api.get<{ communities: Community[] }>('/communities/mine')
        .then(r => setMyCommunities(r.communities ?? []))
        .catch(() => {})
    }
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredFollowing = followingPosts.filter(p => {
    if (postFilter === 'all') return true
    return p.type === postFilter
  })

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
        <div className="serif" style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)' }}>{t('community.title')}</div>
        <div style={{ background: 'var(--primary)', borderRadius: 'var(--r-md)', padding: '8px 14px', cursor: 'pointer' }} onClick={() => openSheetWith('compose')}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>+ {t('community.newPost')}</span>
        </div>
      </div>

      {/* Toggle tabs */}
      <div style={{ padding: '14px 20px 0', flexShrink: 0 }}>
        <div className="toggle-tabs">
          {(['discover', 'following', 'mine'] as CommunityTab[]).map(t2 => (
            <div key={t2} className={`toggle-tab${tab === t2 ? ' active' : ''}`} onClick={() => setTab(t2)}>
              {t2 === 'discover' ? t('community.tab.discover') : t2 === 'following' ? t('community.tab.following') : t('community.tab.mine')}
            </div>
          ))}
        </div>
      </div>

      <div className="scroll-body" style={{ paddingBottom: 24 }}>
        {/* Discover */}
        {tab === 'discover' && (
          <>
            <div className="section-row" style={{ marginTop: 16 }}>
              <span className="label-xs">{t('community.golfCommunities')}</span>
              <span className="see-all">{t('community.seeAll')}</span>
            </div>
            {loadingDiscover ? null : (
              <div className="hscroll" style={{ marginBottom: 20 }}>
                {discoverCommunities.map(c => <CommunityThumb key={c.id} comm={c} />)}
                <div style={{ width: 4, flexShrink: 0 }} />
              </div>
            )}
            <div className="section-row">
              <span className="label-xs">{t('community.recentPosts')}</span>
            </div>
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {loadingDiscover ? (
                <div style={{ textAlign: 'center', padding: 20 }}><span style={{ color: 'var(--ink-3)', fontSize: 13 }}>{t('loading.posts')}</span></div>
              ) : discoverPosts.map(p => <PostCard key={p.id} post={p} />)}
            </div>
          </>
        )}

        {/* Following */}
        {tab === 'following' && (
          <>
            <div className="hscroll" style={{ padding: '14px 20px 4px', gap: 8 }}>
              {POST_FILTER_OPTS.map(f => (
                <div key={f.key} className={`fchip${postFilter === f.key ? ' active' : ''}`} onClick={() => setPostFilter(f.key)}>
                  {f.label}
                </div>
              ))}
            </div>
            <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {loadingFollowing ? (
                <div style={{ textAlign: 'center', padding: 20 }}><span style={{ color: 'var(--ink-3)', fontSize: 13 }}>{t('loading.posts')}</span></div>
              ) : filteredFollowing.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>👋</div>
                  <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>Follow communities to see their posts here</div>
                </div>
              ) : filteredFollowing.map(p => <PostCard key={p.id} post={p} />)}
            </div>
          </>
        )}

        {/* Mine */}
        {tab === 'mine' && (
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Create CTA */}
            <div
              style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 20, textAlign: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-sm)', border: '2px dashed var(--line)' }}
              onClick={() => openOverlayWith('createCommunity')}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>🏌️</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>{t('community.createCommunity')}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{t('community.createSubtitle')}</div>
            </div>

            {myCommunities.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', margin: '8px 4px 4px' }}>
                  {t('community.yourCommunities')}
                </div>
                {myCommunities.map(c => {
                  const c1 = c.color1 ?? '#B8CBE0', c2 = c.color2 ?? '#5C7A9A'
                  return (
                    <div key={c.id} className="comm-full-card">
                      <div style={{ height: 60, background: `linear-gradient(135deg,${c1},${c2})`, position: 'relative' }}>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 16px' }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{c.name}</span>
                        </div>
                      </div>
                      <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{c.memberCount} {t('community.members')} · {c.roundCount} rounds</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', cursor: 'pointer' }}>
                          {c.userMembership?.role === 'admin' ? t('community.manage') : t('community.view')}
                        </span>
                      </div>
                    </div>
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
