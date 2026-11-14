'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  X, Loader2, Search, ArrowLeftRight, AlertTriangle, Ban, Lock, CheckCircle2, Merge, KeyRound, Mail,
} from 'lucide-react'
import { adminFetch } from '@/lib/api/adminFetch'
import type { MergePreview } from '@/lib/accountMergeServer'

type Side = 'keep' | 'merge'
type Preview = MergePreview
type Account = Preview['keep']

const PROVIDER_LABEL: Record<string, string> = { email: 'Email', apple: 'Apple', google: 'Google', azure: 'Microsoft' }

function fmtDate(iso: string | Date | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function providersOf(a: Account) {
  if (!a.login) return 'No login'
  return a.login.providers.map(p => PROVIDER_LABEL[p] ?? p).join(' + ') || 'Email'
}

function Avatar({ a, size = 36 }: { a: { name: string | null; email: string; avatarUrl: string | null }; size?: number }) {
  return a.avatarUrl
    ? <img src={a.avatarUrl} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
    : (
      <div className="rounded-full bg-[#0870E2]/10 flex items-center justify-center text-[#0870E2] text-[11px] font-bold shrink-0"
        style={{ width: size, height: size }}>
        {(a.name || a.email).slice(0, 2).toUpperCase()}
      </div>
    )
}

const COUNT_LABELS: [string, string][] = [
  ['bookings', 'Bookings'], ['transactions', 'Payments'], ['memberships', 'Memberships'], ['gradings', 'Gradings'],
  ['eventBookings', 'Event tickets'], ['orders', 'Orders'], ['userWaivers', 'Waivers'], ['leads', 'Leads'], ['loginHistory', 'Logins'],
]

function AccountCard({ a, kind }: { a: Account; kind: Side }) {
  const counts = a.counts as Record<string, number>
  return (
    <div className="rounded-2xl border p-4 space-y-3 min-w-0"
      style={kind === 'keep'
        ? { borderColor: '#BBF7D0', background: '#F0FDF4' }
        : { borderColor: '#FECACA', background: '#FEF2F2' }}>
      <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: kind === 'keep' ? '#15803D' : '#B91C1C' }}>
        {kind === 'keep' ? 'Keep — this account stays' : 'Merge — emptied and removed'}
      </p>
      <div className="flex items-center gap-3 min-w-0">
        <Avatar a={a} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#101828] truncate">{a.name || '—'}</p>
          <p className="text-[11px] text-gray-500 truncate">{a.email}</p>
        </div>
      </div>
      <div className="text-[11px] text-gray-600 space-y-0.5">
        <p>Created {fmtDate(a.createdAt)} · {a.role}</p>
        <p>Login: <span className="font-semibold">{providersOf(a)}</span>{a.login?.lastSignInAt ? ` · last used ${fmtDate(a.login.lastSignInAt)}` : ''}</p>
      </div>
      {a.schools.length > 0 && (
        <div className="space-y-1">
          {a.schools.map(s => (
            <p key={s.schoolId} className="text-[11px] text-gray-700">
              <span className="font-semibold">{s.schoolName}</span> · {s.status}{s.role !== 'STUDENT' ? ` · ${s.role}` : ''}
              {s.belt ? ` · ${s.belt}${s.beltDegree ? ` ${s.beltDegree}°` : ''}` : ''}
            </p>
          ))}
        </div>
      )}
      {a.memberships.length > 0 && (
        <div className="space-y-1">
          {a.memberships.slice(0, 4).map(m => (
            <p key={m.id} className="text-[11px] text-gray-600">
              {m.planName} · <span className={m.status === 'ACTIVE' ? 'font-semibold text-emerald-700' : ''}>{m.status}</span>
              {m.endDate ? ` · until ${fmtDate(m.endDate)}` : ''}
            </p>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {COUNT_LABELS.filter(([k]) => counts[k]).map(([k, label]) => (
          <span key={k} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">
            {counts[k]} {label}
          </span>
        ))}
      </div>
    </div>
  )
}

function Choice({ icon, title, value, onChange, options }: {
  icon: React.ReactNode
  title: string
  value: Side
  onChange: (v: Side) => void
  options: { side: Side; label: string; sub?: string; disabled?: boolean }[]
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{icon}{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map(o => (
          <button key={o.side} type="button" disabled={o.disabled} onClick={() => onChange(o.side)}
            className="text-left rounded-xl border px-3 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-w-0"
            style={value === o.side
              ? { borderColor: '#0870E2', background: '#EFF6FF', boxShadow: '0 0 0 2px rgba(8,112,226,0.12)' }
              : { borderColor: '#E5E7EB', background: '#fff' }}>
            <p className="text-xs font-semibold text-[#101828] truncate">{o.label}</p>
            {o.sub && <p className="text-[11px] text-gray-500 truncate">{o.sub}</p>}
          </button>
        ))}
      </div>
    </div>
  )
}

type Picked = { id: string; name: string | null; email: string; avatarUrl: string | null }

// Search for the second account when the modal opens from one user's row.
function AccountPicker({ excludeId, onPick }: { excludeId: string; onPick: (id: string) => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Picked[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return }
    setLoading(true)
    const t = setTimeout(() => {
      adminFetch(`/api/admin/users?${new URLSearchParams({ search: q.trim() })}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => setResults((d?.users ?? []).filter((u: Picked) => u.id !== excludeId)))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(t)
  }, [q, excludeId])

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600">Find the other account of the same person (name or email).</p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search users…"
          className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0870E2] focus:ring-2 focus:ring-[#0870E2]/10" />
      </div>
      <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 rounded-xl border border-gray-100">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-gray-300" /></div>
        ) : results.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">{q.trim().length < 2 ? 'Type at least 2 characters' : 'No users found'}</p>
        ) : results.map(u => (
          <button key={u.id} type="button" onClick={() => onPick(u.id)}
            className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50">
            <Avatar a={u} size={28} />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#101828] truncate">{u.name || '—'}</p>
              <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

const MOVED_LABEL: Record<string, string> = {
  bookings: 'bookings', memberships: 'memberships', transactions: 'payments', loginHistory: 'login records',
  schoolMembers: 'school memberships', schoolMembersCombined: 'school profiles combined', gradings: 'gradings',
  leads: 'leads', bookingsCancelledAsDuplicate: 'double bookings cancelled',
}

export default function MergeAccountsModal({ firstId, secondId, onClose, onMerged }: {
  firstId: string
  secondId?: string
  onClose: () => void
  onMerged: (message: string) => void
}) {
  const [otherId, setOtherId] = useState<string | null>(secondId ?? null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ moved: Record<string, number>; keptEmail: string } | null>(null)
  const [uncertain, setUncertain] = useState(false)
  const [alreadyMerged, setAlreadyMerged] = useState(false)

  // Resolves true only when a fresh preview arrived.
  const load = useCallback((params: Record<string, string>): Promise<boolean> => {
    setLoading(true)
    setError('')
    return adminFetch(`/api/admin/users/merge?${new URLSearchParams(params)}`)
      .then(async r => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(d.error || 'Could not load accounts')
        // One of the two no longer exists because it was merged — e.g. the
        // POST went through but its answer was lost.
        if (d.alreadyMerged) { setAlreadyMerged(true); return true }
        setPreview(d)
        return true
      })
      .catch(e => { setError(e instanceof Error ? e.message : 'Could not load accounts'); return false })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (otherId) load({ keepId: firstId, mergeId: otherId, suggest: '1' })
  }, [firstId, otherId, load])

  function update(next: { keepId: string; mergeId: string; loginFrom?: Side; emailFrom?: Side }) {
    const p: Record<string, string> = { keepId: next.keepId, mergeId: next.mergeId }
    if (next.loginFrom) p.loginFrom = next.loginFrom
    if (next.emailFrom) p.emailFrom = next.emailFrom
    return load(p)
  }

  async function handleMerge() {
    if (!preview) return
    setBusy(true)
    setError('')
    setUncertain(false)
    // A bit longer than the route's 60 s budget; past that the answer is lost.
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 75_000)
    try {
      const res = await adminFetch('/api/admin/users/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...preview.choice, password }),
        signal: ctrl.signal,
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || 'Merge failed'); return }
      setDone({ moved: d.moved ?? {}, keptEmail: d.keptEmail })
      onMerged(`${preview.keep.name || preview.keep.email}: accounts merged`)
    } catch {
      // No answer: the merge may or may not have run on the server.
      setUncertain(true)
    } finally {
      clearTimeout(timer)
      setBusy(false)
    }
  }

  // Reload the preview: if the merge went through, it now shows the merged
  // account as a blocker instead of letting the admin run it twice.
  // Merge stays disabled until this succeeds; a failed check keeps the
  // warning up so it can be repeated.
  async function checkResult() {
    if (!preview) return
    if (await update(preview.choice)) setUncertain(false)
    else setError('Couldn’t check the result — try “Check result” again.')
  }

  const c = preview?.choice
  const blocked = !!preview && preview.blockers.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-5 sm:p-6"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-[#101828]"><Merge className="w-4 h-4" /> Merge accounts</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {alreadyMerged && !done ? (
          <div className="py-6 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="w-9 h-9 text-emerald-500" />
            <p className="text-sm font-semibold text-gray-900">These accounts are already merged</p>
            <p className="text-xs text-gray-500 max-w-md">One of them was merged into the other, so there’s nothing left to do.</p>
            <button onClick={onClose} className="mt-2 h-10 px-6 rounded-xl bg-[#0870E2] text-white text-sm font-semibold hover:bg-[#0660c8]">Done</button>
          </div>
        ) : done ? (
          <div className="py-6 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="w-9 h-9 text-emerald-500" />
            <p className="text-sm font-semibold text-gray-900">Accounts merged</p>
            <p className="text-xs text-gray-500 max-w-md">
              Everything now lives on <strong>{done.keptEmail}</strong>.{' '}
              {Object.entries(done.moved).filter(([k]) => MOVED_LABEL[k]).map(([k, n]) => `${n} ${MOVED_LABEL[k]}`).join(', ') || 'Nothing needed moving.'}
            </p>
            <button onClick={onClose} className="mt-2 h-10 px-6 rounded-xl bg-[#0870E2] text-white text-sm font-semibold hover:bg-[#0660c8]">Done</button>
          </div>
        ) : !otherId ? (
          <AccountPicker excludeId={firstId} onPick={setOtherId} />
        ) : !preview ? (
          <div className="flex items-center justify-center h-40">
            {error ? <p className="text-xs text-red-500">{error}</p> : <Loader2 className="w-5 h-5 animate-spin text-gray-300" />}
          </div>
        ) : (
          <div className={`space-y-4 ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
              <AccountCard a={preview.keep} kind="keep" />
              <button type="button" title="Swap which account is kept"
                onClick={() => update({ keepId: preview.merge.id, mergeId: preview.keep.id })}
                className="self-center mx-auto w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-500">
                <ArrowLeftRight className="w-4 h-4" />
              </button>
              <AccountCard a={preview.merge} kind="merge" />
            </div>

            {c && (
              <>
                <Choice icon={<KeyRound className="w-3.5 h-3.5" />} title="Sign-in to keep" value={c.loginFrom}
                  onChange={v => update({ keepId: c.keepId, mergeId: c.mergeId, loginFrom: v, emailFrom: c.emailFrom })}
                  options={(['keep', 'merge'] as Side[]).map(s => {
                    const a = s === 'keep' ? preview.keep : preview.merge
                    return {
                      side: s,
                      label: a.login ? providersOf(a) : 'No login',
                      sub: a.login ? `${a.login.email ?? ''}${a.login.lastSignInAt ? ` · last used ${fmtDate(a.login.lastSignInAt)}` : ''}` : undefined,
                      disabled: !a.login,
                    }
                  })} />
                <Choice icon={<Mail className="w-3.5 h-3.5" />} title="Email to keep" value={c.emailFrom}
                  onChange={v => update({ keepId: c.keepId, mergeId: c.mergeId, loginFrom: c.loginFrom, emailFrom: v })}
                  options={(['keep', 'merge'] as Side[]).map(s => ({ side: s, label: (s === 'keep' ? preview.keep : preview.merge).email }))} />
                <p className="text-[11px] text-gray-400">
                  An account keeps a single sign-in. The other one is disabled so it can’t create the duplicate again.
                </p>
              </>
            )}

            {preview.blockers.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-1">
                {preview.blockers.map(b => <p key={b} className="flex gap-2 text-xs text-red-700"><Ban className="w-3.5 h-3.5 shrink-0 mt-0.5" />{b}</p>)}
              </div>
            )}
            {preview.warnings.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1">
                {preview.warnings.map(w => <p key={w} className="flex gap-2 text-xs text-amber-800"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{w}</p>)}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Confirm your password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your account password"
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0870E2] focus:ring-2 focus:ring-[#0870E2]/10" />
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">This can’t be undone from the app.</p>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}
            {uncertain && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                <p className="flex gap-2 text-xs text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  No answer from the server, so the merge may or may not have happened. Check the result before trying again.
                </p>
                <button type="button" onClick={checkResult} disabled={loading}
                  className="disabled:opacity-50 h-8 px-3 rounded-lg border border-amber-300 bg-white text-xs font-semibold text-amber-800 hover:bg-amber-100">
                  Check result
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={onClose}
                className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button type="button" onClick={handleMerge} disabled={busy || blocked || !password || uncertain}
                className="flex-1 h-10 rounded-xl bg-[#DC2626] text-white text-sm font-semibold hover:bg-[#B91C1C] disabled:opacity-50 flex items-center justify-center gap-2">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Merge className="w-4 h-4" />}
                {busy ? 'Merging…' : 'Merge accounts'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
