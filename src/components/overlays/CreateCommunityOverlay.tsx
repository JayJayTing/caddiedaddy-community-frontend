'use client'
import { useState } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useLang } from '@/contexts/LanguageContext'
import { api } from '@/lib/api'
import { Community, CommunityType, CommunityPrivacy } from '@/types/community'
import type { TranslationKey } from '@/lib/translations'

export function CreateCommunityOverlay() {
  const { openOverlay, closeOverlay, refreshData, showSuccess } = useUI()
  const { t } = useLang()
  const isOpen = openOverlay === 'createCommunity'

  const [name, setName] = useState('')
  const [type, setType] = useState<CommunityType>('mixed')
  const [privacy, setPrivacy] = useState<CommunityPrivacy>('public')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }
  const clearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  const TYPES: Array<{ key: CommunityType; label: TranslationKey }> = [
    { key: 'mixed', label: 'community.type.mixed' },
    { key: 'mens_club', label: 'community.type.mensClub' },
    { key: 'ladies_club', label: 'community.type.ladiesClub' },
    { key: 'corporate', label: 'community.type.corporate' },
    { key: 'beginner', label: 'community.type.beginnerFriendly' },
  ]

  const PRIVACIES: Array<{ key: CommunityPrivacy; label: TranslationKey; desc: TranslationKey }> = [
    { key: 'public', label: 'community.privacy.public', desc: 'community.privacy.publicDesc' },
    { key: 'invite_only', label: 'community.privacy.inviteOnly', desc: 'community.privacy.inviteOnlyDesc' },
    { key: 'private', label: 'community.privacy.private', desc: 'community.privacy.privateDesc' },
  ]

  const handleSubmit = async () => {
    if (!name.trim() || submitting) return
    setError(null)
    setSubmitting(true)
    try {
      const { data: created } = await api.post<{ data: Community }>('/communities', { name: name.trim(), type, privacy, description: description || null })
      // Community exists now (creator = admin), so attach the cover photo to it.
      if (photoFile && created?.id) {
        try { await api.upload(`/uploads/community/${created.id}`, photoFile) } catch { /* community created; art can be added later */ }
      }
      setName(''); setDescription(''); setType('mixed'); setPrivacy('public'); clearPhoto()
      refreshData('communities')
      closeOverlay()
      showSuccess(t('success.communityCreated'))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('community.create.error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`detail-overlay${isOpen ? ' open' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', flexShrink: 0, borderBottom: '1px solid var(--line-soft)' }}>
        <div style={{ width: 36, height: 36, background: 'var(--bg-alt)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={closeOverlay}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </div>
        <span style={{ marginLeft: 12, fontSize: 18, fontWeight: 600, fontFamily: 'var(--serif)', color: 'var(--ink)' }}>{t('community.create.title')}</span>
      </div>

      <div className="scroll-body" style={{ padding: '20px 20px 100px' }}>
        {/* Cover photo */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>{t('community.create.coverPhoto')}</div>
          <input id="create-cover-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={pickPhoto} style={{ display: 'none' }} />
          {photoPreview ? (
            <label
              htmlFor="create-cover-input"
              style={{ display: 'block', position: 'relative', height: 130, borderRadius: 'var(--r-lg)', overflow: 'hidden', cursor: 'pointer', backgroundImage: `url("${photoPreview}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
              <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); clearPhoto() }} style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
              <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 11, fontWeight: 700, color: 'white', textShadow: '0 1px 4px rgba(0,0,0,.5)' }}>{t('community.create.tapToChange')}</div>
            </label>
          ) : (
            <label
              htmlFor="create-cover-input"
              style={{ height: 130, border: '1.5px dashed var(--line)', borderRadius: 'var(--r-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', color: 'var(--ink-3)' }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{t('community.create.addCoverPhoto')}</span>
            </label>
          )}
        </div>

        {/* Name */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>{t('community.create.nameLabel')}</div>
          <input
            type="text"
            placeholder={t('community.create.namePlaceholder')}
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ width: '100%', padding: '14px 16px', border: '1.5px solid var(--line)', borderRadius: 'var(--r-lg)', fontSize: 15, background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none' }}
          />
        </div>

        {/* Type */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>{t('community.create.typeLabel')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {TYPES.map(t2 => (
              <div key={t2.key} className={`filter-pill${type === t2.key ? ' active' : ''}`} onClick={() => setType(t2.key)}>
                {t(t2.label)}
              </div>
            ))}
          </div>
        </div>

        {/* Privacy */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>{t('community.create.privacyLabel')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PRIVACIES.map(p => (
              <div
                key={p.key}
                style={{ background: 'var(--surface)', border: `1.5px solid ${privacy === p.key ? 'var(--primary)' : 'var(--line)'}`, borderRadius: 'var(--r-md)', padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'border-color .15s' }}
                onClick={() => setPrivacy(p.key)}
              >
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${privacy === p.key ? 'var(--primary)' : 'var(--line)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {privacy === p.key && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }} />}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{t(p.label)}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{t(p.desc)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>{t('community.create.descLabel')}</div>
          <textarea
            placeholder={t('community.create.descPlaceholder')}
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            style={{ width: '100%', padding: '12px 16px', border: '1.5px solid var(--line)', borderRadius: 'var(--r-lg)', fontSize: 14, background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', resize: 'none', lineHeight: 1.5 }}
          />
        </div>

        {error && <div style={{ fontSize: 13, color: '#C0392B', textAlign: 'center', marginBottom: 12 }}>{error}</div>}
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 20px 24px', background: 'linear-gradient(transparent,var(--bg) 40%)' }}>
        <div
          onClick={handleSubmit}
          style={{
            background: name.trim() ? 'var(--primary)' : 'var(--bg-alt)',
            borderRadius: 'var(--r-lg)', padding: 18, textAlign: 'center',
            cursor: name.trim() && !submitting ? 'pointer' : 'default',
            boxShadow: name.trim() ? '0 4px 20px rgba(92,122,154,.35)' : 'none',
            transition: 'background .15s',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: name.trim() ? 'white' : 'var(--ink-3)' }}>
            {submitting ? t('community.create.submitting') : t('community.create.submit')}
          </span>
        </div>
      </div>
    </div>
  )
}
