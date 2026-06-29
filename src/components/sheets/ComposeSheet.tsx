'use client'
import { useState, useEffect } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LanguageContext'
import { api } from '@/lib/api'
import { PostType } from '@/types/post'
import { Community } from '@/types/community'
import { BottomSheet } from './BottomSheet'
import { Pressable } from '@/components/ui/Pressable'
import { prepareImage, isSupportedImage, MAX_UPLOAD_BYTES } from '@/lib/image'
import type { TranslationKey } from '@/lib/translations'

const POST_TYPES: Array<{ key: PostType; labelKey: TranslationKey; emoji: string }> = [
  { key: 'round_report', labelKey: 'post.type.roundReport', emoji: '⛳' },
  { key: 'seeking', labelKey: 'post.type.seeking', emoji: '👋' },
  { key: 'tip', labelKey: 'post.type.tip', emoji: '💡' },
  { key: 'general', labelKey: 'post.type.general', emoji: '💬' },
]

// Matches the Host screen's section labels so the two create flows read as one.
const sectionLabel: React.CSSProperties = { fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }

export function ComposeSheet() {
  const { openSheet, closeSheet, closeOverlay, refreshData, showSuccess, sheetData, setActiveScreen, setHostCommunity } = useUI()
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
  // Looking-for-Players fields — only sent when the post type is 'seeking'.
  const [lfpLocation, setLfpLocation] = useState('')
  const [lfpPlayers, setLfpPlayers] = useState(1)
  const isLfp = postType === 'seeking'

  // When opened from inside a community ("+ New Post"), pre-select that community.
  useEffect(() => {
    if (!isOpen) { setPhotoUrl(null); setLfpLocation(''); setLfpPlayers(1); return }
    const target = sheetData as { communityId?: string; communityName?: string } | null
    setCommunityId(target?.communityId ?? '')
    api.get<{ data: Community[] }>('/communities/mine')
      .then(r => {
        let list = r.data ?? []
        // Ensure the target community is selectable even if it's not in "mine".
        if (target?.communityId && !list.some(c => c.id === target.communityId)) {
          list = [{ id: target.communityId, name: target.communityName ?? t('sheet.compose.thisCommunity') } as Community, ...list]
        }
        setCommunities(list)
      })
      .catch(() => {})
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePhotoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.files?.[0]
    e.target.value = ''
    if (!raw) return
    if (!isSupportedImage(raw)) { setError(t('error.unsupportedImage')); return }
    setError(null)
    setUploadingPhoto(true)
    try {
      const file = await prepareImage(raw, { maxDim: 1600 }) // downscale + compress client-side
      if (file.size > MAX_UPLOAD_BYTES) { setError(t('error.imageTooLarge')); return }
      const { data } = await api.upload<{ data: { url: string } }>('/uploads/post', file)
      setPhotoUrl(data.url)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error.uploadPhotoFailed'))
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
        isLfp,
        locationText: isLfp && lfpLocation.trim() ? lfpLocation.trim() : undefined,
        lfpPlayersNeeded: isLfp ? lfpPlayers : undefined,
      })
      setBody(''); setCommunityId(''); setPostType('general'); setPhotoUrl(null); setLfpLocation(''); setLfpPlayers(1)
      refreshData('posts')
      closeSheet()
      showSuccess(t('success.posted'))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('error.postFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={closeSheet} title={t('community.newPost')}>
      <div style={{ padding: '16px 20px 20px' }}>
        {/* Mode — same segmented control the Host screen uses, with a shortcut into it.
            Posting and hosting are the two ways to create, so they share one language. */}
        <div style={sectionLabel}>{t('compose.modeLabel')}</div>
        <div className="host-toggle-row" style={{ marginBottom: 18 }}>
          <Pressable className="host-toggle-btn active" aria-pressed={true}>{t('compose.modePost')}</Pressable>
          <Pressable className="host-toggle-btn" aria-pressed={false} onClick={() => {
            // Hosting from inside a community: dismiss BOTH this sheet and the
            // community overlay behind it (otherwise the host screen stays hidden),
            // and pre-target the round to this community.
            const target = sheetData as { communityId?: string; communityName?: string } | null
            closeSheet()
            closeOverlay()
            setHostCommunity(target?.communityId ? { id: target.communityId, name: target.communityName ?? '' } : null)
            setActiveScreen('host')
          }}>⛳ {t('compose.modeRound')}</Pressable>
        </div>

        {/* Post type */}
        <div style={sectionLabel}>{t('compose.typeLabel')}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {POST_TYPES.map(pt => (
            <Pressable key={pt.key} className={`compose-type-pill${postType === pt.key ? ' active' : ''}`} onClick={() => setPostType(pt.key)} aria-pressed={postType === pt.key}>
              <span>{pt.emoji}</span>
              <span>{t(pt.labelKey)}</span>
            </Pressable>
          ))}
        </div>

        {/* Looking-for-Players fields — shown only for the "seeking" type */}
        {isLfp && (
          <div style={{ marginBottom: 16, padding: 14, background: 'var(--primary-soft)', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--primary-ink)', marginBottom: 6 }}>📍 {t('compose.lfpLocationLabel')}</div>
              <input
                type="text"
                value={lfpLocation}
                onChange={e => setLfpLocation(e.target.value)}
                placeholder={t('compose.lfpLocationPlaceholder')}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--line)', borderRadius: 'var(--r-md)', fontSize: 14, background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--primary-ink)' }}>{t('compose.lfpPlayersLabel')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Pressable aria-label="−" onClick={() => setLfpPlayers(n => Math.max(1, n - 1))} style={{ width: 32, height: 32, borderRadius: 'var(--r-sm)', background: 'var(--surface)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'var(--ink)' }}>−</Pressable>
                <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', minWidth: 20, textAlign: 'center' }}>{lfpPlayers}</span>
                <Pressable aria-label="+" onClick={() => setLfpPlayers(n => Math.min(7, n + 1))} style={{ width: 32, height: 32, borderRadius: 'var(--r-sm)', background: 'var(--surface)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'var(--ink)' }}>+</Pressable>
              </div>
            </div>
          </div>
        )}

        {/* Community selector */}
        {communities.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={sectionLabel}>{t('host.postTo')}</div>
            <select
              value={communityId}
              onChange={e => setCommunityId(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--line)', borderRadius: 'var(--r-md)', fontSize: 13, background: 'var(--surface)', color: communityId ? 'var(--ink)' : 'var(--ink-3)', fontFamily: 'var(--sans)', outline: 'none' }}
            >
              <option value="">{t('sheet.compose.postPublicly')}</option>
              {communities.map(c => <option key={c.id} value={c.id}>{t('host.postTo')} {c.name}</option>)}
            </select>
          </div>
        )}

        {/* Photo (prominent, above the text). A <label> opens the native picker
            reliably on mobile — a JS-triggered click on a hidden input is blocked
            by some mobile browsers. */}
        <div style={sectionLabel}>{t('compose.photoLabel')}</div>
        <input id="compose-photo-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhotoPick} style={{ display: 'none' }} />
        {photoUrl ? (
          <div style={{ position: 'relative', marginBottom: 14, borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
            <Pressable onClick={() => setPhotoUrl(null)} aria-label={t('a11y.close')} style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </Pressable>
          </div>
        ) : (
          <label
            htmlFor="compose-photo-input"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 14px', border: '1.5px solid var(--primary)', background: 'var(--primary-soft)', borderRadius: 'var(--r-md)', marginBottom: 14, cursor: uploadingPhoto ? 'default' : 'pointer', color: 'var(--primary-ink)', pointerEvents: uploadingPhoto ? 'none' : 'auto' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{uploadingPhoto ? t('loading.uploading') : t('sheet.compose.addPhoto')}</span>
          </label>
        )}

        {/* Message */}
        <div style={sectionLabel}>{t('compose.messageLabel')}</div>
        <textarea
          className="compose-textarea"
          placeholder={t('community.sharePrompt')}
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={5}
          style={{ marginBottom: 14 }}
        />

        {error && <div style={{ fontSize: 13, color: '#C0392B', marginBottom: 10 }}>{error}</div>}

        <Pressable
          onClick={handleSubmit}
          style={{
            display: 'block',
            background: body.trim() ? 'var(--primary)' : 'var(--bg-alt)',
            borderRadius: 'var(--r-lg)', padding: '14px', textAlign: 'center',
            cursor: body.trim() && !submitting ? 'pointer' : 'default',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: body.trim() ? 'white' : 'var(--ink-3)' }}>
            {submitting ? t('loading.posting') : t('sheet.compose.post')}
          </span>
        </Pressable>
      </div>
    </BottomSheet>
  )
}
