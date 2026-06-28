'use client'
import { useState, useEffect } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LanguageContext'
import { api } from '@/lib/api'
import { AuthUser } from '@/types/auth'
import { BottomSheet } from './BottomSheet'

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

  useEffect(() => {
    if (isOpen && user) {
      setDisplayName(user.displayName || '')
      setLocationText(user.locationText || '')
      setBio(user.bio || '')
      setError(null)
      setSuccess(false)
    }
  }, [isOpen, user])

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
      setError(e instanceof Error ? e.message : 'Failed to save.')
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
        <div>
          <label style={labelStyle}>{t('sheet.account.displayName')}</label>
          <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{t('sheet.account.location')}</label>
          <input type="text" placeholder="e.g. Taoyuan, Taiwan" value={locationText} onChange={e => setLocationText(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Bio</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Tell others about your golf game…"
            rows={3}
            style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
          />
        </div>
        {error && <div style={{ fontSize: 13, color: '#C0392B' }}>{error}</div>}
        {success && <div style={{ fontSize: 13, color: '#2E7D32', fontWeight: 600 }}>Saved!</div>}
        <div
          onClick={handleSave}
          style={{
            background: 'var(--primary)', borderRadius: 'var(--r-lg)', padding: 16,
            textAlign: 'center', cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>
            {saving ? 'Saving…' : t('sheet.account.save')}
          </span>
        </div>
      </div>
    </BottomSheet>
  )
}
