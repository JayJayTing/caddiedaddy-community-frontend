'use client'
import { useState, useEffect, useRef } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LanguageContext'
import { api } from '@/lib/api'
import { Post, Comment } from '@/types/post'
import { timeAgo } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import type { TranslationKey } from '@/lib/translations'

export function PostDetailOverlay() {
  const { openOverlay, closeOverlay, overlayData } = useUI()
  const { user } = useAuth()
  const { t } = useLang()
  const post = overlayData as Post | null
  const isOpen = openOverlay === 'postDetail' && post != null

  const [comments, setComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [liked, setLiked] = useState(post?.userHasLiked ?? false)
  const [likeCount, setLikeCount] = useState(post?.likesCount ?? 0)

  useEffect(() => {
    if (!isOpen || !post) return
    setLiked(post.userHasLiked ?? false)
    setLikeCount(post.likesCount)
    setLoadingComments(true)
    api.get<{ data: Comment[] }>(`/posts/${post.id}/comments`)
      .then(r => setComments(r.data ?? []))
      .catch(() => setComments([]))
      .finally(() => setLoadingComments(false))
  }, [isOpen, post?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLike = async () => {
    if (!post || liked) return
    setLiked(true); setLikeCount(c => c + 1)
    try { await api.post(`/posts/${post.id}/like`) } catch { setLiked(false); setLikeCount(c => c - 1) }
  }

  const handleComment = async () => {
    if (!post || !commentText.trim() || submitting) return
    setSubmitting(true)
    try {
      const { data: comment } = await api.post<{ data: Comment }>(`/posts/${post.id}/comments`, { text: commentText })
      setComments(prev => [...prev, comment])
      setCommentText('')
    } catch {}
    setSubmitting(false)
  }

  if (!isOpen || !post) return null

  const [bg, fg] = ({
    round_report: ['var(--primary-soft)', 'var(--primary-ink)'],
    seeking: ['var(--butter)', 'var(--butter-deep)'],
    tip: ['var(--sage)', 'var(--sage-deep)'],
    general: ['var(--bg-alt)', 'var(--ink-2)'],
    announcement: ['var(--sky)', 'var(--sky-deep)'],
  } as Record<string, [string, string]>)[post.type] ?? ['var(--bg-alt)', 'var(--ink-2)']

  const TYPE_LABEL_KEYS: Record<string, TranslationKey> = {
    round_report: 'post.type.roundReport', seeking: 'post.type.seeking',
    tip: 'post.type.tip', general: 'post.type.general', announcement: 'post.type.announcement',
  }

  return (
    <div className={`detail-overlay${isOpen ? ' open' : ''}`}>
      {/* Back button */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', flexShrink: 0, borderBottom: '1px solid var(--line-soft)' }}>
        <div className="detail-back" style={{ position: 'static', background: 'var(--bg-alt)' }} onClick={closeOverlay}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </div>
        <span style={{ marginLeft: 12, fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>{t('post.detail.title')}</span>
      </div>

      <div className="scroll-body" style={{ padding: '16px 20px 80px' }}>
        {/* Post */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Avatar name={post.author.displayName} url={post.author.avatarUrl} seed={post.authorId} size={40} fontSize={15} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{post.author.displayName}</span>
                <span style={{ padding: '2px 8px', borderRadius: 'var(--r-pill)', fontSize: 10, fontWeight: 600, background: bg, color: fg }}>
                  {t(TYPE_LABEL_KEYS[post.type] ?? 'post.type.general')}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                {post.communities[0]?.community.name && `${post.communities[0].community.name} · `}{timeAgo(post.createdAt)}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.7 }}>{post.body}</div>
          {post.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.photoUrl} alt="" style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 'var(--r-md)', marginTop: 12, display: 'block' }} />
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 16, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={handleLike}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? 'var(--primary)' : 'none'} stroke={liked ? 'var(--primary)' : 'var(--ink-3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <span style={{ fontSize: 13, color: liked ? 'var(--primary)' : 'var(--ink-3)', fontWeight: 600 }}>{likeCount} {t('post.detail.likesSuffix')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>{comments.length} {t('post.detail.commentsSuffix')}</span>
            </div>
          </div>
        </div>

        {/* Comments */}
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 12 }}>
          {t('post.detail.commentsLabel')}
        </div>
        {loadingComments ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink-3)', fontSize: 13 }}>{t('loading')}</div>
        ) : comments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink-3)', fontSize: 13 }}>{t('post.detail.noComments')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {comments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                <Avatar name={c.author.displayName} url={c.author.avatarUrl} seed={c.authorId} size={32} fontSize={12} />
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{c.author.displayName}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{timeAgo(c.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.55 }}>{c.text}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comment input */}
      {user && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px 20px', background: 'var(--bg)', borderTop: '1px solid var(--line-soft)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <Avatar name={user.displayName} url={user.avatarUrl} seed={user.id} size={32} fontSize={12} />
            <div style={{ flex: 1, background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '8px 14px', display: 'flex', gap: 8 }}>
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder={t('post.detail.commentPlaceholder')}
                rows={1}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)', resize: 'none', lineHeight: 1.5 }}
              />
              <div
                onClick={handleComment}
                style={{ cursor: commentText.trim() ? 'pointer' : 'default', opacity: commentText.trim() ? 1 : 0.4 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
