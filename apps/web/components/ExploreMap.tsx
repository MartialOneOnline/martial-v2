'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

type School = {
  id: string
  slug: string
  name: string
  city: string
  country: string
  lat: number | null
  lng: number | null
  coverUrl: string | null
  googleRating: number | null
  hasFreeTrialCls: boolean
  disciplines: { discipline: { name: string } }[]
}

type Props = {
  schools: School[]
  userCoords?: { lat: number; lng: number } | null
  onSchoolClick: (school: School) => void
}

export default function ExploreMap({ schools, userCoords, onSchoolClick }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Dynamic import of Leaflet (browser only)
    import('leaflet').then(L => {
      // Fix default icon paths (Webpack/Next.js issue)
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const schoolsWithCoords = schools.filter(s => s.lat && s.lng)

      // Center map: user location → first school → Europe
      let center: [number, number] = [51.5, -0.1] // London default
      let zoom = 5
      if (userCoords) {
        center = [userCoords.lat, userCoords.lng]
        zoom = 10
      } else if (schoolsWithCoords.length > 0) {
        const first = schoolsWithCoords[0]!
        center = [first.lat!, first.lng!]
        zoom = 7
      }

      const map = L.map(mapRef.current!, { zoomControl: true }).setView(center, zoom)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      // User position marker
      if (userCoords) {
        const userIcon = L.divIcon({
          html: `<div style="width:16px;height:16px;border-radius:50%;background:#006197;border:3px solid white;box-shadow:0 2px 8px rgba(0,97,151,0.5)"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
          className: '',
        })
        L.marker([userCoords.lat, userCoords.lng], { icon: userIcon })
          .addTo(map)
          .bindPopup('<strong>You are here</strong>')
      }

      // School markers
      schoolsWithCoords.forEach(school => {
        const disciplines = school.disciplines.map(d => d.discipline.name).slice(0, 2).join(', ')
        const ratingHtml = school.googleRating
          ? `<span style="color:#F59E0B;font-weight:700">★ ${school.googleRating.toFixed(1)}</span> · `
          : ''
        const trialHtml = school.hasFreeTrialCls
          ? `<span style="background:#10B981;color:white;font-size:10px;padding:1px 6px;border-radius:999px;font-weight:700">FREE TRIAL</span>`
          : ''

        const popupContent = `
          <div style="font-family:-apple-system,sans-serif;min-width:180px;max-width:220px">
            <div style="font-weight:700;font-size:13px;color:#111827;margin-bottom:4px">${school.name}</div>
            <div style="color:#6B7280;font-size:11px;margin-bottom:4px">📍 ${school.city}, ${school.country}</div>
            ${disciplines ? `<div style="color:#6B7280;font-size:11px;margin-bottom:6px">${disciplines}</div>` : ''}
            <div style="font-size:11px;margin-bottom:8px">${ratingHtml}${trialHtml}</div>
            <button
              onclick="window.__exploreMapClick('${school.id}')"
              style="width:100%;background:#006197;color:white;border:none;border-radius:8px;padding:7px 0;font-weight:600;font-size:12px;cursor:pointer"
            >View Academy →</button>
          </div>
        `

        const markerIcon = L.divIcon({
          html: `<div style="background:#006197;color:white;font-size:10px;font-weight:700;padding:3px 7px;border-radius:999px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);border:2px solid white">${school.name.split(' ').slice(0, 2).join(' ')}</div>`,
          className: '',
          iconAnchor: [0, 0],
        })

        L.marker([school.lat!, school.lng!], { icon: markerIcon })
          .addTo(map)
          .bindPopup(popupContent, { maxWidth: 240 })
      })

      mapInstanceRef.current = map
    })

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, []) // intentionally only on mount

  // Update markers when schools/userCoords change — simpler: just re-init
  useEffect(() => {
    if (!mapInstanceRef.current) return
    // Expose click handler globally for popup buttons
    ;(window as any).__exploreMapClick = (schoolId: string) => {
      const school = schools.find(s => s.id === schoolId)
      if (school) onSchoolClick(school)
    }
  }, [schools, onSchoolClick])

  // Register global handler after mount too
  useEffect(() => {
    ;(window as any).__exploreMapClick = (schoolId: string) => {
      const school = schools.find(s => s.id === schoolId)
      if (school) onSchoolClick(school)
    }
  }, [schools, onSchoolClick])

  const schoolsWithCoords = schools.filter(s => s.lat && s.lng)

  return (
    <div>
      <div
        ref={mapRef}
        className="w-full rounded-2xl overflow-hidden border border-[#E5E7EB] shadow-sm"
        style={{ height: 520 }}
      />
      {schoolsWithCoords.length < schools.length && (
        <p className="mt-2 text-xs text-[#9CA3AF] text-center">
          {schoolsWithCoords.length} of {schools.length} schools have map coordinates · geocoding in progress
        </p>
      )}
    </div>
  )
}
