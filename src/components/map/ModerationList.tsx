'use client'
import { useEffect, useState } from 'react'
import { useLang } from '@/contexts/LanguageContext'
import { Pressable } from '@/components/ui/Pressable'
import { Avatar } from '@/components/ui/Avatar'
import { listCourseQueue, moderateCourse, type PendingCourse } from '@/lib/courses'

export function ModerationList() {
  const { t } = useLang()
  const [items, setItems] = useState<PendingCourse[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listCourseQueue('pending')
      .then(setItems)
      .catch(() => setItems([]))
  }, [])

  const act = async (id: string, status: 'approved' | 'rejected') => {
    setBusy(id)
    setError(null)
    try {
      await moderateCourse(id, { status })
      setItems((cur) => (cur ? cur.filter((c) => c.id !== id) : cur))
    } catch {
      setError(t('map.mod.failed'))
    } finally {
      setBusy(null)
    }
  }

  if (items === null) {
    return <div className="scroll-body" style={{ padding: 24, color: 'var(--ink-3)', fontSize: 14 }}>{t('map.mod.loading')}</div>
  }
  if (items.length === 0) {
    return <div className="scroll-body" style={{ padding: 24, color: 'var(--ink-3)', fontSize: 14 }}>{t('map.mod.empty')}</div>
  }

  return (
    <div className="scroll-body" style={{ padding: '8px 16px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {error && <div style={{ fontSize: 13, color: 'var(--danger, #d33)' }}>{error}</div>}
      {items.map((c) => {
        const cover = c.coverPhotoUrl ?? c.photos?.[0] ?? null
        const place = [c.city, c.district].filter(Boolean).join(' · ') || c.locationText || ''
        return (
          <div key={c.id} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'var(--surface)' }}>
            {cover && <div style={{ height: 130, backgroundImage: `url(${cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
            <div style={{ padding: '12px 14px' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)', marginBottom: 2 }}>{c.name}</div>
              {place && <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{place}</div>}
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4 }}>
                {c.venueType === 'course' ? `${c.holeCount} ${t('map.holesUnit')}` : c.venueType === 'indoor_sim' ? t('map.typeSim') : t('map.typeRange')}
              </div>
              {c.submittedBy && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <Avatar name={c.submittedBy.displayName} url={c.submittedBy.avatarUrl} seed={c.submittedBy.id} size={22} fontSize={10} />
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{t('map.mod.submittedBy')} {c.submittedBy.displayName}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <Pressable onClick={() => act(c.id, 'rejected')} style={{ flex: 1, textAlign: 'center', padding: 9, borderRadius: 'var(--r-pill)', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: busy === c.id ? 0.6 : 1 }}>
                  {t('map.mod.reject')}
                </Pressable>
                <Pressable onClick={() => act(c.id, 'approved')} style={{ flex: 1, textAlign: 'center', padding: 9, borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: busy === c.id ? 0.6 : 1 }}>
                  {t('map.mod.approve')}
                </Pressable>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
