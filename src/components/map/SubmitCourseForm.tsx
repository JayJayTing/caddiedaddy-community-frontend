'use client'
import { useState, type ChangeEvent, type CSSProperties } from 'react'
import { useLang } from '@/contexts/LanguageContext'
import { Pressable } from '@/components/ui/Pressable'
import { isSupportedImage, prepareImage, MAX_UPLOAD_BYTES } from '@/lib/image'
import { submitCourse, uploadCoursePhoto } from '@/lib/courses'
import { MapView } from './MapView'
import type { LatLng } from './LeafletMap'

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 'var(--r-md)',
  border: '1px solid var(--line)',
  background: 'var(--surface)',
  color: 'var(--ink)',
  fontSize: 14,
  fontFamily: 'var(--sans)',
}

const labelStyle: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 600,
  color: 'var(--ink-2)',
  marginBottom: 6,
  display: 'block',
}

function pill(active: boolean): CSSProperties {
  return {
    flex: 1,
    textAlign: 'center',
    padding: '9px 8px',
    borderRadius: 'var(--r-pill)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    border: `1px solid ${active ? 'var(--primary)' : 'var(--line)'}`,
    background: active ? 'var(--primary)' : 'var(--surface)',
    color: active ? '#fff' : 'var(--ink-2)',
  }
}

export function SubmitCourseForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const { t } = useLang()
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [holes, setHoles] = useState(18)
  const [venueType, setVenueType] = useState<'course' | 'driving_range'>('course')
  const [picked, setPicked] = useState<LatLng | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      setPhotos((p) => [...p, url])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.uploadPhotoFailed'))
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError(t('map.submit.needName'))
      return
    }
    if (!picked) {
      setError(t('map.submit.needPin'))
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await submitCourse({
        name: name.trim(),
        city: city.trim() || undefined,
        district: district.trim() || undefined,
        holeCount: venueType === 'driving_range' ? undefined : holes,
        venueType,
        lat: picked.lat,
        lng: picked.lng,
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

  return (
    <div className="scroll-body" style={{ padding: '12px 16px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Drop-a-pin location map */}
      <div>
        <label style={labelStyle}>{t('map.submit.pinHint')}</label>
        <div style={{ height: 220, borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '1px solid var(--line)', position: 'relative' }}>
          <MapView pickMode picked={picked} onPick={setPicked} />
        </div>
        {picked && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>{t('map.submit.pinSet')}</div>}
      </div>

      <div>
        <label style={labelStyle}>{t('map.submit.nameLabel')}</label>
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('map.submit.namePlaceholder')} maxLength={100} />
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>{t('map.submit.cityLabel')}</label>
          <input style={inputStyle} value={city} onChange={(e) => setCity(e.target.value)} placeholder={t('map.submit.cityPlaceholder')} maxLength={40} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>{t('map.submit.districtLabel')}</label>
          <input style={inputStyle} value={district} onChange={(e) => setDistrict(e.target.value)} placeholder={t('map.submit.districtPlaceholder')} maxLength={40} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>{t('map.submit.typeLabel')}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['course', 'driving_range'] as const).map((vt) => (
            <Pressable key={vt} onClick={() => setVenueType(vt)} style={pill(venueType === vt)}>
              {vt === 'course' ? t('map.typeCourse') : t('map.typeRange')}
            </Pressable>
          ))}
        </div>
      </div>

      {venueType === 'course' && (
        <div>
          <label style={labelStyle}>{t('map.submit.holesLabel')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[9, 18, 27, 36].map((h) => (
              <Pressable key={h} onClick={() => setHoles(h)} style={pill(holes === h)}>
                {h}
              </Pressable>
            ))}
          </div>
        </div>
      )}

      <div>
        <label style={labelStyle}>{t('map.submit.photosLabel')}</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {photos.map((url, i) => (
            <div key={url} style={{ width: 72, height: 72, borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--line)', position: 'relative' }}>
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <Pressable
                onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                aria-label={t('a11y.close')}
                style={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, cursor: 'pointer' }}
              >
                ×
              </Pressable>
            </div>
          ))}
          <label style={{ width: 72, height: 72, borderRadius: 'var(--r-md)', border: '1px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 20, background: 'var(--bg-alt)' }}>
            {uploading ? '…' : '＋'}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pickPhoto} style={{ display: 'none' }} disabled={uploading} />
          </label>
        </div>
      </div>

      {error && <div style={{ fontSize: 13, color: 'var(--danger, #d33)' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <Pressable onClick={onCancel} style={{ flex: 1, textAlign: 'center', padding: 12, borderRadius: 'var(--r-pill)', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink-2)', fontWeight: 600, cursor: 'pointer' }}>
          {t('map.submit.cancel')}
        </Pressable>
        <Pressable onClick={handleSubmit} style={{ flex: 2, textAlign: 'center', padding: 12, borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}>
          {submitting ? t('map.submit.submitting') : t('map.submit.submit')}
        </Pressable>
      </div>
    </div>
  )
}
