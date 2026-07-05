'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Users, Search, ChevronLeft, ChevronRight,
  RefreshCw, Building2, GraduationCap, AlertCircle, CheckCircle2,
} from 'lucide-react'
import { adminFetch } from '@/lib/api/adminFetch'
import { AdminUser, UserActionsMenu, EditUserModal, ContactUserModal, DeleteUserModal } from './UserActions'

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  SUPERADMIN:   { label: 'Super Admin',    cls: 'bg-violet-50 text-violet-700 border border-violet-100' },
  SCHOOL_OWNER: { label: 'School Owner',   cls: 'bg-blue-50 text-blue-700 border border-blue-100' },
  INSTRUCTOR:   { label: 'Instructor',     cls: 'bg-amber-50 text-amber-700 border border-amber-100' },
  STUDENT:      { label: 'Student',        cls: 'bg-gray-100 text-gray-500 border border-gray-200' },
}

const ROLES = ['', 'SUPERADMIN', 'SCHOOL_OWNER', 'INSTRUCTOR', 'STUDENT']

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Avatar({ user }: { user: AdminUser }) {
  const initials = (user.name || user.email).slice(0, 2).toUpperCase()
  return user.avatarUrl
    ? <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
    : (
      <div className="w-8 h-8 rounded-full bg-[#0870E2]/10 flex items-center justify-center text-[#0870E2] text-[11px] font-bold">
        {initials}
      </div>
    )
}

export default function AllUsersClient() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [editUserId, setEditUserId] = useState<string | null>(null)
  const [contactUser, setContactUser] = useState<AdminUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [banner, setBanner] = useState<{ type: 'error' | 'success'; message: string } | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ search, role, page: String(page) })
    adminFetch(`/api/admin/users?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setUsers(d?.users ?? [])
        setTotal(d?.total ?? 0)
        setPages(d?.pages ?? 1)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [search, role, page])

  useEffect(() => { setPage(1) }, [search, role])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!banner) return
    const t = setTimeout(() => setBanner(null), 4000)
    return () => clearTimeout(t)
  }, [banner])

  return (
    <div className="min-h-screen">
      {editUserId && (
        <EditUserModal
          userId={editUserId}
          onClose={() => setEditUserId(null)}
          onSaved={() => { setBanner({ type: 'success', message: 'User updated' }); load() }}
        />
      )}
      {contactUser && (
        <ContactUserModal user={contactUser} onClose={() => setContactUser(null)} />
      )}
      {deleteTarget && (
        <DeleteUserModal
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => { setBanner({ type: 'success', message: `${deleteTarget.name || deleteTarget.email} was deleted` }); load() }}
        />
      )}

      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-[#101828]">All Users</h1>
          <p className="text-xs text-gray-400">{total} registered accounts</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {banner && (
        <div className="fixed top-4 right-4 z-[70] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium"
          style={banner.type === 'error'
            ? { background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }
            : { background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>
          {banner.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          {banner.message}
        </div>
      )}

      <div className="p-8 space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 h-9 rounded-xl border border-gray-200 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0870E2]/20 focus:border-[#0870E2] w-64"
            />
          </div>
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            className="h-9 px-3 rounded-xl border border-gray-200 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0870E2]/20 focus:border-[#0870E2] bg-white"
          >
            {ROLES.map(r => (
              <option key={r} value={r}>{r || 'All roles'}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-visible">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-[#0870E2] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Users className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">No users found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">User</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Role</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">School</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Memberships</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar user={user} />
                        <div>
                          <p className="text-xs font-semibold text-[#101828]">{user.name || '—'}</p>
                          <p className="text-[11px] text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE[user.role]?.cls ?? 'bg-gray-100 text-gray-500'}`}>
                        {ROLE_BADGE[user.role]?.label ?? user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.schoolMembers[0] ? (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Building2 className="w-3 h-3 text-gray-300 shrink-0" />
                          {user.schoolMembers[0].school.name}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <GraduationCap className="w-3 h-3 text-gray-300" />
                        {user._count.memberships}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      <UserActionsMenu
                        user={user}
                        isOpen={openMenuId === user.id}
                        onToggle={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                        onClose={() => setOpenMenuId(null)}
                        onEdit={() => setEditUserId(user.id)}
                        onContact={() => setContactUser(user)}
                        onDelete={() => setDeleteTarget(user)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-gray-500 px-3">{page} / {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
