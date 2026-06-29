'use client'
import dynamic from 'next/dynamic'

// Leaflet touches `window` on import, so load the map client-only (no SSR).
export const MapView = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => <div className="map-loading" />,
})
