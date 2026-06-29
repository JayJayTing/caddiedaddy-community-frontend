'use client'
import { useState, useEffect } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LanguageContext'
import { api } from '@/lib/api'
import { AuthUser } from '@/types/auth'
import { Avatar } from '@/components/ui/Avatar'
import { BottomSheet } from './BottomSheet'
import { Pressable } from '@/components/ui/Pressable'

export function AccountSheet() {
  const { openSheet, closeSheet } = useUI()
  const { user, updateUser } = useAuth()
  const { t } = useLang()
  const isOpen = openSheet === 'account'

  const [displayName, setDisplayName] = useState('')
  const [locationText, setLocationText] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const { data: updated } = await api.upload<{ data: AuthUser }>('/uploads/avatar', file)
      updateUser(updated)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error.uploadPhotoFailed'))
    } finally {
      setUploading(false)
    }
  }

  // Seed the form only on the open transition. Depending on `user` would re-seed
  // (clobbering in-progress edits) whenever an avatar upload calls updateUser.
  useEffect(() => {
    if (isOpen && user) {
      setDisplayName(user.displayName || '')
      setLocationText(user.locationText || '')
      setBio(user.bio || '')
      setError(null)
      setSuccess(false)
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!displayName.trim() || saving) return
    setError(null)
    setSaving(true)
    try {
      const { data: updated } = await api.patch<{ data: AuthUser }>('/users/me', {
        displayName: displayName.trim(),
        locationText: locationText.trim() || null,
        bio: bio.trim() || null,
      })
      updateUser(updated)
      setSuccess(true)
      setTimeout(closeSheet, 800)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('error.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', border: '1.5px solid var(--line)',
    borderRadius: 'var(--r-md)', fontSize: 15, background: 'var(--surface)',
    color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase',
    color: 'var(--ink-3)', marginBottom: 6, display: 'block',
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={closeSheet} title={t('sheet.account.title')}>
      <div style={{ padding: '16px 20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <label htmlFor="account-avatar-input" style={{ position: 'relative', cursor: uploading ? 'default' : 'pointer', pointerEvents: uploading ? 'none' : 'auto' }}>
            <Avatar name={user?.displayName} url={user?.avatarUrl} seed={user?.id} size={84} fontSize={32} style={{ opacity: uploading ? 0.5 : 1 }} />
            <div style={{ position: 'absolute', right: -2, bottom: -2, width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', border: '2px solid var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
          </label>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)' }}>{uploading ? t('loading.uploading') : t('sheet.account.changePhoto')}</span>
          <input id="account-avatar-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleAvatarPick} style={{ display: 'none' }} />
        </div>
        <div>
          <label style={labelStyle}>{t('sheet.account.displayName')}</label>
          <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{t('sheet.account.location')}</label>
          <input type="text" placeholder={t('sheet.account.locationPlaceholder')} value={locationText} onChange={e => setLocationText(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{t('sheet.account.bio')}</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder={t('sheet.account.bioPlaceholder')}
            rows={3}
            style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
          />
        </div>
        {error && <div style={{ fontSize: 13, color: '#C0392B' }}>{error}</div>}
        {success && <div style={{ fontSize: 13, color: '#2E7D32', fontWeight: 600 }}>{t('success.saved')}</div>}
        <Pressable
          onClick={handleSave}
          style={{
            background: 'var(--primary)', borderRadius: 'var(--r-lg)', padding: 16,
            textAlign: 'center', cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>
            {saving ? t('loading.saving') : t('sheet.account.save')}
          </span>
        </Pressable>
      </div>
    </BottomSheet>
  )
}
