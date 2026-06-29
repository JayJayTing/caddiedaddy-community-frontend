'use client'
import { useCallback, useEffect, useState } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LanguageContext'
import { Pressable } from '@/components/ui/Pressable'
import { listCourses, listCourseQueue } from '@/lib/courses'
import type { Course } from '@/types/round'
import { MapView } from '@/components/map/MapView'
import { SubmitCourseForm } from '@/components/map/SubmitCourseForm'
import { ModerationList } from '@/components/map/ModerationList'

type View = 'explore' | 'submit' | 'moderate'

export function MapOverlay() {
  const { openOverlay, closeOverlay, showSuccess } = useUI()
  const { user } = useAuth()
  const { t } = useLang()
  const isOpen = openOverlay === 'map'

  const [view, setView] = useState<View>('explore')
  const [courses, setCourses] = useState<Course[] | null>(null)
  const [selected, setSelected] = useState<Course | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [loadError, setLoadError] = useState(false)

  const loadCourses = useCallback(() => {
    setLoadError(false)
    setCourses(null)
    listCourses()
      .then(setCourses)
      .catch(() => {
        setCourses([])
        setLoadError(true)
      })
  }, [])

  // On open: load pins, and probe admin access — a 200 from the moderation queue
  // means this user is on the server-side allowlist (non-admins get 403).
  useEffect(() => {
    if (!isOpen) return
    setView('explore')
    setSelected(null)
    loadCourses()
    if (user) {
      listCourseQueue('pending')
        .then((q) => {
          setIsAdmin(true)
          setPendingCount(q.length)
        })
        .catch(() => {
          setIsAdmin(false)
          setPendingCount(0)
        })
    } else {
      setIsAdmin(false)
    }
  }, [isOpen, user, loadCourses])

  if (!isOpen) return null

  const headerTitle =
    view === 'submit' ? t('map.submit.title') : view === 'moderate' ? t('map.mod.title') : t('map.title')
  const cover = selected ? selected.coverPhotoUrl ?? selected.photos?.[0] ?? null : null
  const selectedPlace = selected
    ? [selected.city, selected.district].filter(Boolean).join(' · ') || selected.locationText
    : null

  return (
    <div className="detail-overlay open">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px 12px', flexShrink: 0, borderBottom: '1px solid var(--line-soft)' }}>
        <Pressable
          onClick={view === 'explore' ? closeOverlay : () => setView('explore')}
          style={{ width: 34, height: 34, background: 'var(--bg-alt)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          aria-label={t('a11y.back')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Pressable>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 500, color: 'var(--ink)' }}>{headerTitle}</h2>
        {view === 'explore' && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {isAdmin && (
              <Pressable onClick={() => setView('moderate')} style={{ padding: '7px 12px', borderRadius: 'var(--r-pill)', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {t('map.review')}{pendingCount ? ` (${pendingCount})` : ''}
              </Pressable>
            )}
            {user && (
              <Pressable onClick={() => setView('submit')} style={{ padding: '7px 14px', borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                ＋ {t('map.addCourse')}
              </Pressable>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      {view === 'explore' && (
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          {courses === null && !loadError && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', fontSize: 14 }}>{t('map.loading')}</div>
          )}
          {loadError && (
            <Pressable onClick={loadCourses} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', fontSize: 14, cursor: 'pointer' }}>{t('map.viewError')}</Pressable>
          )}
          {courses && courses.length === 0 && !loadError && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
              {t('map.empty')}
              {user && (
                <Pressable onClick={() => setView('submit')} style={{ padding: '10px 18px', borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>＋ {t('map.addCourse')}</Pressable>
              )}
            </div>
          )}
          {courses && courses.length > 0 && <MapView courses={courses} onPinClick={setSelected} />}

          {/* Selected-pin detail card */}
          {selected && (
            <div style={{ position: 'absolute', left: 12, right: 12, bottom: 12, zIndex: 1000, background: 'var(--surface)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
              {cover && <div style={{ height: 120, backgroundImage: `url(${cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)' }}>{selected.name}</div>
                  {selectedPlace && <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>{selectedPlace}</div>}
                  <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4 }}>
                    {selected.venueType === 'driving_range' ? t('map.typeRange') : `${selected.holeCount} ${t('map.holesUnit')}`}
                  </div>
                </div>
                <Pressable onClick={() => setSelected(null)} aria-label={t('a11y.close')} style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </Pressable>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'submit' && (
        <SubmitCourseForm
          onCancel={() => setView('explore')}
          onDone={() => {
            setView('explore')
            loadCourses()
            showSuccess(t('map.submit.success'))
          }}
        />
      )}
      {view === 'moderate' && <ModerationList />}
    </div>
  )
}
