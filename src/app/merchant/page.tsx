'use client'
import { useEffect, useState } from 'react'
import { MerchantShell } from './MerchantShell'
import { merchantApi, MerchantVenue, VenueType } from '@/lib/booking'
import { ApiError } from '@/lib/api'

export default function MerchantHome() {
  return (
    <MerchantShell>
      <VenuesList />
    </MerchantShell>
  )
}

function VenuesList() {
  const [venues, setVenues] = useState<MerchantVenue[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const load = () => {
    merchantApi
      .myVenues()
      .then(setVenues)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load venues'))
  }

  useEffect(load, [])

  return (
    <>
      <div className="mc-row mc-spread" style={{ marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, margin: 0 }}>Your venues</h2>
          <p className="mc-muted mc-small" style={{ margin: '4px 0 0' }}>
            Stores and driving ranges you operate.
          </p>
        </div>
        <button className="mc-btn" onClick={() => setCreating((v) => !v)}>
          {creating ? 'Close' : '+ New venue'}
        </button>
      </div>

      {creating && <CreateVenue onCreated={() => { setCreating(false); load() }} />}

      {error && <div className="mc-error">{error}</div>}

      {venues === null && !error && <div className="mc-empty">Loading…</div>}

      {venues && venues.length === 0 && (
        <div className="mc-card mc-empty">
          No venues yet. Create one to start publishing booking times and prices.
        </div>
      )}

      {venues && venues.length > 0 && (
        <div className="mc-grid">
          {venues.map((v) => (
            <a key={v.id} href={`/merchant/${v.id}`} className="mc-venue">
              <div className="mc-row mc-spread">
                <span className="mc-venue-name">{v.name}</span>
                <span className={`mc-badge ${v.status}`}>{v.status}</span>
              </div>
              <div className="mc-muted mc-small" style={{ marginBottom: 10 }}>
                {v.type === 'driving_range' ? 'Driving range' : 'Golf course'}
                {v.locationText ? ` · ${v.locationText}` : ''}
              </div>
              <div className="mc-row" style={{ gap: 18 }}>
                <span className="mc-small mc-muted">{v._count.bookings} bookings</span>
                <span className="mc-small mc-muted">{v._count.slots} slots</span>
                <span className="mc-small mc-muted">role: {v.myRole}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </>
  )
}

function CreateVenue({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState<VenueType>('course')
  const [locationText, setLocationText] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await merchantApi.createVenue({
        name,
        type,
        locationText: locationText || undefined,
        city: city || undefined,
        phone: phone || undefined,
      })
      onCreated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create venue')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="mc-card" onSubmit={submit}>
      <h2>New venue <span className="mc-muted mc-small">— starts pending until approved</span></h2>
      {error && <div className="mc-error">{error}</div>}
      <div className="mc-grid">
        <div className="mc-field">
          <label>Name</label>
          <input className="mc-input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
        </div>
        <div className="mc-field">
          <label>Type</label>
          <select className="mc-select" value={type} onChange={(e) => setType(e.target.value as VenueType)}>
            <option value="course">Golf course</option>
            <option value="driving_range">Driving range</option>
          </select>
        </div>
        <div className="mc-field">
          <label>Location</label>
          <input className="mc-input" value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder="Yangmei, Taoyuan" />
        </div>
        <div className="mc-field">
          <label>City</label>
          <input className="mc-input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Taoyuan" />
        </div>
        <div className="mc-field">
          <label>Phone</label>
          <input className="mc-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      <button className="mc-btn" type="submit" disabled={busy} style={{ marginTop: 6 }}>
        {busy ? 'Creating…' : 'Create venue'}
      </button>
    </form>
  )
}
