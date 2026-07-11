'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { CheckCircle, XCircle, Camera, RefreshCw } from 'lucide-react'

interface Props {
  classId: string
  className: string
  date: string  // YYYY-MM-DD
}

type ScanResult = { ok: true; name: string; walkin: boolean; atCapacity: boolean } | { ok: false; error: string }

declare class BarcodeDetector {
  constructor(opts: { formats: string[] })
  detect(source: HTMLVideoElement | HTMLImageElement | ImageBitmap): Promise<{ rawValue: string }[]>
}

export default function CheckinClient({ classId, className, date }: Props) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const streamRef  = useRef<MediaStream | null>(null)
  const rafRef     = useRef<number>(0)
  const lastScan   = useRef<string>('')
  const cooldown   = useRef(false)

  const [result,   setResult]   = useState<ScanResult | null>(null)
  const [scanning, setScanning] = useState(false)
  const [camError, setCamError] = useState<string | null>(null)
  const [checkins, setCheckins] = useState<string[]>([])

  const processQR = useCallback(async (raw: string) => {
    if (cooldown.current || raw === lastScan.current) return
    const match = raw.match(/^martial:checkin:(.+)$/)
    if (!match) return
    const userId = match[1]!
    lastScan.current = raw
    cooldown.current = true
    setTimeout(() => { cooldown.current = false; lastScan.current = '' }, 3000)

    try {
      const res = await fetch('/api/dashboard/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, userId, date }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult({ ok: false, error: data.error ?? 'Error' })
      } else {
        const name = data.studentName as string
        const atCapacity = data.atCapacity === true
        setResult({ ok: true, name, walkin: false, atCapacity })
        if (data.alreadyCheckedIn) {
          setResult({ ok: false, error: `${name} already checked in` })
        } else {
          setCheckins(prev => [name, ...prev])
        }
      }
    } catch {
      setResult({ ok: false, error: 'Network error' })
    }
    setTimeout(() => setResult(null), 3000)
  }, [classId, date])

  const startCamera = useCallback(async () => {
    setCamError(null)
    setScanning(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // BarcodeDetector (Chrome/Android/Safari 17+)
      if ('BarcodeDetector' in window) {
        const detector = new BarcodeDetector({ formats: ['qr_code'] })
        setScanning(true)
        const tick = async () => {
          if (videoRef.current && videoRef.current.readyState === 4) {
            try {
              const codes = await detector.detect(videoRef.current)
              if (codes[0]) processQR(codes[0].rawValue)
            } catch { /* ignore frame errors */ }
          }
          rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
      } else {
        // Fallback: BarcodeDetector not available, show file input
        setScanning(false)
        setCamError('live-scan-unavailable')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      setCamError(msg.includes('Permission') || msg.includes('NotAllowed')
        ? 'Camera permission denied. Allow camera access and try again.'
        : 'Could not access camera.')
    }
  }, [processQR])

  useEffect(() => {
    startCamera()
    return () => {
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [startCamera])

  // File-input fallback handler
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const img = document.createElement('img')
    img.src = URL.createObjectURL(file)
    await new Promise(r => { img.onload = r })
    if ('BarcodeDetector' in window) {
      const detector = new BarcodeDetector({ formats: ['qr_code'] })
      const codes = await detector.detect(img as unknown as HTMLImageElement)
      if (codes[0]) await processQR(codes[0].rawValue)
      else setResult({ ok: false, error: 'No QR code found in image' })
    }
    URL.revokeObjectURL(img.src)
    e.target.value = ''
  }

  const localDate = new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0E0E0E' }}>

      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-center justify-between shrink-0">
        <div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500, letterSpacing: '.06em', textTransform: 'uppercase' }}>QR Check-in</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginTop: 2 }}>{className}</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{localDate}</p>
        </div>
        <button onClick={startCamera}
          style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10, padding: 10, cursor: 'pointer', color: '#fff' }}>
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Camera viewfinder */}
      <div className="relative flex-1 flex items-center justify-center" style={{ minHeight: 320 }}>
        <video ref={videoRef} playsInline muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />

        {/* Scan frame overlay */}
        {scanning && !result && (
          <div style={{ position: 'relative', zIndex: 10, width: 220, height: 220 }}>
            {([
              { top: 0,    left: 0,    bt: '3px solid #fff', bl: '3px solid #fff', br: 'none', bb: 'none', bdR: '4px 0 0 0' },
              { top: 0,    right: 0,   bt: '3px solid #fff', br: '3px solid #fff', bl: 'none', bb: 'none', bdR: '0 4px 0 0' },
              { bottom: 0, left: 0,    bb: '3px solid #fff', bl: '3px solid #fff', bt: 'none', br: 'none', bdR: '0 0 0 4px' },
              { bottom: 0, right: 0,   bb: '3px solid #fff', br: '3px solid #fff', bt: 'none', bl: 'none', bdR: '0 0 4px 0' },
            ] as const).map((c, i) => (
              <div key={i} style={{
                position: 'absolute', width: 28, height: 28,
                top: 'top' in c ? c.top : undefined,
                bottom: 'bottom' in c ? c.bottom : undefined,
                left: 'left' in c ? c.left : undefined,
                right: 'right' in c ? c.right : undefined,
                borderTop: c.bt, borderBottom: c.bb, borderLeft: c.bl, borderRight: c.br,
                borderRadius: c.bdR,
              }} />
            ))}
          </div>
        )}

        {/* Dark overlay when no camera */}
        {!scanning && !camError && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" style={{ borderColor: '#fff', borderTopColor: 'transparent' }} />
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Starting camera…</p>
            </div>
          </div>
        )}

        {/* Result overlay */}
        {result && (
          <div style={{ position: 'absolute', inset: 0, background: result.ok ? 'rgba(22,163,74,0.85)' : 'rgba(220,38,38,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 20, backdropFilter: 'blur(4px)' }}>
            {result.ok
              ? <><CheckCircle size={52} color="#fff" strokeWidth={1.5} /><p style={{ fontSize: 20, fontWeight: 700, color: '#fff', textAlign: 'center', padding: '0 24px' }}>{result.name}</p><p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>Checked in ✓</p>{result.atCapacity && <p style={{ fontSize: 12, fontWeight: 600, color: '#FEF08A' }}>⚠ Class is at capacity</p>}</>
              : <><XCircle size={52} color="#fff" strokeWidth={1.5} /><p style={{ fontSize: 15, fontWeight: 600, color: '#fff', textAlign: 'center', padding: '0 24px' }}>{result.error}</p></>
            }
          </div>
        )}

        {/* Camera error */}
        {camError && camError !== 'live-scan-unavailable' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, zIndex: 10, padding: 24 }}>
            <Camera size={36} color="rgba(255,255,255,0.4)" />
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center' }}>{camError}</p>
            <button onClick={startCamera}
              style={{ background: '#0870E2', border: 'none', borderRadius: 10, padding: '10px 20px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Bottom panel */}
      <div style={{ background: '#1A1A1A', padding: '16px 16px 32px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>

        {/* File input fallback */}
        {camError === 'live-scan-unavailable' && (
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#0870E2', border: 'none', borderRadius: 12, padding: '12px 0', cursor: 'pointer', width: '100%', marginBottom: 12 }}>
            <Camera size={16} color="#fff" />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Scan QR with camera</span>
            <input type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: 'none' }} />
          </label>
        )}

        {/* Checked-in list */}
        <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8 }}>
          Checked in today — {checkins.length}
        </p>
        {checkins.length === 0 ? (
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '12px 0' }}>No check-ins yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 160, overflowY: 'auto' }}>
            {checkins.map((name, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < checkins.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(22,163,74,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle size={14} color="#4ade80" />
                </div>
                <span style={{ fontSize: 14, color: '#fff' }}>{name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
