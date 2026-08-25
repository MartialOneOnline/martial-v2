'use client'

import { useRef, useState } from 'react'
import { X, Download, Share2, QrCode, ScanLine, Check, Loader2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { adminFetch } from '../../lib/api/adminFetch'

interface Props {
  schoolName: string
  schoolSlug: string
  onClose: () => void
}

interface UpcomingEvent {
  id: string
  title: string
}

export default function QRCodeModal({ schoolName, schoolSlug, onClose }: Props) {
  const qrWrapRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [scanState, setScanState] = useState<'idle' | 'loading' | 'none'>('idle')
  const [scanEvents, setScanEvents] = useState<UpcomingEvent[] | null>(null)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const profileUrl = `${origin}/school/${schoolSlug}`

  function downloadQR() {
    const svg = qrWrapRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const svgUrl = URL.createObjectURL(new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' }))
    const img = new Image()
    img.onload = () => {
      const scale = 4
      const canvas = document.createElement('canvas')
      canvas.width = 200 * scale
      canvas.height = 200 * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(svgUrl)
      canvas.toBlob(blob => {
        if (!blob) return
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `${schoolSlug || 'school'}-qr.png`
        link.click()
        URL.revokeObjectURL(link.href)
      })
    }
    img.src = svgUrl
  }

  async function shareQR() {
    if (navigator.share) {
      try {
        await navigator.share({ title: schoolName, text: `Check out ${schoolName} on Martial`, url: profileUrl })
      } catch { /* user cancelled */ }
      return
    }
    await navigator.clipboard.writeText(profileUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function openScan() {
    setScanState('loading')
    try {
      const res = await adminFetch('/api/dashboard/events')
      const data = await res.json()
      const now = new Date()
      const upcoming: UpcomingEvent[] = (data.events ?? [])
        .filter((e: { isCancelled: boolean; startAt: string }) => !e.isCancelled && new Date(e.startAt) >= now)
        .map((e: { id: string; title: string }) => ({ id: e.id, title: e.title }))

      if (upcoming.length === 0) {
        setScanState('none')
        return
      }
      if (upcoming.length === 1) {
        window.open(`${origin}/checkin/event/${upcoming[0]!.id}`, '_blank')
        setScanState('idle')
        return
      }
      setScanEvents(upcoming)
      setScanState('idle')
    } catch {
      setScanState('none')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" style={{ background: '#fff' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#EEF2FF' }}>
              <QrCode size={15} style={{ color: '#6366F1' }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>QR Code</p>
              <p style={{ fontSize: 11, color: '#9CA3AF' }}>Share your academy profile</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
            <X size={18} />
          </button>
        </div>

        {/* QR Body */}
        <div className="px-5 py-6 flex flex-col items-center gap-5">
          <div ref={qrWrapRef} className="relative p-4 rounded-2xl" style={{ background: '#fff', border: '2px solid #E5E7EB' }}>
            <QRCodeSVG value={profileUrl} size={200} level="M" />
          </div>

          <div className="text-center">
            <p style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{schoolName}</p>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{profileUrl.replace(/^https?:\/\//, '')}</p>
          </div>

          <p style={{ fontSize: 12, color: '#6B7280', textAlign: 'center', lineHeight: 1.5, maxWidth: 260 }}>
            Students can scan this code to find your academy and book classes directly.
          </p>

          {/* Actions */}
          <div className="flex gap-3 w-full">
            <button
              onClick={downloadQR}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-1.5"
              style={{ border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}
            >
              <Download size={13} /> Download
            </button>
            <button
              onClick={shareQR}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer flex items-center justify-center gap-1.5"
              style={{ background: '#6366F1', border: 'none' }}
            >
              {copied ? <Check size={13} /> : <Share2 size={13} />}
              {copied ? 'Copied!' : 'Share'}
            </button>
          </div>

          {/* Open QR scan */}
          <div className="w-full pt-1" style={{ borderTop: '1px solid #F3F4F6' }}>
            {scanEvents === null ? (
              <button
                onClick={openScan}
                disabled={scanState === 'loading'}
                className="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                style={{ border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#374151', opacity: scanState === 'loading' ? 0.6 : 1 }}
              >
                {scanState === 'loading' ? <Loader2 size={13} className="animate-spin" /> : <ScanLine size={13} />}
                {scanState === 'none' ? 'No upcoming events to check in' : 'Open QR scan'}
              </button>
            ) : (
              <div className="mt-4 w-full">
                <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                  Select an event to scan
                </p>
                <div className="flex flex-col gap-1.5">
                  {scanEvents.map(ev => (
                    <a
                      key={ev.id}
                      href={`${origin}/checkin/event/${ev.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2"
                      style={{ border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#374151', fontSize: 13, textDecoration: 'none' }}
                    >
                      <ScanLine size={13} style={{ flexShrink: 0, color: '#6366F1' }} />
                      {ev.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
