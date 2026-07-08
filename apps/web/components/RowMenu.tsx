'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const MARGIN = 8

// Row-actions dropdown rendered via portal to document.body, positioned from the
// trigger's bounding rect. Table row/cell wrappers are often `overflow-hidden`
// (to keep rounded card corners), which clips a plain `position: absolute`
// dropdown whenever it doesn't fit inside the remaining table height — a portal
// escapes that ancestor clipping entirely. Position is then flipped/clamped to
// the viewport so the menu never renders partly or fully off-screen (e.g. rows
// near the bottom of the page, or nested submenus that grow the menu's height).
export default function RowMenu({ trigger, children, align = 'right' }: {
  trigger: (props: { onClick: (e: React.MouseEvent) => void }) => ReactNode
  children: ReactNode
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number; ready: boolean }>({ top: 0, ready: false })
  const anchorRef = useRef<HTMLSpanElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const reposition = useCallback(() => {
    if (!anchorRef.current || !menuRef.current) return
    const r = anchorRef.current.getBoundingClientRect()
    const menuRect = menuRef.current.getBoundingClientRect()

    let top = r.bottom + 4
    if (top + menuRect.height > window.innerHeight - MARGIN) {
      const above = r.top - menuRect.height - 4
      top = above > MARGIN ? above : Math.max(MARGIN, window.innerHeight - menuRect.height - MARGIN)
    }

    const next: { top: number; left?: number; right?: number; ready: boolean } = { top, ready: true }
    if (align === 'right') {
      let right = window.innerWidth - r.right
      if (window.innerWidth - right - menuRect.width < MARGIN) {
        right = Math.max(MARGIN, window.innerWidth - menuRect.width - MARGIN)
      }
      next.right = right
    } else {
      let left = r.left
      if (left + menuRect.width > window.innerWidth - MARGIN) {
        left = Math.max(MARGIN, window.innerWidth - menuRect.width - MARGIN)
      }
      next.left = left
    }
    setPos(next)
  }, [align])

  function toggle(e: React.MouseEvent) {
    e.stopPropagation()
    if (!open && anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect()
      setPos(align === 'right'
        ? { top: r.bottom + 4, right: window.innerWidth - r.right, ready: false }
        : { top: r.bottom + 4, left: r.left, ready: false })
    }
    setOpen(o => !o)
  }

  // Runs before paint so the flipped/clamped position never flashes in the wrong spot.
  useLayoutEffect(() => {
    if (open) reposition()
  }, [open, reposition])

  // Nested submenus (e.g. status/belt change) grow the menu after it's already open —
  // re-run the same clamp whenever the rendered menu's size changes.
  useEffect(() => {
    if (!open || !menuRef.current) return
    const observer = new ResizeObserver(() => reposition())
    observer.observe(menuRef.current)
    return () => observer.disconnect()
  }, [open, reposition])

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  return (
    <span ref={anchorRef} style={{ display: 'inline-flex' }}>
      {trigger({ onClick: toggle })}
      {open && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            className="fixed z-50"
            style={{ top: pos.top, left: pos.left, right: pos.right, visibility: pos.ready ? 'visible' : 'hidden' }}
            onClick={() => setOpen(false)}
          >
            {children}
          </div>
        </>,
        document.body,
      )}
    </span>
  )
}
