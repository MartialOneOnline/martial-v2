'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import SignaturePadLib from 'signature_pad'

export type SignaturePadHandle = {
  toDataURL: () => string | null
  clear: () => void
  isEmpty: () => boolean
}

const SignaturePad = forwardRef<SignaturePadHandle, { height?: number }>(function SignaturePad(
  { height = 160 },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePadLib | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let lastWidth = 0
    let lastHeight = 0

    // Mobile browsers (especially in-app WebViews like Gmail's) fire
    // `resize` constantly — keyboard open/close, address-bar collapse on
    // scroll — without the canvas's own CSS box actually changing size.
    // Resizing the backing bitmap always clears it, so blindly doing that
    // on every event wiped a signature the user had already drawn, right
    // before they tapped submit. Only touch the bitmap (and preserve any
    // ink already on it) when the box size has genuinely changed.
    function resize() {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      if (rect.width === lastWidth && rect.height === lastHeight) return
      lastWidth = rect.width
      lastHeight = rect.height

      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      const data = padRef.current && !padRef.current.isEmpty() ? padRef.current.toData() : null
      canvas.width = rect.width * ratio
      canvas.height = rect.height * ratio
      canvas.getContext('2d')?.scale(ratio, ratio)
      padRef.current?.clear()
      if (data) padRef.current?.fromData(data)
    }

    padRef.current = new SignaturePadLib(canvas, { penColor: '#111827', backgroundColor: '#ffffff' })
    resize()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      padRef.current?.off()
    }
  }, [])

  useImperativeHandle(ref, () => ({
    toDataURL: () => (padRef.current && !padRef.current.isEmpty() ? padRef.current.toDataURL('image/png') : null),
    clear: () => padRef.current?.clear(),
    isEmpty: () => padRef.current?.isEmpty() ?? true,
  }))

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height, touchAction: 'none', cursor: 'crosshair' }} />
    </div>
  )
})

export default SignaturePad
