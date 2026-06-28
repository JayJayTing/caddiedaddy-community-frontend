'use client'
import { useState, useEffect } from 'react'
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
  const { openSheet, closeSheet } = useUI()
  const { user } = useAuth()
  const { t } = useLang()
  const isOpen = openSheet === 'compose'

  const [postType, setPostType] = useState<PostType>('general')
  const [body, setBody] = useState('')
  const [communityId, setCommunityId] = useState('')
  const [communities, setCommunities] = useState<Community[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    api.get<{ data: Community[] }>('/communities/mine')
      .then(r => setCommunities(r.data ?? []))
      .catch(() => {})
  }, [isOpen])

  const handleSubmit = async () => {
    if (!body.trim() || submitting) return
    setError(null)
    setSubmitting(true)
    try {
      await api.post('/posts', {
        type: postType,
        body: body.trim(),
        communityId: communityId || null,
        visibility: communityId ? 'community' : 'public',
      })
      setBody(''); setCommunityId(''); setPostType('general')
      closeSheet()
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
