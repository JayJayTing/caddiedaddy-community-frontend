'use client'
import { useState, type ChangeEvent } from 'react'
import { useLang } from '@/contexts/LanguageContext'
import { Pressable } from '@/components/ui/Pressable'
import { isSupportedImage, prepareImage, MAX_UPLOAD_BYTES } from '@/lib/image'
import { submitCourse, uploadCoursePhoto } from '@/lib/courses'
import { LocationPicker, type PickedLocation } from './LocationPicker'

const MAX_PHOTOS = 5

export function SubmitCourseForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const { t } = useLang()
  const [name, setName] = useState('')
  const [venueType, setVenueType] = useState<'course' | 'driving_range'>('course')
  const [holes, setHoles] = useState(18)
  const [location, setLocation] = useState<PickedLocation | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const pickPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.files?.[0]
    e.target.value = ''
    if (!raw) return
    if (!isSupportedImage(raw)) {
      setError(t('error.unsupportedImage'))
      return
    }
    setError(null)
    setUploading(true)
    try {
      const file = await prepareImage(raw, { maxDim: 1600 })
      if (file.size > MAX_UPLOAD_BYTES) {
        setError(t('error.imageTooLarge'))
        return
      }
      const url = await uploadCoursePhoto(file)
      setPhotos((p) => [...p, url].slice(0, MAX_PHOTOS))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.uploadPhotoFailed'))
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    if (submitting) return
    if (!name.trim()) {
      setError(t('map.submit.needName'))
      return
    }
    if (!location) {
      setError(t('map.submit.needPin'))
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await submitCourse({
        name: name.trim(),
        locationText: location.label.slice(0, 80),
        city: location.city,
        district: location.district,
        holeCount: venueType === 'driving_range' ? undefined : holes,
        venueType,
        lat: location.lat,
        lng: location.lng,
        coverPhotoUrl: photos[0],
        photos,
      })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('map.submit.failed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (pickerOpen) {
    return (
      <LocationPicker
        initial={location}
        onCancel={() => setPickerOpen(false)}
        onConfirm={(loc) => {
          setLocation(loc)
          setPickerOpen(false)
        }}
      />
    )
  }

  const seg = (active: boolean): React.CSSProperties => ({
    padding: '7px 12px',
    borderRadius: 'var(--r-pill)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    border: `1.5px solid ${active ? 'var(--primary)' : 'var(--line)'}`,
    background: active ? 'var(--primary)' : 'var(--surface)',
    color: active ? '#fff' : 'var(--ink-2)',
  })

  return (
    <div className="map-screen">
      {/* Header: ✕  title  ✓ */}
      <div className="map-form-header">
        <Pressable className="map-iconbtn" aria-label={t('map.submit.cancel')} onClick={onCancel}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </Pressable>
        <div className="map-form-title">{t('map.submit.title')}</div>
        <Pressable className="map-iconbtn map-iconbtn--primary" aria-label={t('map.submit.submit')} onClick={handleSubmit} style={{ opacity: submitting ? 0.6 : 1 }}>
          {submitting ? (
            <span style={{ fontSize: 16 }}>…</span>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </Pressable>
      </div>

      <div className="scroll-body" style={{ padding: '16px 16px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Photos */}
        <div>
          <div className="map-section-label">{t('map.submit.photosLabel')}</div>
          <div className="map-hint" style={{ margin: '0 0 8px' }}>{t('map.submit.photosHint')}</div>
          <div className="map-photo-grid">
            {photos.map((url, i) => (
              <div key={url} className="map-photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" />
                <Pressable
                  className="map-photo-x"
                  aria-label={t('a11y.close')}
                  onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                >
                  ×
                </Pressable>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className="map-photo map-photo--add">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /><line x1="19" y1="2" x2="19" y2="8" /><line x1="22" y1="5" x2="16" y2="5" />
                </svg>
                <span>{uploading ? '…' : t('map.submit.uploadPhoto')}</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pickPhoto} style={{ display: 'none' }} disabled={uploading} />
              </label>
            )}
          </div>
        </div>

        {/* Name */}
        <input
          className="map-name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('map.submit.nameLabel')}
          maxLength={100}
        />

        {/* Location (searchable) */}
        <div className="map-rows">
          <Pressable className="map-row" onClick={() => setPickerOpen(true)}>
            <span className="map-row-ic">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
            </span>
            <span className="map-row-label">{t('map.loc.row')}</span>
            <span className="map-row-val" style={{ color: location ? 'var(--ink)' : 'var(--ink-3)' }}>
              {location ? t('map.loc.selected') : t('map.loc.select')}
            </span>
            <span className="map-row-chev">›</span>
          </Pressable>
          {location?.label && <div className="map-row-sub">{location.label}</div>}
        </div>

        {/* Options */}
        <div>
          <div className="map-section-label">{t('map.submit.optionsLabel')}</div>
          <div className="map-rows" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="map-row map-row--static">
              <span className="map-row-label" style={{ flex: 'none' }}>{t('map.submit.typeLabel')}</span>
              <div className="map-seg">
                {(['course', 'driving_range'] as const).map((vt) => (
                  <Pressable key={vt} onClick={() => setVenueType(vt)} style={seg(venueType === vt)}>
                    {vt === 'course' ? t('map.typeCourse') : t('map.typeRange')}
                  </Pressable>
                ))}
              </div>
            </div>
            {venueType === 'course' && (
              <div className="map-row map-row--static" style={{ borderTop: '1px solid var(--line-soft)' }}>
                <span className="map-row-label" style={{ flex: 'none' }}>{t('map.submit.holesLabel')}</span>
                <div className="map-seg">
                  {[9, 18, 27, 36].map((h) => (
                    <Pressable key={h} onClick={() => setHoles(h)} style={seg(holes === h)}>
                      {h}
                    </Pressable>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {error && <div className="map-error">{error}</div>}
      </div>
    </div>
  )
}
