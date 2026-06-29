'use client'
import { useState, useEffect } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LanguageContext'
import { api } from '@/lib/api'
import { Round } from '@/types/round'
import { avatarColor, getInitial, formatDate, formatTeeTime, formatHandicap, formatMonthYear } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'
import { Pressable } from '@/components/ui/Pressable'
import { useActivated } from '@/hooks/useActivated'

export function ProfileScreen() {
  const { activeScreen, openSheetWith } = useUI()
  const { user, logout } = useAuth()
  const { t } = useLang()
  const activated = useActivated('profile')
  const [recentRounds, setRecentRounds] = useState<Round[]>([])
  const [stats, setStats] = useState<{ roundsCount: number; followingCount: number } | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [recentLoading, setRecentLoading] = useState(true)

  useEffect(() => {
    if (!user || !activated) return
    let alive = true
    api.get<{ data: { roundsCount: number; followingCount: number } }>(`/users/${user.id}/stats`)
      .then(r => { if (alive) setStats(r.data ?? null) })
      .catch(() => { if (alive) setStats(null) })
      .finally(() => { if (alive) setStatsLoading(false) })
    // Show finished rounds (history) when there are any; otherwise the upcoming schedule.
    api.get<{ data: Round[] }>(`/users/${user.id}/rounds?when=past&limit=3`)
      .then(r => {
        if (r.data && r.data.length) { if (alive) setRecentRounds(r.data); return }
        return api.get<{ data: Round[] }>(`/users/${user.id}/rounds?when=upcoming&limit=3`)
          .then(r2 => { if (alive) setRecentRounds(r2.data ?? []) })
      })
      .catch(() => { if (alive) setRecentRounds([]) })
      .finally(() => { if (alive) setRecentLoading(false) })
    return () => { alive = false }
  }, [user, activated])

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
              <h1 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, color: 'white', marginBottom: 2 }}>{user?.displayName ?? t('loading')}</h1>
              {user?.locationText && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', marginBottom: 2 }}>📍 {user.locationText}</div>
              )}
              {user?.bio && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', maxWidth: 240, lineHeight: 1.5, margin: '4px auto 0' }}>{user.bio}</div>
              )}
              {user?.memberSince && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', marginTop: 4 }}>{t('profile.memberSince')} {formatMonthYear(new Date(user.memberSince))}</div>
              )}
            </div>
            <Pressable
              style={{ background: 'rgba(255,255,255,.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 'var(--r-pill)', padding: '8px 18px', cursor: 'pointer' }}
              onClick={() => openSheetWith('account')}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{t('profile.editProfile')}</span>
            </Pressable>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', background: 'var(--surface)', borderBottom: '1px solid var(--line-soft)' }}>
          <div className="profile-stat">
            <div className="profile-stat-num">{statsLoading ? <Skeleton w={30} h={22} r={6} style={{ margin: '0 auto' }} /> : (stats ? stats.roundsCount : '—')}</div>
            <div className="profile-stat-label">{t('profile.stat.rounds')}</div>
          </div>
          <div style={{ width: 1, background: 'var(--line-soft)', margin: '12px 0' }} />
          <div className="profile-stat">
            <div className="profile-stat-num">{formatHandicap(user?.handicapIndex)}</div>
            <div className="profile-stat-label">{t('profile.stat.hcp')}</div>
          </div>
          <div style={{ width: 1, background: 'var(--line-soft)', margin: '12px 0' }} />
          <div className="profile-stat">
            <div className="profile-stat-num">{statsLoading ? <Skeleton w={30} h={22} r={6} style={{ margin: '0 auto' }} /> : (stats ? stats.followingCount : '—')}</div>
            <div className="profile-stat-label">{t('profile.stat.following')}</div>
          </div>
        </div>

        {/* Recent rounds */}
        <div style={{ padding: '18px 20px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 12 }}>
            {t('profile.recentRounds')}
          </div>
          {recentLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[0, 1].map(i => (
                <div key={i} style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: '12px 14px', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Skeleton w={40} h={40} r="var(--r-md)" />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Skeleton w="55%" h={13} />
                    <Skeleton w="40%" h={11} />
                  </div>
                </div>
              ))}
            </div>
          ) : recentRounds.length === 0 ? (
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 16, textAlign: 'center', border: '1px solid var(--line-soft)' }}>
              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{t('profile.noRecentRounds')}</div>
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
              <Pressable
                key={row.label}
                className="mod-row"
                onClick={row.action}
                style={{ borderBottom: i < settingsRows.length - 1 ? '1px solid var(--line-soft)' : 'none' }}
              >
                <span style={{ fontSize: 18 }}>{row.icon}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{row.label}</span>
                <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Pressable>
            ))}
          </div>
        </div>

        {/* Sign out */}
        <div style={{ margin: '14px 20px 32px' }}>
          <Pressable
            style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 16, textAlign: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--line-soft)', display: 'block', width: '100%' }}
            onClick={handleSignOut}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: '#C0392B' }}>{t('profile.signOut')}</span>
          </Pressable>
        </div>
      </div>
    </div>
  )
}
