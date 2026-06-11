'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

interface School {
  id: string
  name: string
  city: string
  country: string
  lat: number
  lng: number
  status: string
}

const STATUS_COLOR: Record<string, string> = {
  VERIFIED: '#10B981',
  CLAIMED: '#3B82F6',
  UNVERIFIED: '#9CA3AF',
  PARTNER: '#F59E0B',
}

export default function AdminMap({ schools }: { schools: School[] }) {
  const first = schools[0]
  const center: [number, number] = first ? [first.lat, first.lng] : [20, 0]

  const mapKey = schools.map(s => s.id).join(',') || 'empty'

  return (
    <MapContainer
      key={mapKey}
      center={center}
      zoom={schools.length === 1 ? 8 : 2}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {schools.map(school => (
        <CircleMarker
          key={school.id}
          center={[school.lat, school.lng]}
          radius={6}
          pathOptions={{
            color: STATUS_COLOR[school.status] || '#9CA3AF',
            fillColor: STATUS_COLOR[school.status] || '#9CA3AF',
            fillOpacity: 0.85,
            weight: 1.5,
          }}
        >
          <Popup>
            <div className="text-xs">
              <p className="font-semibold">{school.name}</p>
              <p className="text-gray-500">{school.city}, {school.country}</p>
              <p className="mt-1 font-medium" style={{ color: STATUS_COLOR[school.status] }}>
                {school.status}
              </p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
