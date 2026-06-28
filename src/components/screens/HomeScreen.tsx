'use client'
import { useState, useEffect } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LanguageContext'
import { api } from '@/lib/api'
import { Round } from '@/types/round'
import { Post } from '@/types/post'
import { Announcement } from '@/types/announcement'
import { avatarColor, getInitial, formatTeeTime, formatDate, formatMoney, formatFormat, formatHcpReq, timeAgo } from '@/lib/utils'
import { useMounted } from '@/lib/useMounted'
import { useNotifications } from '@/contexts/NotificationsContext'

type HomeTab = 'rounds' | 'teetimes' | 'community'

export function HomeScreen() {
  const { activeScreen, setActiveScreen, openOverlayWith, openSheetWith, dataVersion } = useUI()
  const { unreadCount } = useNotifications()
  const { user } = useAuth()
  const { t } = useLang()
  const mounted = useMounted()

  const [upcoming, setUpcoming] = useState<Round | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [rounds, setRounds] = useState<Round[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loadingUpcoming, setLoadingUpcoming] = useState(true)
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true)
  const [loadingRounds, setLoadingRounds] = useState(true)
  const [activeTab, setActiveTab] = useState<HomeTab>('rounds')
  const [expandedRound, setExpandedRound] = useState<string | null>(null)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return t('home.greeting.morning')
    if (h < 17) return t('home.greeting.afternoon')
    return t('home.greeting.evening')
  }

  const dateLabel = () => {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  }

  useEffect(() => {
    api.get<{ data: Round[] }>('/rounds/upcoming')
      .then(r => setUpcoming(r.data?.[0] ?? null))
      .catch(() => setUpcoming(null))
      .finally(() => setLoadingUpcoming(false))

    api.get<{ data: Announcement[] }>('/announcements')
      .then(r => setAnnouncements(r.data ?? []))
      .catch(() => setAnnouncements([]))
      .finally(() => setLoadingAnnouncements(false))

    api.get<{ data: Round[] }>('/rounds?limit=4')
      .then(r => setRounds(r.data ?? []))
      .catch(() => setRounds([]))
      .finally(() => setLoadingRounds(false))

    api.get<{ data: Post[] }>('/posts?scope=discover&limit=3')
      .then(r => setPosts(r.data ?? []))
      .catch(() => setPosts([]))
  }, [dataVersion.rounds, dataVersion.posts])

  const acceptedCount = (r: Round) =>
    r.participants?.filter(p => p.role === 'accepted' || p.role === 'host').length ?? 0

  const openSpots = (r: Round) => Math.max(0, r.totalSpots - acceptedCount(r))

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
          <div
            style={{ position: 'relative', width: 36, height: 36, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            onClick={() => openSheetWith('notifications')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <div style={{ position: 'absolute', top: -3, right: -3, minWidth: 17, height: 17, padding: '0 4px', borderRadius: 9, background: 'var(--primary)', border: '2px solid var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 9.5, fontWeight: 800, color: 'white', lineHeight: 1 }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
              </div>
            )}
          </div>
          {/* Search */}
          <div
            style={{ width: 36, height: 36, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            onClick={() => setActiveScreen('rounds')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <div
            className="avatar"
            style={{ width: 38, height: 38, fontSize: 14, background: user ? avatarColor(user.id) : 'var(--peach)', cursor: 'pointer' }}
            onClick={() => setActiveScreen('profile')}
          >
            {user ? getInitial(user.displayName) : '?'}
          </div>
        </div>
      </div>

      <div className="scroll-body" style={{ paddingBottom: 20 }}>
        {/* Upcoming Round Card */}
        <div style={{ margin: '4px 20px 18px' }}>
          {loadingUpcoming ? (
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', padding: 20, textAlign: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{t('loading')}</span>
            </div>
          ) : upcoming ? (
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-md)', overflow: 'hidden', border: '1px solid var(--line-soft)' }}>
              <div style={{ height: 4, background: 'linear-gradient(90deg,var(--primary) 0%,var(--sky-deep) 100%)' }} />
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="pulse-dot" />
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{t('home.nextRound')}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 'var(--r-pill)', background: '#E8F5E9', color: '#2E7D32' }}>{t('home.confirmed')}</span>
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>{upcoming.course.name}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500, marginBottom: 12 }}>
                  {formatDate(upcoming.date)} · {formatTeeTime(upcoming.teeTime)}
                  {upcoming.course.locationText ? ` · ${upcoming.course.locationText}` : ''}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="ava-stack">
                      {upcoming.participants.slice(0, 3).map((p, i) => (
                        <div key={p.id} className="avatar" style={{ width: 30, height: 30, fontSize: 11, background: avatarColor(p.userId), border: '2px solid var(--surface)', marginLeft: i === 0 ? 0 : -8 }}>
                          {p.user ? getInitial(p.user.displayName) : '?'}
                        </div>
                      ))}
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>
                      {acceptedCount(upcoming)} / {upcoming.totalSpots} {t('home.players')} ·{' '}
                      <span style={{ color: 'var(--primary)' }}>{openSpots(upcoming)} {t(openSpots(upcoming) === 1 ? 'home.spotOpen' : 'home.spotsOpen')}</span>
                    </span>
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <div
                    style={{ background: 'var(--primary)', borderRadius: 'var(--r-md)', padding: 11, textAlign: 'center', cursor: 'pointer' }}
                    onClick={() => openOverlayWith('roundDetail', upcoming)}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{t('home.viewRound')}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-md)', overflow: 'hidden', border: '1px solid var(--line-soft)', padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⛳️</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>{t('home.noUpcomingRound')}</div>
              <div
                style={{ background: 'var(--primary)', borderRadius: 'var(--r-md)', padding: '10px 20px', display: 'inline-block', cursor: 'pointer', marginTop: 8 }}
                onClick={() => setActiveScreen('rounds')}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{t('home.findRound')}</span>
              </div>
            </div>
          )}
        </div>

        {/* News */}
        <div className="section-row" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span className="label-xs">{t('home.news')}</span>
          </div>
        </div>
        {loadingAnnouncements ? null : (
          <div className="hscroll" style={{ marginBottom: 20 }}>
            {(announcements.length > 0 ? announcements : MOCK_ANNOUNCEMENTS).map(ann => (
              <div key={ann.id} onClick={() => openSheetWith('newsDetail', ann)} style={{ width: 220, flexShrink: 0, background: 'var(--surface)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', cursor: 'pointer' }}>
                <div style={{ height: 110, background: `linear-gradient(135deg,${ann.color1} 0%,${ann.color2} 100%)`, position: 'relative', overflow: 'hidden' }}>
                  <svg viewBox="0 0 220 110" fill="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                    <path d="M0 75 Q55 55 110 68 Q165 80 224 62 L224 114 L0 114 Z" fill="rgba(255,255,255,.12)"/>
                    <path d="M0 90 Q45 80 110 86 Q175 92 224 80 L224 114 L0 114 Z" fill="rgba(255,255,255,.08)"/>
                  </svg>
                  <div style={{ position: 'absolute', bottom: 8, left: 10 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 'var(--r-pill)', background: 'rgba(255,255,255,.22)', color: 'white', backdropFilter: 'blur(4px)' }}>
                      {ann.badge}
                    </span>
                  </div>
                  <div style={{ position: 'absolute', top: 8, right: 10, fontSize: 10, color: 'rgba(255,255,255,.7)', fontWeight: 500 }}>
                    {new Date(ann.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div style={{ padding: '11px 13px 13px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 4, lineHeight: 1.3 }}>{ann.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>{ann.body}</div>
                  <div style={{ marginTop: 9, fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>{t('home.readMore')}</div>
                </div>
              </div>
            ))}
            <div style={{ width: 4, flexShrink: 0 }} />
          </div>
        )}

        {/* Tab bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', marginBottom: 10 }}>
          <span className="label-xs">{t('home.discover')}</span>
          <span className="see-all" style={{ cursor: 'pointer' }} onClick={() => setActiveScreen(activeTab === 'community' ? 'community' : 'rounds')}>{t('home.seeAll')}</span>
        </div>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--line-soft)', margin: '0 20px 14px' }}>
          {(['rounds', 'teetimes', 'community'] as HomeTab[]).map(tab => (
            <div
              key={tab}
              className={`home-tab${activeTab === tab ? ' active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'rounds' ? t('home.tab.rounds') : tab === 'teetimes' ? t('home.tab.teeTimes') : t('home.tab.community')}
            </div>
          ))}
        </div>

        {/* Rounds pane */}
        {activeTab === 'rounds' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '0 20px 20px' }}>
            {loadingRounds ? (
              <div style={{ textAlign: 'center', padding: 20 }}><span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{t('loading.rounds')}</span></div>
            ) : rounds.slice(0, 4).map(round => (
              <RoundCard key={round.id} round={round} expanded={expandedRound === round.id} onToggle={() => setExpandedRound(expandedRound === round.id ? null : round.id)} onOpenDetail={() => openOverlayWith('roundDetail', round)} />
            ))}
          </div>
        )}

        {/* Tee times pane */}
        {activeTab === 'teetimes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '0 20px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>
              Tee Times Near You
            </div>
            {loadingRounds ? null : rounds.slice(0, 3).map((round, idx) => {
              const colors = [['var(--butter)', 'var(--butter-deep)'], ['var(--sage)', 'var(--sage-deep)'], ['var(--lilac)', 'var(--lilac-deep)']]
              const [c1, c2] = colors[idx % 3]
              return (
                <div key={round.id} style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', background: `linear-gradient(135deg,${c1},${c2})`, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 1 }}>{round.course.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}>{formatDate(round.date)} · {formatTeeTime(round.teeTime)} · {formatMoney(round.greenFeeCents)}</div>
                  </div>
                  <div style={{ background: 'var(--bg-alt)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '7px 12px', cursor: 'pointer', flexShrink: 0 }} onClick={() => openOverlayWith('roundDetail', round)}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>Join</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Community pane */}
        {activeTab === 'community' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '0 20px 16px' }}>
            {posts.map(post => (
              <MiniPostCard key={post.id} post={post} onClick={() => setActiveScreen('community')} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Round card for home screen
function RoundCard({ round, expanded, onToggle, onOpenDetail }: { round: Round; expanded: boolean; onToggle: () => void; onOpenDetail: () => void }) {
  const { t } = useLang()
  const { user } = useAuth()
  const { refreshData, showSuccess } = useUI()
  const [joined, setJoined] = useState(false)
  const [joining, setJoining] = useState(false)

  const openSpots = Math.max(0, round.totalSpots - (round.participants?.filter(p => p.role === 'accepted' || p.role === 'host').length ?? 0))
  const c1 = round.color1 ?? '#B8CBE0'
  const c2 = round.color2 ?? '#5C7A9A'

  const userParticipant = user && round.participants?.find(p => p.userId === user.id)
  const hasRequested = userParticipant?.role === 'requested' || joined
  const isHost = userParticipant?.role === 'host'

  const handleJoin = async () => {
    if (joining || hasRequested || isHost) return
    setJoining(true)
    try {
      await api.post(`/rounds/${round.id}/join`)
      setJoined(true)
      refreshData('rounds')
      showSuccess(t('success.requestSent'))
    } catch {}
    setJoining(false)
  }

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', cursor: 'pointer' }} onClick={onToggle}>
        <div style={{ width: 80, flexShrink: 0, background: `linear-gradient(135deg,${c1},${c2})`, position: 'relative', overflow: 'hidden', minHeight: 80 }}>
          <svg viewBox="0 0 80 100" fill="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <path d="M-2 66 Q20 50 40 58 Q60 66 82 54 L82 104 L-2 104 Z" fill="rgba(255,255,255,.2)"/>
            <line x1="56" y1="52" x2="56" y2="28" stroke="rgba(255,255,255,.7)" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M56 28 L68 34 L56 40 Z" fill="rgba(255,255,255,.85)"/>
          </svg>
        </div>
        <div style={{ flex: 1, padding: '13px 13px 13px 11px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 5 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2 }}>{round.course.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <span style={{ padding: '3px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: openSpots > 0 ? '#E8F5E9' : 'var(--bg-alt)', color: openSpots > 0 ? '#2E7D32' : 'var(--ink-3)' }}>
                {openSpots > 0 ? `${openSpots} ${t('rounds.open')}` : 'Full'}
              </span>
              <svg className={`round-card-chevron${expanded ? ' open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500, marginBottom: 8 }}>
            {formatTeeTime(round.teeTime)} · {formatFormat(round.format)} · {round.holes}h · {formatHcpReq(round.handicapRequirement)} · {formatMoney(round.greenFeeCents)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex' }}>
              {round.participants?.slice(0, 3).map((p, i) => (
                <div key={p.id} className="avatar" style={{ width: 24, height: 24, fontSize: 9, background: avatarColor(p.userId), border: '2px solid var(--surface)', marginLeft: i === 0 ? 0 : -8 }}>
                  {p.user ? getInitial(p.user.displayName) : '?'}
                </div>
              ))}
            </div>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{round.hostUser.displayName} {t('home.hosting')}</span>
          </div>
        </div>
      </div>
      <div className={`round-card-expand${expanded ? ' open' : ''}`}>
        <div style={{ borderTop: '1px solid var(--line-soft)', padding: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {[
              [t('rounds.teeTime'), formatTeeTime(round.teeTime)],
              [t('rounds.format'), formatFormat(round.format)],
              [t('rounds.holes'), `${round.holes} holes`],
              [t('rounds.greenFee'), formatMoney(round.greenFeeCents)],
            ].map(([label, val]) => (
              <div key={label} style={{ background: 'var(--bg-alt)', borderRadius: 'var(--r-sm)', padding: '10px 12px' }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{val}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div
              style={{ flex: 1, background: hasRequested || isHost ? 'var(--bg-alt)' : 'var(--primary)', borderRadius: 'var(--r-md)', padding: 11, textAlign: 'center', cursor: hasRequested || isHost ? 'default' : 'pointer' }}
              onClick={handleJoin}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: hasRequested || isHost ? 'var(--ink-3)' : 'white' }}>
                {isHost ? 'Your Round' : hasRequested ? t('rounds.requested') : joining ? '…' : t('rounds.requestToJoin')}
              </span>
            </div>
            <div style={{ background: 'var(--bg-alt)', borderRadius: 'var(--r-md)', padding: '11px 14px', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={onOpenDetail}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>Full Page →</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Mini post card for community pane
function MiniPostCard({ post, onClick }: { post: Post; onClick: () => void }) {
  const TYPE_COLORS: Record<string, [string, string]> = {
    round_report: ['var(--primary-soft)', 'var(--primary-ink)'],
    seeking: ['var(--butter)', 'var(--butter-deep)'],
    tip: ['var(--sage)', 'var(--sage-deep)'],
    general: ['var(--bg-alt)', 'var(--ink-2)'],
    announcement: ['var(--sky)', 'var(--sky-deep)'],
  }
  const TYPE_LABELS: Record<string, string> = {
    round_report: 'Round Report',
    seeking: 'Looking for Players',
    tip: 'Tip',
    general: 'General',
    announcement: 'Announcement',
  }
  const [bg, fg] = TYPE_COLORS[post.type] ?? ['var(--bg-alt)', 'var(--ink-2)']

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: '13px 14px', boxShadow: 'var(--shadow-sm)', cursor: 'pointer' }} onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 'var(--r-pill)', background: bg, color: fg }}>
          {TYPE_LABELS[post.type]}
        </span>
        {post.communities[0] && <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>{post.communities[0].community.name}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div className="avatar" style={{ width: 28, height: 28, fontSize: 11, background: avatarColor(post.authorId), flexShrink: 0 }}>
          {getInitial(post.author.displayName)}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{post.author.displayName}</div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>{timeAgo(post.createdAt)}</div>
        </div>
      </div>
      <div className="post-text-clamped" style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>{post.body}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{post.likesCount}</span>
          <svg style={{ marginLeft: 8 }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{post.commentsCount}</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', cursor: 'pointer' }}>View</span>
      </div>
    </div>
  )
}

const MOCK_ANNOUNCEMENTS: Announcement[] = [
  { id: '1', title: 'Summer Scramble Series starts July 5', body: 'Sign-ups are open for our 4-week summer scramble. Register your team of 2–4 by June 30.', badge: 'Announcement', createdAt: new Date().toISOString(), color1: '#5C7A9A', color2: '#3A6080' },
  { id: '2', title: 'Booking cancellation policy updated', body: 'Cancel up to 6 hours before tee time without penalty. Late cancellations may forfeit your spot.', badge: 'Rule Update', createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), color1: '#C9A848', color2: '#a07c28' },
  { id: '3', title: 'Tianmu GC holes 14–16 closed Jun 24–26', body: 'Temporary closure for irrigation work. Affected rounds will play a modified 15-hole layout.', badge: 'Course Notice', createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), color1: '#7C96A3', color2: '#4A6888' },
]
