'use client'

import { useCallback, useEffect, useState } from 'react'
import { Copy, Menu, RefreshCw, CheckCircle2, Merge, Phone, User as UserIcon } from 'lucide-react'
import { adminFetch } from '@/lib/api/adminFetch'
import { useAdminShell } from '../../AdminLayoutClient'
import MergeAccountsModal from '../MergeAccountsModal'

type Person = {
  id: string; name: string | null; email: string; avatarUrl: string | null; createdAt: string
  schools: string[]; bookings: number; memberships: number
}
type Pair = { a: Person; b: Person; reasons: ('name' | 'phone')[] }

function PersonCell({ p }: { p: Person }) {
  return (
    <div className="flex items-center gap-3 min-w-0 flex-1">
      {p.avatarUrl
        ? <img src={p.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
        : <div className="w-8 h-8 rounded-full bg-[#0870E2]/10 flex items-center justify-center text-[#0870E2] text-[11px] font-bold shrink-0">{(p.name || p.email).slice(0, 2).toUpperCase()}</div>}
      <div className="min-w-0">
        <p className="text-xs font-semibold text-[#101828] truncate">{p.name || '—'}</p>
        <p className="text-[11px] text-gray-400 truncate">{p.email}</p>
        <p className="text-[10px] text-gray-400 truncate">
          {p.schools.join(', ') || 'No school'} · {p.bookings} bookings · {p.memberships} memberships
        </p>
      </div>
    </div>
  )
}

export default function DuplicatesClient() {
  const { menuOpen, setMenuOpen } = useAdminShell()
  const [pairs, setPairs] = useState<Pair[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState<Pair | null>(null)
  const [banner, setBanner] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    adminFetch('/api/admin/users/duplicates')
      .then(r => r.ok ? r.json() : null)
      .then(d => setPairs(d?.pairs ?? []))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!banner) return
    const t = setTimeout(() => setBanner(null), 4000)
    return () => clearTimeout(t)
  }, [banner])

  return (
    <div className="min-h-screen">
      {reviewing && (
        <MergeAccountsModal
          firstId={reviewing.a.id}
          secondId={reviewing.b.id}
          onClose={() => { setReviewing(null); load() }}
          onMerged={setBanner}
        />
      )}
      {banner && (
        <div className="fixed top-4 right-4 z-[70] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium"
          style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />{banner}
        </div>
      )}

      <div className="bg-white border-b border-gray-100 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(!menuOpen)}>
            <Menu size={16} style={{ color: '#374151' }} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-[#101828]">Possible duplicates</h1>
            <p className="text-xs text-gray-400">Accounts with the same name or phone — check before merging, two people can share a name</p>
          </div>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="p-4 md:p-8">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm divide-y divide-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-[#0870E2] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pairs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Copy className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">No likely duplicates</p>
            </div>
          ) : pairs.map(p => (
            <div key={`${p.a.id}|${p.b.id}`} className="flex flex-col md:flex-row md:items-center gap-3 px-4 md:px-6 py-3">
              <div className="flex gap-1.5 md:w-28 shrink-0">
                {p.reasons.map(r => (
                  <span key={r} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                    {r === 'name' ? <UserIcon className="w-3 h-3" /> : <Phone className="w-3 h-3" />}{r === 'name' ? 'Name' : 'Phone'}
                  </span>
                ))}
              </div>
              <PersonCell p={p.a} />
              <PersonCell p={p.b} />
              <button onClick={() => setReviewing(p)}
                className="shrink-0 flex items-center justify-center gap-1.5 h-8 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                <Merge className="w-3.5 h-3.5" /> Review
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
