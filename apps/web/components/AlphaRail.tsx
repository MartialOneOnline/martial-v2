'use client'

import { useRef, useState } from 'react'

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
  }

  return (
    <>
      <div ref={railRef} role="navigation" aria-label={label}
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); scrub(e.clientY) }}
        onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) scrub(e.clientY) }}
        onPointerUp={() => setBubble(null)}
        onPointerCancel={() => setBubble(null)}
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
