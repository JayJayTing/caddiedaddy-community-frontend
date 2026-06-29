'use client'
import { useState, useEffect } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LanguageContext'
import { api } from '@/lib/api'
import { AuthUser } from '@/types/auth'
import { BottomSheet } from './BottomSheet'

export function HandicapSheet() {
  const { openSheet, closeSheet } = useUI()
  const { user, updateUser } = useAuth()
  const { t } = useLang()
  const isOpen = openSheet === 'handicap'

  const [handicap, setHandicap] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isOpen && user) {
      setHandicap(user.handicapIndex != null ? String(user.handicapIndex) : '')
      setError(null)
      setSuccess(false)
    }
  }, [isOpen, user])

  const handleSave = async () => {
    if (saving) return
    const val = parseFloat(handicap)
    if (isNaN(val) || val < 0 || val > 54) { setError(t('error.handicapRange')); return }
    setError(null)
    setSaving(true)
    try {
      const { data: updated } = await api.patch<{ data: AuthUser }>('/users/me', { handicapIndex: val })
      updateUser(updated)
      setSuccess(true)
      setTimeout(closeSheet, 800)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('error.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={closeSheet} title={t('sheet.hcp.title')}>
      <div style={{ padding: '16px 20px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 48, fontWeight: 500, color: 'var(--ink)', lineHeight: 1 }}>
            {handicap || '—'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>{t('sheet.hcp.current')}</div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>{t('sheet.hcp.updateLabel')}</div>
          <input
            type="number"
            inputMode="decimal"
            placeholder={t('sheet.hcp.inputPlaceholder')}
            value={handicap}
            onChange={e => setHandicap(e.target.value)}
            min={0} max={54} step={0.1}
            style={{ width: '100%', padding: '14px 16px', border: '1.5px solid var(--line)', borderRadius: 'var(--r-lg)', fontSize: 20, fontWeight: 600, background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none', textAlign: 'center' }}
          />
        </div>

        {error && <div style={{ fontSize: 13, color: '#C0392B', marginBottom: 12, textAlign: 'center' }}>{error}</div>}
        {success && <div style={{ fontSize: 13, color: '#2E7D32', fontWeight: 600, marginBottom: 12, textAlign: 'center' }}>{t('success.saved')}</div>}

        <div
          onClick={handleSave}
          style={{ background: 'var(--primary)', borderRadius: 'var(--r-lg)', padding: 16, textAlign: 'center', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{saving ? t('loading.saving') : t('sheet.hcp.save')}</span>
        </div>
      </div>
    </BottomSheet>
  )
}
