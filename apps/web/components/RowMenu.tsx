'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// Row-actions dropdown rendered via portal to document.body, positioned from the
// trigger's bounding rect. Table row/cell wrappers are often `overflow-hidden`
// (to keep rounded card corners), which clips a plain `position: absolute`
// dropdown whenever it doesn't fit inside the remaining table height — a portal
// escapes that ancestor clipping entirely.
export default function RowMenu({ trigger, children, align = 'right' }: {
  trigger: (props: { onClick: (e: React.MouseEvent) => void }) => ReactNode
  children: ReactNode
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number }>({ top: 0 })
  const anchorRef = useRef<HTMLSpanElement>(null)

  function toggle(e: React.MouseEvent) {
    e.stopPropagation()
    if (!open && anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect()
      setPos(align === 'right'
        ? { top: r.bottom + 4, right: window.innerWidth - r.right }
        : { top: r.bottom + 4, left: r.left })
    }
    setOpen(o => !o)
  }

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
          <div className="fixed z-50" style={{ top: pos.top, left: pos.left, right: pos.right }}
            onClick={() => setOpen(false)}>
            {children}
          </div>
        </>,
        document.body,
      )}
    </span>
  )
}
