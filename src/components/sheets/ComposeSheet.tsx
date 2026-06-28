'use client'
import { useState, useEffect, useRef } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LanguageContext'
import { api } from '@/lib/api'
import { PostType } from '@/types/post'
import { Community } from '@/types/community'
import { BottomSheet } from './BottomSheet'

const POST_TYPES: Array<{ key: PostType; label: string; emoji: string }> = [
  { key: 'round_report', label: 'Round Report', emoji: '⛳' },
  { key: 'seeking', label: 'Seeking Players', emoji: '👋' },
  { key: 'tip', label: 'Tip', emoji: '💡' },
  { key: 'general', label: 'General', emoji: '💬' },
]

export function ComposeSheet() {
  const { openSheet, closeSheet, refreshData, showSuccess, sheetData } = useUI()
  const { user } = useAuth()
  const { t } = useLang()
  const isOpen = openSheet === 'compose'

  const [postType, setPostType] = useState<PostType>('general')
  const [body, setBody] = useState('')
  const [communityId, setCommunityId] = useState('')
  const [communities, setCommunities] = useState<Community[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // When opened from inside a community ("+ New Post"), pre-select that community.
  useEffect(() => {
    if (!isOpen) { setPhotoUrl(null); return }
    const target = sheetData as { communityId?: string; communityName?: string } | null
    setCommunityId(target?.communityId ?? '')
    api.get<{ data: Community[] }>('/communities/mine')
      .then(r => {
        let list = r.data ?? []
        // Ensure the target community is selectable even if it's not in "mine".
        if (target?.communityId && !list.some(c => c.id === target.communityId)) {
          list = [{ id: target.communityId, name: target.communityName ?? 'This community' } as Community, ...list]
        }
        setCommunities(list)
      })
      .catch(() => {})
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePhotoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    setUploadingPhoto(true)
    try {
      const { data } = await api.upload<{ data: { url: string } }>('/uploads/post', file)
      setPhotoUrl(data.url)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload photo.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleSubmit = async () => {
    if (!body.trim() || submitting) return
    setError(null)
    setSubmitting(true)
    try {
      await api.post('/posts', {
        type: postType,
        body: body.trim(),
        photoUrl: photoUrl || undefined,
        communityIds: communityId ? [communityId] : undefined,
        visibility: communityId ? 'community' : 'public',
      })
      setBody(''); setCommunityId(''); setPostType('general'); setPhotoUrl(null)
      refreshData('posts')
      closeSheet()
      showSuccess(t('success.posted'))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to post.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={closeSheet} title={t('community.newPost')}>
      <div style={{ padding: '16px 20px 20px' }}>
        {/* Post type pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {POST_TYPES.map(pt => (
            <div key={pt.key} className={`compose-type-pill${postType === pt.key ? ' active' : ''}`} onClick={() => setPostType(pt.key)}>
              <span>{pt.emoji}</span>
              <span>{pt.label}</span>
            </div>
          ))}
        </div>

        {/* Community selector */}
        {communities.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <select
              value={communityId}
              onChange={e => setCommunityId(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--line)', borderRadius: 'var(--r-md)', fontSize: 13, background: 'var(--surface)', color: communityId ? 'var(--ink)' : 'var(--ink-3)', fontFamily: 'var(--sans)', outline: 'none' }}
            >
              <option value="">Post publicly…</option>
              {communities.map(c => <option key={c.id} value={c.id}>Post to {c.name}</option>)}
            </select>
          </div>
        )}

        {/* Photo (prominent, above the text) */}
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handlePhotoPick} style={{ display: 'none' }} />
        {photoUrl ? (
          <div style={{ position: 'relative', marginBottom: 14, borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt="post" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
            <div onClick={() => setPhotoUrl(null)} style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </div>
          </div>
        ) : (
          <div
            onClick={() => !uploadingPhoto && fileRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 14px', border: '1.5px solid var(--primary)', background: 'var(--primary-soft)', borderRadius: 'var(--r-md)', marginBottom: 14, cursor: uploadingPhoto ? 'default' : 'pointer', color: 'var(--primary-ink)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{uploadingPhoto ? 'Uploading…' : 'Add a Photo'}</span>
          </div>
        )}

        {/* Textarea */}
        <textarea
          className="compose-textarea"
          placeholder={t('community.sharePrompt')}
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={5}
          style={{ marginBottom: 14 }}
        />

        {error && <div style={{ fontSize: 13, color: '#C0392B', marginBottom: 10 }}>{error}</div>}

        <div
          onClick={handleSubmit}
          style={{
            background: body.trim() ? 'var(--primary)' : 'var(--bg-alt)',
            borderRadius: 'var(--r-lg)', padding: '14px', textAlign: 'center',
            cursor: body.trim() && !submitting ? 'pointer' : 'default',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: body.trim() ? 'white' : 'var(--ink-3)' }}>
            {submitting ? 'Posting…' : 'Post'}
          </span>
        </div>
      </div>
    </BottomSheet>
  )
}
