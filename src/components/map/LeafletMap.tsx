'use client'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
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
  userLocation?: LatLng | null
  /** Bump this number to recenter the map onto the user (or picked) location. */
  recenterToken?: number
  /** Set to fly the map to a specific point (e.g. a search result). */
  flyTo?: LatLng | null
}

// Default view: Taiwan (the app's primary market).
const TAIWAN_CENTER: [number, number] = [23.7, 120.96]

// Pickle-Town-style marker: a rounded-square thumbnail of the course's cover
// photo, falling back to a tinted tile + golf-flag glyph when there's no photo.
function photoPinIcon(course: Course): L.DivIcon {
  const url = course.coverPhotoUrl ?? course.photos?.[0]
  const html = url
    ? `<div class="map-pin"><img src="${url}" alt="" /></div>`
    : `<div class="map-pin map-pin--empty"><span class="map-pin__flag">⛳</span></div>`
  return L.divIcon({ className: 'map-pin-wrap', html, iconSize: [48, 48], iconAnchor: [24, 24] })
}

const pickIcon = L.divIcon({
  className: 'map-pin-wrap',
  html: `<div class="map-pin-pick"></div>`,
  iconSize: [30, 40],
  iconAnchor: [15, 38],
})

const userIcon = L.divIcon({
  className: 'map-pin-wrap',
  html: `<div class="map-userdot"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

function ClickCapture({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) })
  return null
}

// Recenter on token change (the floating "my location" button).
function Recenter({ token, target }: { token?: number; target?: LatLng | null }) {
  const map = useMap()
  useEffect(() => {
    if (token == null || !target) return
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 14), { duration: 0.6 })
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

// Fly to a search-selected point.
function FlyTo({ target }: { target?: LatLng | null }) {
  const map = useMap()
  useEffect(() => {
    if (!target) return
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 14), { duration: 0.6 })
  }, [target]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

export default function LeafletMap({
  courses = [],
  onPinClick,
  pickMode = false,
  picked = null,
  onPick,
  center,
  userLocation = null,
  recenterToken,
  flyTo = null,
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
    (picked
      ? [picked.lat, picked.lng]
      : userLocation
        ? [userLocation.lat, userLocation.lng]
        : pins[0]
          ? [pins[0].lat, pins[0].lng]
          : TAIWAN_CENTER)

  return (
    <MapContainer
      center={initialCenter}
      zoom={pickMode ? 14 : 11}
      style={{ width: '100%', height: '100%' }}
      scrollWheelZoom
      zoomControl={false}
    >
      <TileLayer
        // Muted, low-color basemap (CARTO Positron). The default OSM style is too
        // busy in hilly areas (terrain shading, peak triangles, colored roads) and
        // fights the course pins — Positron stays calm so the pins stand out.
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        detectRetina
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
      {pickMode && picked && (
        <Marker
          position={[picked.lat, picked.lng]}
          icon={pickIcon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const ll = (e.target as L.Marker).getLatLng()
              onPick?.({ lat: ll.lat, lng: ll.lng })
            },
          }}
        />
      )}
      {userLocation && <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} interactive={false} />}
      <Recenter
        token={recenterToken}
        target={userLocation ?? picked ?? (center ? { lat: center[0], lng: center[1] } : null)}
      />
      <FlyTo target={flyTo} />
    </MapContainer>
  )
}
