'use client'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import type { Course } from '@/types/round'
import { coord } from '@/lib/courses'

export interface LatLng {
  lat: number
  lng: number
}

export interface LeafletMapProps {
  courses?: Course[]
  onPinClick?: (course: Course) => void
  pickMode?: boolean
  picked?: LatLng | null
  onPick?: (p: LatLng) => void
  center?: [number, number]
}

// Default view: Taiwan (the app's primary market).
const TAIWAN_CENTER: [number, number] = [23.7, 120.96]

// Photo pin (Pickle-Town style): a circular thumbnail of the course's cover
// image, falling back to a golf-flag glyph when there's no photo yet.
function photoPinIcon(course: Course): L.DivIcon {
  const url = course.coverPhotoUrl ?? course.photos?.[0]
  const inner = url
    ? `<img src="${url}" alt="" />`
    : `<span class="map-pin__flag">⛳</span>`
  return L.divIcon({
    className: 'map-pin-wrap',
    html: `<div class="map-pin">${inner}</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  })
}

const pickIcon = L.divIcon({
  className: 'map-pin-wrap',
  html: `<div class="map-pin map-pin--pick">📍</div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 42],
})

function ClickCapture({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) })
  return null
}

export default function LeafletMap({
  courses = [],
  onPinClick,
  pickMode = false,
  picked = null,
  onPick,
  center,
}: LeafletMapProps) {
  const pins = useMemo(
    () =>
      courses
        .map((c) => ({ c, lat: coord(c.lat), lng: coord(c.lng) }))
        .filter((p): p is { c: Course; lat: number; lng: number } => p.lat !== null && p.lng !== null),
    [courses],
  )

  const initialCenter: [number, number] =
    center ??
    (picked ? [picked.lat, picked.lng] : pins[0] ? [pins[0].lat, pins[0].lng] : TAIWAN_CENTER)

  return (
    <MapContainer
      center={initialCenter}
      zoom={pickMode ? 12 : 8}
      style={{ width: '100%', height: '100%' }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {!pickMode &&
        pins.map(({ c, lat, lng }) => (
          <Marker
            key={c.id}
            position={[lat, lng]}
            icon={photoPinIcon(c)}
            eventHandlers={{ click: () => onPinClick?.(c) }}
          />
        ))}
      {pickMode && onPick && <ClickCapture onPick={onPick} />}
      {pickMode && picked && <Marker position={[picked.lat, picked.lng]} icon={pickIcon} />}
    </MapContainer>
  )
}
