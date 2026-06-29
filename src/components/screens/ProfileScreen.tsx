'use client'
import { useState, useEffect } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LanguageContext'
import { api } from '@/lib/api'
import { Round } from '@/types/round'
import { avatarColor, getInitial, formatDate, formatTeeTime, formatHandicap, formatMoney } from '@/lib/utils'
import { creditsApi } from '@/lib/credits'

export function ProfileScreen() {
  const { activeScreen, openSheetWith, dataVersion } = useUI()
  const { user, logout } = useAuth()
  const { t, lang, toggleLang } = useLang()
  const [recentRounds, setRecentRounds] = useState<Round[]>([])
  const [stats, setStats] = useState<{ roundsCount: number; followingCount: number } | null>(null)
  const [creditBalance, setCreditBalance] = useState<number | null>(null)

  useEffect(() => {
    if (!user) return
    api.get<{ data: { roundsCount: number; followingCount: number } }>(`/users/${user.id}/stats`)
      .then(r => setStats(r.data ?? null))
      .catch(() => setStats(null))
    // Show finished rounds (history) when there are any; otherwise the upcoming schedule.
    api.get<{ data: Round[] }>(`/users/${user.id}/rounds?when=past&limit=3`)
      .then(r => {
        if (r.data && r.data.length) { setRecentRounds(r.data); return }
        return api.get<{ data: Round[] }>(`/users/${user.id}/rounds?when=upcoming&limit=3`)
          .then(r2 => setRecentRounds(r2.data ?? []))
      })
      .catch(() => setRecentRounds([]))
  }, [user])

  // Credit balance — re-pull when credits change (purchase, booking, refund).
  useEffect(() => {
    if (!user) return
    creditsApi.getWallet()
      .then(w => setCreditBalance(w.balanceCents))
      .catch(() => setCreditBalance(null))
  }, [user, dataVersion.credits])

  const handleSignOut = async () => {
    await logout()
  }

  const gradient = user ? `linear-gradient(135deg,${avatarColor(user.id)},var(--primary))` : 'linear-gradient(135deg,var(--peach),var(--primary))'

  const settingsRows = [
    { icon: '👤', label: t('profile.account'), action: () => openSheetWith('account') },
    { icon: '🏌️', label: t('profile.handicapIndex'), action: () => openSheetWith('handicap') },
    { icon: '🔔', label: t('profile.notifications'), action: () => openSheetWith('notifications') },
  ]

  return (
    <div className={`screen${activeScreen === 'profile' ? ' active' : ''}`}>
      <div className="scroll-body">
        {/* Hero */}
        <div style={{ background: gradient, padding: '48px 20px 24px', position: 'relative', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div
              className="avatar"
              style={{
                width: 72, height: 72, fontSize: 28, color: 'white', border: '3px solid rgba(255,255,255,.4)',
                ...(user?.avatarUrl
                  ? { backgroundImage: `url(${user.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : { background: 'rgba(255,255,255,.25)' }),
              }}
            >
              {user?.avatarUrl ? '' : (user ? getInitial(user.displayName) : '?')}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, color: 'white', marginBottom: 2 }}>{user?.displayName ?? 'Loading…'}</div>
              {user?.locationText && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', marginBottom: 2 }}>📍 {user.locationText}</div>
              )}
              {user?.bio && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', maxWidth: 240, lineHeight: 1.5, margin: '4px auto 0' }}>{user.bio}</div>
              )}
              {user?.memberSince && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', marginTop: 4 }}>{t('profile.memberSince')} {new Date(user.memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
              )}
            </div>
            <div
              style={{ background: 'rgba(255,255,255,.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 'var(--r-pill)', padding: '8px 18px', cursor: 'pointer' }}
              onClick={() => openSheetWith('account')}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{t('profile.editProfile')}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', background: 'var(--surface)', borderBottom: '1px solid var(--line-soft)' }}>
          <div className="profile-stat">
            <div className="profile-stat-num">{stats ? stats.roundsCount : '—'}</div>
            <div className="profile-stat-label">{t('profile.stat.rounds')}</div>
          </div>
          <div style={{ width: 1, background: 'var(--line-soft)', margin: '12px 0' }} />
          <div className="profile-stat">
            <div className="profile-stat-num">{formatHandicap(user?.handicapIndex)}</div>
            <div className="profile-stat-label">{t('profile.stat.hcp')}</div>
          </div>
          <div style={{ width: 1, background: 'var(--line-soft)', margin: '12px 0' }} />
          <div className="profile-stat">
            <div className="profile-stat-num">{stats ? stats.followingCount : '—'}</div>
            <div className="profile-stat-label">{t('profile.stat.following')}</div>
          </div>
        </div>

        {/* Credits wallet */}
        <div style={{ margin: '18px 20px 0' }}>
          <div
            onClick={() => openSheetWith('wallet')}
            style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'linear-gradient(135deg,#3A6080,#5C7A9A)', borderRadius: 'var(--r-lg)', padding: '16px 18px', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}
          >
            <div style={{ width: 42, height: 42, borderRadius: 'var(--r-md)', background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>💳</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{t('profile.credits')}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)' }}>{t('profile.creditsSub')}</div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>{creditBalance != null ? formatMoney(creditBalance) : '—'}</div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>

        {/* Recent rounds */}
        <div style={{ padding: '18px 20px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 12 }}>
            {t('profile.recentRounds')}
          </div>
          {recentRounds.length === 0 ? (
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 16, textAlign: 'center', border: '1px solid var(--line-soft)' }}>
              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>No recent rounds yet</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentRounds.map(r => (
                <div key={r.id} style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: '12px 14px', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--r-md)', background: `linear-gradient(135deg,${r.color1 ?? '#B8CBE0'},${r.color2 ?? '#5C7A9A'})`, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{r.course.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{formatDate(r.date)} · {formatTeeTime(r.teeTime)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <div style={{ margin: '20px 20px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>
            {t('profile.settings')}
          </div>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            {settingsRows.map((row, i) => (
              <div
                key={row.label}
                className="mod-row"
                onClick={row.action}
                style={{ borderBottom: i < settingsRows.length - 1 ? '1px solid var(--line-soft)' : 'none' }}
              >
                <span style={{ fontSize: 18 }}>{row.icon}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{row.label}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            ))}
            {/* Language — toggles inline (moved here from the floating button) */}
            <div className="mod-row" onClick={toggleLang} style={{ borderTop: '1px solid var(--line-soft)' }}>
              <span style={{ fontSize: 18 }}>🌐</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{t('profile.language')}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>{lang === 'zh' ? '中文' : 'English'}</span>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <div style={{ margin: '14px 20px 32px' }}>
          <div
            style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 16, textAlign: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--line-soft)' }}
            onClick={handleSignOut}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: '#C0392B' }}>{t('profile.signOut')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
