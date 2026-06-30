'use client'
import { useState, useEffect } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LanguageContext'
import { api } from '@/lib/api'
import { Round } from '@/types/round'
import { Announcement } from '@/types/announcement'
import { formatTeeTime, formatDate, formatMoney, formatWeekdayShort, announcementImage } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Pressable } from '@/components/ui/Pressable'
import { Skeleton, RoundCardSkeleton } from '@/components/ui/Skeleton'
import { CancelledBadge } from '@/components/ui/CancelledBadge'
import { RoundCard } from '@/components/screens/RoundsScreen'
import { useMounted } from '@/lib/useMounted'
import { useActivated } from '@/hooks/useActivated'
import { useNotifications } from '@/contexts/NotificationsContext'

type HomeTab = 'rounds' | 'community'

export function HomeScreen() {
  const { activeScreen, setActiveScreen, openOverlayWith, openSheetWith, dataVersion } = useUI()
  const { unreadCount } = useNotifications()
  const { user } = useAuth()
  const { t, lang } = useLang()
  const mounted = useMounted()
  const activated = useActivated('home')

  const [upcoming, setUpcoming] = useState<Round | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [rounds, setRounds] = useState<Round[]>([])
  const [loadingUpcoming, setLoadingUpcoming] = useState(true)
  const [loadingRounds, setLoadingRounds] = useState(true)
  const [activeTab, setActiveTab] = useState<HomeTab>('rounds')

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return t('home.greeting.morning')
    if (h < 17) return t('home.greeting.afternoon')
    return t('home.greeting.evening')
  }

  const dateLabel = () => formatWeekdayShort(new Date())

  useEffect(() => {
    // Don't fetch until logged in (avoids a 401 storm behind the auth overlay).
    if (!user || !activated) return
    let alive = true
    api.get<{ data: Round[] }>('/rounds/upcoming')
      .then(r => { if (alive) setUpcoming(r.data?.[0] ?? null) })
      .catch(() => { if (alive) setUpcoming(null) })
      .finally(() => { if (alive) setLoadingUpcoming(false) })

    api.get<{ data: Announcement[] }>('/announcements')
      .then(r => { if (alive) setAnnouncements(r.data ?? []) })
      .catch(() => { if (alive) setAnnouncements([]) })

    api.get<{ data: Round[] }>('/rounds?limit=4')
      .then(r => { if (alive) setRounds(r.data ?? []) })
      .catch(() => { if (alive) setRounds([]) })
      .finally(() => { if (alive) setLoadingRounds(false) })
    return () => { alive = false }
  }, [user, activated, dataVersion.rounds])

  const acceptedCount = (r: Round) =>
    r.participants?.filter(p => p.role === 'accepted' || p.role === 'host').length ?? 0

  const openSpots = (r: Round) => Math.max(0, r.totalSpots - acceptedCount(r))

  // Golf Team tab shows the same round-card container as Rounds, scoped to
  // community (team) rounds — no posts.
  const teamRounds = rounds.filter(r => r.visibility === 'community').slice(0, 4)

  return (
    <div className={`screen${activeScreen === 'home' ? ' active' : ''}`}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 10px', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 2 }}>
            {mounted ? dateLabel() : ''}
          </div>
          <div className="serif" style={{ fontSize: 21, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.1 }}>
            {mounted ? greeting() : ''}{user ? `, ${user.displayName.split(' ')[0]}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Notifications bell */}
          <Pressable
            aria-label={t('a11y.notifications')}
            style={{ position: 'relative', width: 36, height: 36, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            onClick={() => openSheetWith('notifications')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden stroke="var(--ink-2)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <div style={{ position: 'absolute', top: -3, right: -3, minWidth: 17, height: 17, padding: '0 4px', borderRadius: 9, background: 'var(--primary)', border: '2px solid var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 9.5, fontWeight: 800, color: 'white', lineHeight: 1 }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
              </div>
            )}
          </Pressable>
          {/* Search */}
          <Pressable
            aria-label={t('a11y.search')}
            style={{ width: 36, height: 36, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            onClick={() => setActiveScreen('rounds')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden stroke="var(--ink-2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </Pressable>
          {/* Explore map */}
          <Pressable
            aria-label={t('a11y.map')}
            style={{ width: 36, height: 36, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            onClick={() => openOverlayWith('map')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden stroke="var(--ink-2)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
            </svg>
          </Pressable>
          <Avatar name={user?.displayName} url={user?.avatarUrl} seed={user?.id} size={38} fontSize={14} onClick={() => setActiveScreen('profile')} title={t('common.profile')} />
        </div>
      </div>

      <div className="scroll-body" style={{ paddingBottom: 20 }}>
        {/* Upcoming Round Card */}
        <div style={{ margin: '4px 20px 18px' }}>
          {loadingUpcoming ? (
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--line-soft)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Skeleton w={120} h={11} />
              <Skeleton w="60%" h={17} />
              <Skeleton w="80%" h={12} />
              <Skeleton w="100%" h={42} r="var(--r-md)" style={{ marginTop: 4 }} />
            </div>
          ) : upcoming ? (
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-md)', overflow: 'hidden', border: '1px solid var(--line-soft)' }}>
              <div style={{ height: 4, background: 'linear-gradient(90deg,var(--primary) 0%,var(--sky-deep) 100%)' }} />
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {upcoming.status !== 'cancelled' && <div className="pulse-dot" />}
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{t('home.nextRound')}</span>
                  </div>
                  {upcoming.status === 'cancelled'
                    ? <CancelledBadge />
                    : <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 'var(--r-pill)', background: '#E8F5E9', color: '#2E7D32' }}>{t('home.confirmed')}</span>}
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>{upcoming.course.name}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500, marginBottom: 12 }}>
                  {formatDate(upcoming.date)} · {formatTeeTime(upcoming.teeTime)}
                  {upcoming.course.locationText ? ` · ${upcoming.course.locationText}` : ''}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="ava-stack">
                      {upcoming.participants?.slice(0, 3).map((p, i) => (
                        <Avatar key={p.id} name={p.user?.displayName} url={p.user?.avatarUrl} seed={p.userId} size={30} fontSize={11} style={{ border: '2px solid var(--surface)', marginLeft: i === 0 ? 0 : -8 }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>
                      {acceptedCount(upcoming)} / {upcoming.totalSpots} {t('home.players')} ·{' '}
                      <span style={{ color: 'var(--primary)' }}>{openSpots(upcoming)} {t(openSpots(upcoming) === 1 ? 'home.spotOpen' : 'home.spotsOpen')}</span>
                    </span>
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <Pressable
                    style={{ background: 'var(--primary)', borderRadius: 'var(--r-md)', padding: 11, textAlign: 'center', cursor: 'pointer', width: '100%' }}
                    onClick={() => openOverlayWith('roundDetail', upcoming)}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{t('home.viewRound')}</span>
                  </Pressable>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-md)', overflow: 'hidden', border: '1px solid var(--line-soft)', padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⛳️</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>{t('home.noUpcomingRound')}</div>
              <Pressable
                style={{ background: 'var(--primary)', borderRadius: 'var(--r-md)', padding: '10px 20px', display: 'inline-block', cursor: 'pointer', marginTop: 8 }}
                onClick={() => setActiveScreen('rounds')}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{t('home.findRound')}</span>
              </Pressable>
            </div>
          )}
        </div>

        {/* News — hidden entirely when there are no real announcements (no mock fallback) */}
        {announcements.length > 0 && (<>
        <div className="section-row" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span className="label-xs">{t('home.news')}</span>
          </div>
        </div>
          <div className="hscroll" style={{ marginBottom: 20 }}>
            {announcements.map(ann => (
              <div key={ann.id} onClick={() => openSheetWith('newsDetail', ann)} style={{ width: 152, flexShrink: 0, background: 'var(--surface)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', cursor: 'pointer' }}>
                <div style={{ height: 66, backgroundColor: ann.color2 || 'var(--sky-deep)', backgroundImage: `linear-gradient(180deg,rgba(0,0,0,.28) 0%,rgba(0,0,0,.04) 42%,rgba(0,0,0,.45) 100%),url(${announcementImage(ann, { w: 304, h: 132 })})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', bottom: 6, left: 8 }}>
                    <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 'var(--r-pill)', background: 'rgba(255,255,255,.22)', color: 'white', backdropFilter: 'blur(4px)' }}>
                      {ann.badge}
                    </span>
                  </div>
                  <div style={{ position: 'absolute', top: 6, right: 8, fontSize: 9, color: 'rgba(255,255,255,.7)', fontWeight: 500 }}>
                    {new Date(ann.createdAt).toLocaleDateString(lang === 'zh' ? 'zh-TW' : 'en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div style={{ padding: '9px 11px 11px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 3, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>{ann.title}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--ink-3)', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>{ann.body}</div>
                  <div style={{ marginTop: 7, fontSize: 10.5, fontWeight: 700, color: 'var(--primary)' }}>{t('home.readMore')}</div>
                </div>
              </div>
            ))}
            <div style={{ width: 4, flexShrink: 0 }} />
          </div>
        </>)}

        {/* Tab bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', marginBottom: 10 }}>
          <span className="label-xs">{t('home.discover')}</span>
          <Pressable className="see-all link" style={{ cursor: 'pointer' }} onClick={() => setActiveScreen(activeTab === 'community' ? 'community' : 'rounds')}>{t('home.seeAll')}</Pressable>
        </div>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--line-soft)', margin: '0 20px 14px' }}>
          {(['rounds', 'community'] as HomeTab[]).map(tab => (
            <Pressable
              key={tab}
              className={`home-tab${activeTab === tab ? ' active' : ''}`}
              aria-pressed={activeTab === tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'rounds' ? t('home.tab.rounds') : t('home.tab.community')}
            </Pressable>
          ))}
        </div>

        {/* Rounds pane */}
        {activeTab === 'rounds' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '0 20px 20px' }}>
            {loadingRounds ? (
              <>{[0, 1, 2].map(i => <RoundCardSkeleton key={i} />)}</>
            ) : rounds.slice(0, 4).map(round => (
              <RoundCard key={round.id} round={round} onOpenDetail={() => openOverlayWith('roundDetail', round)} />
            ))}
          </div>
        )}

        {/* Golf Team pane — same round-card container as Rounds, team rounds only */}
        {activeTab === 'community' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '0 20px 20px' }}>
            {loadingRounds ? (
              <>{[0, 1, 2].map(i => <RoundCardSkeleton key={i} />)}</>
            ) : teamRounds.length === 0 ? (
              <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 16, textAlign: 'center', border: '1px solid var(--line-soft)' }}>
                <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{t('home.noTeamRounds')}</div>
              </div>
            ) : teamRounds.map(round => (
              <RoundCard key={round.id} round={round} onOpenDetail={() => openOverlayWith('roundDetail', round)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
