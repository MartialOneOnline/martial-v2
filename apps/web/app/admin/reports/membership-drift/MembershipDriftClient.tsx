'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react'
import { adminFetch } from '@/lib/api/adminFetch'
import { memberStatusColors, type MemberStatus } from '@/lib/design/tokens'

interface DriftedMember {
  id: string
  schoolName: string
  status: string
  userName: string | null
  userEmail: string
}

export default function MembershipDriftClient() {
  const [members, setMembers] = useState<DriftedMember[] | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    adminFetch('/api/admin/membership-drift')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setMembers(d.members); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-[#101828]">Membership status drift</h1>
          <p className="text-xs text-gray-400">
            Members with an ACTIVE membership whose access status disagrees — should stay empty
          </p>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {loading || members === null ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-[#0870E2] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-300">
          <ShieldCheck className="w-10 h-10" />
          <p className="text-sm text-gray-400">No drift found — every active membership matches an active member.</p>
        </div>
      ) : (
        <div className="p-8">
          <div className="bg-white border border-amber-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-amber-100 bg-amber-50/40 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-semibold text-amber-800">{members.length} member{members.length > 1 ? 's' : ''} need attention</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-6 py-3">Member</th>
                  <th className="px-6 py-3">School</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => {
                  const cfg = memberStatusColors[m.status as MemberStatus]
                  return (
                    <tr key={m.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-6 py-3.5">
                        <p className="font-semibold text-[#101828]">{m.userName ?? m.userEmail}</p>
                        <p className="text-xs text-gray-400">{m.userEmail}</p>
                      </td>
                      <td className="px-6 py-3.5 text-gray-600">{m.schoolName}</td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: cfg?.bg ?? '#F3F4F6', color: cfg?.text ?? '#6B7280', border: `1px solid ${cfg?.border ?? '#E5E7EB'}` }}>
                          {cfg?.label ?? m.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Fix from the school&apos;s own dashboard (Users → member profile → edit status), so the change is scoped to that school&apos;s admin.
          </p>
        </div>
      )}
    </div>
  )
}
