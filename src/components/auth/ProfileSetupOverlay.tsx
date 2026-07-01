'use client'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LanguageContext'
import { api } from '@/lib/api'
import { AuthUser } from '@/types/auth'
import { avatarGradient, getInitial } from '@/lib/utils'
import { Pressable } from '@/components/ui/Pressable'

const ONBOARDED_KEY = 'caddie_onboarded'
// A just-created account (signed up within this window) hasn't seen setup yet.
const NEW_ACCOUNT_MS = 10 * 60 * 1000

// First-run "Set up your bag" — shown once to brand-new accounts over the app,
// after auth completes (AuthOverlay has already unmounted). Always skippable and
// best-effort, so it can never block or trap the post-login path.
export function ProfileSetupOverlay() {
  const { user, updateUser } = useAuth()
  const { t } = useLang()

  const [dismissed, setDismissed] = useState(false)
  const [name, setName] = useState(user?.displayName ?? '')
  const [handicap, setHandicap] = useState(user?.handicapIndex != null ? String(user.handicapIndex) : '')
  const [city, setCity] = useState(user?.locationText ?? '')
  const [plays, setPlays] = useState<string>('mornings')
  const [saving, setSaving] = useState(false)

  if (!user || dismissed) return null
  // Gate: only for a freshly-created account that hasn't been onboarded on this device.
  const onboarded = typeof window !== 'undefined' && localStorage.getItem(ONBOARDED_KEY) === '1'
  const createdMs = user.createdAt ? Date.now() - new Date(user.createdAt).getTime() : Infinity
  const isNew = Number.isFinite(createdMs) && createdMs < NEW_ACCOUNT_MS
  if (onboarded || !isNew) return null

  const close = () => {
    try { localStorage.setItem(ONBOARDED_KEY, '1') } catch {}
    setDismissed(true)
  }

  const start = async () => {
    if (saving) return
    setSaving(true)
    const payload: Record<string, unknown> = {}
    if (name.trim()) payload.displayName = name.trim()
    if (city.trim()) payload.locationText = city.trim()
    const hcp = Number(handicap)
    if (handicap.trim() && Number.isFinite(hcp)) payload.handicapIndex = hcp
    try {
      if (Object.keys(payload).length) {
        const { data } = await api.patch<{ data: AuthUser }>('/users/me', payload)
        updateUser(data)
      }
    } catch {
      // Best-effort: never block entry — they can edit later in Account settings.
    } finally {
      close()
    }
  }

  const PLAYS: { key: string; label: string }[] = [
    { key: 'mornings', label: t('auth.profile.plays.mornings') },
    { key: 'weekends', label: t('auth.profile.plays.weekends') },
    { key: 'twilight', label: t('auth.profile.plays.twilight') },
  ]

  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }
  const fieldStyle: React.CSSProperties = { width: '100%', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 14, fontSize: 15, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--sans)', outline: 'none' }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 210, background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Progress */}
      <div style={{ flexShrink: 0, padding: '52px 26px 0', display: 'flex', gap: 6 }}>
        <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--primary)' }} />
        <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--primary)' }} />
        <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--line)' }} />
      </div>

      <div style={{ padding: '26px 26px 0' }}>
        <div className="serif" style={{ fontSize: 27, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-.02em' }}>{t('auth.profile.title')}</div>
        <div style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 500, marginTop: 10, lineHeight: 1.5 }}>{t('auth.profile.subtitle')}</div>
      </div>

      <div className="scroll-body" style={{ flex: 1, minHeight: 0, padding: '24px 26px 0' }}>
        {/* Avatar + badge */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 92, height: 92, borderRadius: '50%', background: avatarGradient(user.id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 36, fontFamily: 'var(--disp)' }}>
              {getInitial(name || user.displayName)}
            </div>
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: '50%', background: 'var(--primary)', border: '3px solid var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
          </div>
        </div>

        {/* Display name */}
        <div style={{ marginTop: 24 }}>
          <div style={labelStyle}>{t('auth.profile.displayName')}</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t('auth.profile.namePlaceholder')} style={fieldStyle} />
        </div>

        {/* Handicap + Home city */}
        <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>{t('auth.profile.handicap')}</div>
            <input value={handicap} onChange={e => setHandicap(e.target.value)} inputMode="decimal" placeholder="—" style={fieldStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>{t('auth.profile.homeCity')}</div>
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="—" style={fieldStyle} />
          </div>
        </div>

        {/* I usually play */}
        <div style={{ marginTop: 16 }}>
          <div style={labelStyle}>{t('auth.profile.plays')}</div>
          <div className="hscroll" style={{ display: 'flex', gap: 9, overflowX: 'auto' }}>
            {PLAYS.map(p => {
              const active = plays === p.key
              return (
                <Pressable
                  key={p.key}
                  onClick={() => setPlays(p.key)}
                  style={{ flexShrink: 0, padding: '9px 15px', borderRadius: 999, background: active ? 'var(--primary)' : 'var(--surface)', border: active ? '1.5px solid var(--primary)' : '1.5px solid var(--line)', color: active ? '#fff' : 'var(--ink-3)', fontSize: 12.5, fontWeight: active ? 800 : 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {p.label}
                </Pressable>
              )
            })}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ flexShrink: 0, padding: '16px 24px 40px' }}>
        <Pressable onClick={start} aria-disabled={saving} style={{ display: 'block', width: '100%', background: 'var(--primary)', borderRadius: 16, padding: 16, textAlign: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-cta)' }}>
          <span className="serif" style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{t('auth.profile.cta')}</span>
        </Pressable>
        <Pressable className="link" onClick={close} style={{ display: 'block', textAlign: 'center', marginTop: 12, cursor: 'pointer' }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-3)' }}>{t('auth.profile.skip')}</span>
        </Pressable>
      </div>
    </div>
  )
}
