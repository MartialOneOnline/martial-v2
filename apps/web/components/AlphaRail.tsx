'use client'

import { useEffect, useRef, useState } from 'react'

// Hide the letter bubble this long after the last jump if no end-of-touch
// event arrives (iOS can drop them while the page scrolls under the finger).
const BUBBLE_FALLBACK_MS = 800

// Contact-book letter rail fixed to the right edge of the screen, for lists that
// scroll with the page (mobile). Tap a letter or drag a finger along it; a
// bubble shows the letter being jumped to. Letters without a section are
// greyed out and resolve to the nearest one (see nearestPresentKey).
export default function AlphaRail({
  letters, present, current, top, label, letterLabel, onJump,
}: {
  letters: string[]
  present: Set<string>
  current: string | null
  /** Distance from the top of the viewport (below the sticky topbar), px. */
  top: number
  label: string
  /** aria-label for one letter, e.g. "Jump to {l}". */
  letterLabel: string
  /** Scroll to the letter's section; returns the key actually landed on. */
  onJump: (letter: string) => string | null
}) {
  const railRef = useRef<HTMLDivElement>(null)
  const [bubble, setBubble] = useState<{ key: string; y: number } | null>(null)

  // The bubble only lives while the finger is on the rail. iOS Safari doesn't
  // always deliver pointerup/cancel to the rail when the page scrolls under the
  // finger (which is exactly what a jump does), and the bubble stayed stuck.
  // So: hide on any end-of-touch anywhere on the page, and as a fallback a
  // moment after the last jump (each new jump while dragging restarts it).
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideBubble = () => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null }
    setBubble(null)
  }
  useEffect(() => {
    if (!bubble) return
    const end = () => hideBubble()
    const events = ['pointerup', 'pointercancel', 'touchend', 'touchcancel'] as const
    events.forEach(ev => window.addEventListener(ev, end, true))
    return () => events.forEach(ev => window.removeEventListener(ev, end, true))
  }, [bubble])
  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current) }, [])

  const letterAt = (clientY: number): HTMLElement | null => {
    const items = railRef.current?.querySelectorAll<HTMLElement>('[data-letter]')
    if (!items?.length) return null
    let hit: HTMLElement = items[0]!
    for (const el of items) if (clientY >= el.getBoundingClientRect().top) hit = el
    return hit
  }

  const scrub = (clientY: number) => {
    const el = letterAt(clientY)
    if (!el) return
    const key = onJump(el.dataset.letter!)
    if (!key) return
    const r = el.getBoundingClientRect()
    setBubble({ key, y: r.top + r.height / 2 })
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(hideBubble, BUBBLE_FALLBACK_MS)
  }

  return (
    <>
      <div ref={railRef} role="navigation" aria-label={label}
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); scrub(e.clientY) }}
        onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) scrub(e.clientY) }}
        onPointerUp={hideBubble}
        onPointerCancel={hideBubble}
        style={{ position: 'fixed', right: 'calc(1px + env(safe-area-inset-right, 0px))', top: top + 8,
          bottom: 'calc(10px + env(safe-area-inset-bottom, 0px))', width: 20, zIndex: 15,
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
        {letters.map(l => {
          const has = present.has(l)
          const cur = l === current
          return (
            // Not `disabled`: a disabled button can swallow pointer events and
            // break a drag that crosses an empty letter.
            <button key={l} type="button" data-letter={l} aria-disabled={!has} tabIndex={has ? 0 : -1}
              aria-label={letterLabel.replace('{l}', l)}
              // Pointer handling lives on the rail (it also serves drags);
              // this keeps keyboard activation working.
              onClick={e => { if (e.detail === 0 && has) onJump(l) }}
              style={{ flex: 1, maxHeight: 24, width: 20, padding: 0, border: 'none', borderRadius: 5, lineHeight: 1,
                fontSize: 10.5, fontWeight: 700, cursor: has ? 'pointer' : 'default',
                background: cur ? '#0870E2' : 'transparent', color: cur ? '#fff' : has ? '#0870E2' : '#D1D5DB' }}>
              {l}
            </button>
          )
        })}
      </div>
      {bubble && (
        <div aria-hidden style={{ position: 'fixed', right: 44, top: bubble.y - 28, width: 56, height: 56, borderRadius: 16,
          background: '#0E3A7A', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 26, fontWeight: 800,
          zIndex: 16, pointerEvents: 'none', boxShadow: '0 8px 20px rgba(14,58,122,0.3)' }}>
          {bubble.key}
        </div>
      )}
    </>
  )
}
