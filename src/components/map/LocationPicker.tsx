'use client'
import { useEffect, useRef, useState } from 'react'
import { useLang } from '@/contexts/LanguageContext'
import { Pressable } from '@/components/ui/Pressable'
import { searchPlaces, reverseGeocode, type PlaceResult } from '@/lib/courses'
import { MapView } from './MapView'
import type { LatLng } from './LeafletMap'

export interface PickedLocation {
  lat: number
  lng: number
  label: string
  city?: string
  district?: string
}

export function LocationPicker({
  initial,
  onConfirm,
  onCancel,
}: {
  initial?: PickedLocation | null
  onConfirm: (loc: PickedLocation) => void
  onCancel: () => void
}) {
  const { t } = useLang()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [searching, setSearching] = useState(false)
  const [picked, setPicked] = useState<LatLng | null>(initial ? { lat: initial.lat, lng: initial.lng } : null)
  const [label, setLabel] = useState(initial?.label ?? '')
  const [city, setCity] = useState(initial?.city)
  const [district, setDistrict] = useState(initial?.district)
  const [flyTo, setFlyTo] = useState<LatLng | null>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abort = useRef<AbortController | null>(null)

  // Debounced place search.
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    debounce.current = setTimeout(() => {
      abort.current?.abort()
      const ac = new AbortController()
      abort.current = ac
      searchPlaces(q, ac.signal)
        .then((r) => setResults(r))
        .catch(() => {})
        .finally(() => setSearching(false))
    }, 450)
    return () => {
      if (debounce.current) clearTimeout(debounce.current)
    }
  }, [query])

  const choose = (r: PlaceResult) => {
    setPicked({ lat: r.lat, lng: r.lng })
    setLabel(r.label)
    setCity(r.city)
    setDistrict(r.district)
    setResults([])
    setQuery('')
    setFlyTo({ lat: r.lat, lng: r.lng })
  }

  // Tap/drag on the map → set pin and reverse-geocode a friendly label.
  const onMapPick = async (p: LatLng) => {
    setPicked(p)
    const rev = await reverseGeocode(p.lat, p.lng)
    if (rev) {
      setLabel(rev.label)
      setCity(rev.city)
      setDistrict(rev.district)
    }
  }

  const confirm = () => {
    if (!picked) return
    onConfirm({
      lat: picked.lat,
      lng: picked.lng,
      label: label || `${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}`,
      city,
      district,
    })
  }

  return (
    <div className="map-screen">
      <div className="map-form-header">
        <Pressable className="map-iconbtn" aria-label={t('map.submit.cancel')} onClick={onCancel}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </Pressable>
        <div className="map-form-title">{t('map.loc.title')}</div>
        <span style={{ width: 36 }} />
      </div>

      {/* Search */}
      <div style={{ padding: '12px 16px 4px', position: 'relative', zIndex: 5 }}>
        <div className="search-bar">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('map.loc.search')}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)' }}
          />
        </div>
        {searching && <div className="map-hint">{t('map.loc.searching')}</div>}
        {results.length > 0 && (
          <div className="map-results">
            {results.map((r, i) => (
              <Pressable key={`${r.lat},${r.lng},${i}`} className="map-result" onClick={() => choose(r)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0, marginTop: 1 }}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                <span>{r.label}</span>
              </Pressable>
            ))}
          </div>
        )}
        {query.trim().length >= 2 && !searching && results.length === 0 && (
          <div className="map-hint">{t('map.loc.noResults')}</div>
        )}
      </div>

      {/* Map (fine-tune) */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <MapView
          pickMode
          picked={picked}
          onPick={onMapPick}
          flyTo={flyTo}
          center={picked ? [picked.lat, picked.lng] : undefined}
        />
        <div className="map-pickhint">{t('map.loc.tapHint')}</div>
      </div>

      {/* Footer */}
      <div className="map-form-footer">
        {label && <div className="map-loc-label">📍 {label}</div>}
        <Pressable className="map-cta" aria-disabled={!picked} onClick={confirm} style={{ opacity: picked ? 1 : 0.5 }}>
          {t('map.loc.use')}
        </Pressable>
      </div>
    </div>
  )
}
