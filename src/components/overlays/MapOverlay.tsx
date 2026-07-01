'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LanguageContext'
import { Pressable } from '@/components/ui/Pressable'
import { listCourses, listCourseQueue, coord } from '@/lib/courses'
import type { Course } from '@/types/round'
import { MapView } from '@/components/map/MapView'
import type { LatLng } from '@/components/map/LeafletMap'
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
  const [userLocation, setUserLocation] = useState<LatLng | null>(null)
  const [recenterToken, setRecenterToken] = useState(0)
  const [flyTo, setFlyTo] = useState<LatLng | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

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

  useEffect(() => {
    if (!isOpen) return
    setView('explore')
    setSelected(null)
    setSearchOpen(false)
    setQuery('')
    loadCourses()
    // Best-effort device location for the blue dot + recenter.
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
      )
    }
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

  const searchMatches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || !courses) return []
    return courses.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8)
  }, [query, courses])

  if (!isOpen) return null

  const recenter = () => {
    if (userLocation) {
      setRecenterToken((n) => n + 1)
    } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          setRecenterToken((n) => n + 1)
        },
        () => {},
      )
    }
  }

  const openCourse = (c: Course) => {
    const lat = coord(c.lat)
    const lng = coord(c.lng)
    if (lat !== null && lng !== null) setFlyTo({ lat, lng })
    setSelected(c)
    setSearchOpen(false)
    setQuery('')
  }

  const cover = selected ? selected.coverPhotoUrl ?? selected.photos?.[0] ?? null : null
  const selectedPlace = selected
    ? [selected.city, selected.district].filter(Boolean).join(' · ') || selected.locationText
    : null

  // ── Submit & moderate are full-screen (own headers) ────────────────────────────
  if (view === 'submit') {
    return (
      <div className="detail-overlay open">
        <SubmitCourseForm
          onCancel={() => setView('explore')}
          onDone={() => {
            setView('explore')
            loadCourses()
            showSuccess(t('map.submit.success'))
          }}
        />
      </div>
    )
  }

  if (view === 'moderate') {
    return (
      <div className="detail-overlay open">
        <div className="map-form-header">
          <Pressable className="map-iconbtn" aria-label={t('a11y.back')} onClick={() => setView('explore')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Pressable>
          <div className="map-form-title">{t('map.mod.title')}</div>
          <span style={{ width: 36 }} />
        </div>
        <ModerationList />
      </div>
    )
  }

  // ── Explore: full-bleed map + floating controls ────────────────────────────────
  return (
    <div className="detail-overlay open">
      <div className="map-explore">
        {courses && courses.length > 0 && (
          <MapView
            courses={courses}
            onPinClick={setSelected}
            userLocation={userLocation}
            recenterToken={recenterToken}
            flyTo={flyTo}
          />
        )}

        {/* States */}
        {courses === null && !loadError && <div className="map-center-msg">{t('map.loading')}</div>}
        {loadError && (
          <Pressable onClick={loadCourses} className="map-center-msg" style={{ cursor: 'pointer' }}>
            {t('map.viewError')}
          </Pressable>
        )}
        {courses && courses.length === 0 && !loadError && (
          <div className="map-center-msg" style={{ flexDirection: 'column', gap: 14 }}>
            {t('map.empty')}
            {user && (
              <Pressable onClick={() => setView('submit')} className="map-bar-pill" style={{ flex: 'none' }}>
                ＋ {t('map.addCourse')}
              </Pressable>
            )}
          </div>
        )}

        {/* Floating back */}
        <Pressable className="map-fab map-fab--back" aria-label={t('a11y.back')} onClick={closeOverlay}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Pressable>

        {/* Admin review chip */}
        {isAdmin && (
          <Pressable className="map-fab map-fab--review" onClick={() => setView('moderate')}>
            {t('map.review')}{pendingCount ? ` (${pendingCount})` : ''}
          </Pressable>
        )}

        {/* Search panel */}
        {searchOpen && (
          <div className="map-search-panel">
            <div className="search-bar">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('map.searchPlaceholder')}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)' }}
              />
              <Pressable aria-label={t('a11y.close')} onClick={() => { setSearchOpen(false); setQuery('') }} style={{ fontSize: 16, color: 'var(--ink-3)', cursor: 'pointer' }}>×</Pressable>
            </div>
            {query.trim() && (
              <div className="map-results">
                {searchMatches.length === 0 ? (
                  <div className="map-hint" style={{ padding: '10px 12px' }}>{t('map.noResults')}</div>
                ) : (
                  searchMatches.map((c) => (
                    <Pressable key={c.id} className="map-result" onClick={() => openCourse(c)}>
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                      {c.locationText && <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>· {c.locationText}</span>}
                    </Pressable>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Selected-pin detail card */}
        {selected && (
          <div className="map-detail-card">
            {cover && <div style={{ height: 120, backgroundImage: `url(${cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
            <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)' }}>{selected.name}</div>
                {selectedPlace && <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>{selectedPlace}</div>}
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4 }}>
                  {selected.venueType === 'driving_range' ? t('map.typeRange') : selected.venueType === 'indoor_sim' ? t('map.typeSim') : `${selected.holeCount} ${t('map.holesUnit')}`}
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

        {/* Bottom action bar */}
        {!selected && (
          <div className="map-bottombar">
            <Pressable className="map-bar-pill" onClick={() => setSearchOpen((o) => !o)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              {t('map.searchCourses')}
            </Pressable>
            {user && (
              <Pressable className="map-bar-pill" onClick={() => setView('submit')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {t('map.addCourse')}
              </Pressable>
            )}
            <Pressable className="map-bar-round" aria-label={t('map.recenter')} onClick={recenter}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
            </Pressable>
          </div>
        )}
      </div>
    </div>
  )
}
