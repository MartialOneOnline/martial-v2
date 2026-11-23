'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Building2, MapPin, Mail, Phone, Clock, Menu, RefreshCw, Loader2, Search, Link2, Plus,
  AlertTriangle, CheckCircle2, XCircle, RotateCcw, Send, Ban, ExternalLink, History, ArrowRight,
} from 'lucide-react'
import { adminFetch } from '@/lib/api/adminFetch'
import { useAdminShell } from '../../AdminLayoutClient'
import {
  EVENT_LABEL, INVITATION_STATE_BADGE, INVITATION_STATE_LABEL, REQUEST_STATUS_BADGE, REQUEST_STATUS_LABEL,
  type InvitationState, type RequestStatus,
} from '@/lib/claims/labels'

type Candidate = {
  id: string; name: string; slug: string; status: string; city: string | null; country: string | null
  email: string | null; hasOwner: boolean; score: number; reasons: string[]
}
type Invitation = {
  id: string; state: InvitationState; open: boolean; retryWindowPassed: boolean; sentToEmail: string | null; email: string; createdAt: string
  sentAt: string | null; openedAt: string | null; registeredAt: string | null; expiresAt: string | null
  deliveryError: string | null; deliveryStatus: string | null
}
type Detail = {
  request: {
    id: string; status: RequestStatus; schoolName: string; city: string | null; contactName: string; contactEmail: string
    phone: string | null; message: string | null; locale: string | null; createdAt: string; resolvedAt: string | null
    rejectReason: string | null; linkedAt: string | null; linkedBy: string | null; completedAt: string | null
    completedBy: string | null; needsAssociationReview: boolean
  }
  school: { id: string; name: string; slug: string; status: string; city: string | null; country: string | null; email: string | null; owners: { id: string; name: string | null; email: string }[] } | null
  sourceSchool: { id: string; name: string; slug: string; city: string | null } | null
  invitations: Invitation[]
  events: { id: string; type: string; createdAt: string; actor: string | null; data: Record<string, unknown> | null }[]
  candidates: Candidate[]
  nextStep: string
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const btn = 'inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50'
const btnPrimary = `${btn} bg-[#0870E2] text-white hover:bg-[#0660c8]`
const btnGhost = `${btn} border border-gray-200 text-gray-600 hover:bg-gray-50`
const btnDanger = `${btn} border border-red-200 text-red-600 hover:bg-red-50`
const input = 'w-full h-9 px-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0870E2]/20 focus:border-[#0870E2]'
const card = 'bg-white border border-gray-100 rounded-2xl shadow-sm p-4 sm:p-5'

export default function ClaimDetailClient({ requestId }: { requestId: string }) {
  const { menuOpen, setMenuOpen } = useAdminShell()
  const [detail, setDetail] = useState<Detail | null>(null)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const inFlight = useRef(false)
  const loadSeq = useRef(0)
  const [banner, setBanner] = useState<{ type: 'error' | 'success' | 'warning'; message: string } | null>(null)

  // Search / link / create
  const [q, setQ] = useState('')
  const [searchResults, setSearchResults] = useState<Candidate[] | null>(null)
  const [confirmLink, setConfirmLink] = useState<Candidate | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', city: '', country: '' })
  const [duplicates, setDuplicates] = useState<Candidate[] | null>(null)
  // Invitation
  const [inviteForm, setInviteForm] = useState({ recipientEmail: '', recipientName: '' })
  const [confirmInvite, setConfirmInvite] = useState(false)
  // Reject
  const [showReject, setShowReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const load = useCallback(async () => {
    const seq = ++loadSeq.current
    setLoadError('')
    try {
      const res = await adminFetch(`/api/admin/claim-requests/${requestId}`, { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (seq !== loadSeq.current) return // a later load or action already won
      if (!res.ok || !data) { setLoadError(data?.error ?? 'Could not load the request'); return }
      setDetail(data)
    } catch {
      if (seq === loadSeq.current) setLoadError('Could not load the request — check your connection and refresh.')
    }
  }, [requestId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!detail) return
    setCreateForm(f => f.name ? f : { name: detail.request.schoolName, city: detail.request.city ?? '', country: '' })
    setInviteForm(f => f.recipientEmail ? f : { recipientEmail: detail.request.contactEmail, recipientName: detail.request.contactName })
  }, [detail])

  // One action at a time; the server re-validates every transition, so a
  // late or duplicated click can only ever get a 409.
  async function act(key: string, body: Record<string, unknown>, okMessage: string): Promise<{ ok: boolean; data: Record<string, unknown> }> {
    if (inFlight.current) return { ok: false, data: {} }
    inFlight.current = true
    setBusy(key); setBanner(null)
    try {
      const res = await adminFetch(`/api/admin/claim-requests/${requestId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({})) as Record<string, unknown>
      if (data.detail) { loadSeq.current++; setDetail(data.detail as Detail) }
      if (!res.ok) {
        setBanner({ type: 'error', message: (data.error as string) || `Failed (HTTP ${res.status}). Nothing was confirmed — refresh to check.` })
        if (!data.detail) await load()
        return { ok: false, data }
      }
      const delivery = data.delivery as { kind: string; message?: string } | undefined
      if (delivery && delivery.kind !== 'accepted') {
        setBanner({
          type: delivery.kind === 'rejected' ? 'error' : 'warning',
          message: delivery.kind === 'rejected'
            ? `Not sent: Resend rejected the email (${delivery.message}). Nothing reached the invitee.`
            : 'Unknown whether the email went out (timeout or network error). “Retry” is safe — Resend will not deliver it twice.',
        })
        return { ok: false, data }
      }
      setBanner({ type: 'success', message: okMessage })
      return { ok: true, data }
    } catch {
      setBanner({ type: 'error', message: 'Network error — the action may or may not have been applied. Refreshing…' })
      await load()
      return { ok: false, data: {} }
    } finally {
      inFlight.current = false
      setBusy(null)
    }
  }

  async function search() {
    const res = await adminFetch(`/api/admin/claim-requests/${requestId}/candidates?q=${encodeURIComponent(q)}`)
    const data = await res.json().catch(() => ({}))
    setSearchResults(res.ok ? data.candidates ?? [] : [])
  }

  async function createSchool(acknowledged: string[]) {
    const { ok, data } = await act('create', { action: 'create_school', ...createForm, acknowledgedDuplicates: acknowledged }, 'School created and linked')
    if (data.code === 'POSSIBLE_DUPLICATES') { setDuplicates((data.candidates as Candidate[]) ?? []); setBanner({ type: 'warning', message: 'Possible duplicates — review them first.' }); return }
    if (ok) { setShowCreate(false); setDuplicates(null) }
  }

  if (!detail) {
    return (
      <div className="min-h-screen p-6">
        {loadError
          ? <div className="max-w-xl mx-auto bg-red-50 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">{loadError}<button className={btnGhost} onClick={load}>Retry</button></div>
          : <div className="flex justify-center pt-24"><Loader2 className="w-6 h-6 animate-spin text-[#0870E2]" /></div>}
      </div>
    )
  }

  const { request: r, school, invitations } = detail
  const openInvitation = invitations.find(i => i.open && i.state !== 'legacy') ?? null
  const canDecide = r.status === 'PENDING' || r.status === 'IN_PROGRESS'
  const candidates = searchResults ?? detail.candidates

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-4 md:px-8 py-4 flex items-center justify-between gap-3 sticky top-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl shrink-0 bg-gray-50 border border-gray-200" onClick={() => setMenuOpen(!menuOpen)}>
            <Menu size={16} className="text-gray-700" />
          </button>
          <Link href="/admin/schools/verify" className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center shrink-0 hover:bg-gray-50"><ArrowLeft className="w-4 h-4 text-gray-500" /></Link>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-[#101828] truncate">{r.schoolName}</h1>
            <p className="text-xs text-gray-400">Ownership request · {fmt(r.createdAt)}</p>
          </div>
        </div>
        <button onClick={load} className={btnGhost}><RefreshCw className="w-3.5 h-3.5" /><span className="hidden sm:inline">Refresh</span></button>
      </div>

      {banner && (
        <div className={`mx-4 md:mx-8 mt-4 rounded-xl px-4 py-3 text-sm flex items-start gap-2 ${banner.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : banner.type === 'warning' ? 'bg-amber-50 text-amber-800 border border-amber-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
          {banner.type === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span className="flex-1">{banner.message}</span>
          <button onClick={() => setBanner(null)} className="text-xs opacity-60">✕</button>
        </div>
      )}

      <div className="p-4 md:p-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4 min-w-0">
          {/* Status + next step */}
          <div className={card}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${REQUEST_STATUS_BADGE[r.status]}`}>{REQUEST_STATUS_LABEL[r.status]}</span>
              {r.needsAssociationReview && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200">No school recorded</span>}
            </div>
            <p className="mt-3 text-sm text-[#101828] flex items-start gap-2"><ArrowRight className="w-4 h-4 mt-0.5 text-[#0870E2] shrink-0" />{detail.nextStep}</p>
            {r.rejectReason && r.status === 'DISMISSED' && <p className="mt-2 text-xs text-gray-500">Reason: {r.rejectReason}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              {(r.status === 'DISMISSED' || r.status === 'RESOLVED') && (
                <button className={btnPrimary} disabled={!!busy} onClick={() => act('reopen', { action: 'reopen' }, 'Request reopened')}>
                  {busy === 'reopen' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} Reopen
                </button>
              )}
              {(canDecide || r.status === 'RESOLVED') && !showReject && (
                <button className={btnDanger} disabled={!!busy} onClick={() => setShowReject(true)}><XCircle className="w-3.5 h-3.5" /> Reject…</button>
              )}
            </div>
            {showReject && (
              <div className="mt-4 space-y-2">
                <label className="text-xs font-semibold text-gray-500">Why is this request rejected? (kept in the history)</label>
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} maxLength={1000} className={`${input} h-auto py-2`} />
                {openInvitation && <p className="text-xs text-amber-700">The open invitation will be revoked.</p>}
                <div className="flex gap-2">
                  <button className={btnDanger} disabled={!!busy || !rejectReason.trim()} onClick={async () => { const { ok } = await act('reject', { action: 'reject', reason: rejectReason }, 'Request rejected'); if (ok) { setShowReject(false); setRejectReason('') } }}>
                    {busy === 'reject' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Reject request
                  </button>
                  <button className={btnGhost} onClick={() => setShowReject(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Linked school */}
          {school && (
            <div className={card}>
              <h2 className="text-sm font-bold text-[#101828] mb-3 flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-400" /> Linked school</h2>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <Link href={`/admin/schools/${school.id}`} className="text-sm font-semibold text-[#0870E2] hover:underline break-words">{school.name}</Link>
                  <p className="text-xs text-gray-400 mt-0.5">{[school.city, school.country].filter(Boolean).join(', ') || '—'} · {school.status}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Linked {fmt(r.linkedAt)}{r.linkedBy ? ` by ${r.linkedBy}` : ''}</p>
                  {school.owners.length > 0
                    ? <p className="text-xs mt-2 text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Owner: {school.owners.map(o => o.name || o.email).join(', ')}</p>
                    : <p className="text-xs mt-2 text-gray-500">No owner yet</p>}
                </div>
                <div className="flex gap-2">
                  <Link href={`/school/${school.slug}`} target="_blank" className={btnGhost}><ExternalLink className="w-3.5 h-3.5" /> Public page</Link>
                  {r.status === 'IN_PROGRESS' && !openInvitation && (
                    <button className={btnGhost} disabled={!!busy} onClick={() => act('unlink', { action: 'unlink' }, 'School unlinked')}>Unlink</button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Find / link / create */}
          {r.status === 'PENDING' && (
            <div className={card}>
              <h2 className="text-sm font-bold text-[#101828] mb-1 flex items-center gap-2"><Search className="w-4 h-4 text-gray-400" /> Find the school</h2>
              <p className="text-xs text-gray-400 mb-3">Candidates are hints (name, city, email). Nothing is linked until you choose.</p>
              <form onSubmit={e => { e.preventDefault(); search() }} className="flex gap-2 mb-3">
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, slug or city…" className={input} />
                <button className={btnGhost} type="submit">Search</button>
              </form>
              {candidates.length === 0 ? (
                <p className="text-xs text-gray-400 py-3">No candidate schools found.</p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {candidates.map(c => (
                    <li key={c.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/admin/schools/${c.id}`} target="_blank" className="text-sm font-semibold text-[#101828] hover:text-[#0870E2] break-words">{c.name}</Link>
                        <p className="text-[11px] text-gray-400">{[c.city, c.country].filter(Boolean).join(', ') || '—'} · {c.status}{c.hasOwner ? ' · has owner' : ''}</p>
                        {c.reasons.length > 0 && <p className="text-[11px] text-gray-500">{c.reasons.join(' · ')}</p>}
                      </div>
                      <button className={btnGhost} disabled={!!busy} onClick={() => setConfirmLink(c)}><Link2 className="w-3.5 h-3.5" /> Link</button>
                    </li>
                  ))}
                </ul>
              )}
              {confirmLink && (
                <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-sm">
                  <p>Link this request to <strong>{confirmLink.name}</strong>{confirmLink.city ? ` (${confirmLink.city})` : ''}? The request’s original data is kept; the school is not modified.</p>
                  {confirmLink.hasOwner && <p className="mt-1 text-xs text-amber-700">This school already has an owner — you will not be able to invite until that is reviewed.</p>}
                  <div className="mt-2 flex gap-2">
                    <button className={btnPrimary} disabled={!!busy} onClick={async () => { const { ok } = await act('link', { action: 'link', schoolId: confirmLink.id }, `Linked to ${confirmLink.name}`); if (ok) setConfirmLink(null) }}>
                      {busy === 'link' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Confirm link
                    </button>
                    <button className={btnGhost} onClick={() => setConfirmLink(null)}>Cancel</button>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100">
                {!showCreate ? (
                  <button className={btnGhost} onClick={() => setShowCreate(true)}><Plus className="w-3.5 h-3.5" /> School not listed — create it</button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">Creates a new <strong>Unverified</strong> school (it appears in Explore like other unverified listings) and links it. Only these fields are set — the public email stays empty.</p>
                    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_90px]">
                      <input className={input} placeholder="School name" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
                      <input className={input} placeholder="City" value={createForm.city} onChange={e => setCreateForm(f => ({ ...f, city: e.target.value }))} />
                      <input className={input} placeholder="US" maxLength={2} value={createForm.country} onChange={e => setCreateForm(f => ({ ...f, country: e.target.value.toUpperCase() }))} />
                    </div>
                    {duplicates && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <p className="text-xs font-semibold text-amber-800 mb-1">Possible duplicates</p>
                        <ul className="text-xs text-amber-900 space-y-1">
                          {duplicates.map(d => <li key={d.id}><Link href={`/admin/schools/${d.id}`} target="_blank" className="underline">{d.name}</Link> — {d.reasons.join(' · ')}</li>)}
                        </ul>
                        <button className={`${btnGhost} mt-2`} disabled={!!busy} onClick={() => createSchool(duplicates.map(d => d.id))}>I reviewed them — none is this school, create it</button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button className={btnPrimary} disabled={!!busy || !createForm.name.trim()} onClick={() => createSchool([])}>
                        {busy === 'create' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Create and link
                      </button>
                      <button className={btnGhost} onClick={() => { setShowCreate(false); setDuplicates(null) }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Invitation */}
          {school && (r.status === 'IN_PROGRESS' || invitations.length > 0) && (
            <div className={card}>
              <h2 className="text-sm font-bold text-[#101828] mb-3 flex items-center gap-2"><Send className="w-4 h-4 text-gray-400" /> Owner invitation</h2>
              {invitations.length > 0 && (
                <ul className="space-y-2 mb-4">
                  {invitations.map(inv => (
                    <li key={inv.id} className="rounded-xl border border-gray-100 p-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm text-[#101828] break-all">{inv.sentToEmail ?? inv.email}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${INVITATION_STATE_BADGE[inv.state]}`}>{INVITATION_STATE_LABEL[inv.state]}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Created {fmt(inv.createdAt)}{inv.sentAt ? ` · sent ${fmt(inv.sentAt)}` : ''}{inv.openedAt ? ` · opened ${fmt(inv.openedAt)}` : ''}{inv.registeredAt ? ` · accepted ${fmt(inv.registeredAt)}` : ''}{inv.expiresAt && inv.open ? ` · expires ${fmt(inv.expiresAt)}` : ''}
                      </p>
                      {inv.deliveryError && (inv.state === 'failed' || inv.state === 'uncertain') && <p className="text-[11px] text-red-600 mt-1 break-words">{inv.deliveryError}</p>}
                      {inv.state === 'uncertain' && inv.retryWindowPassed && (
                        <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5 mt-1">
                          More than 20 h since the first attempt: a retry could reach the invitee twice. Check the Resend logs first; if it never arrived, send a new link (the old one stops working).
                        </p>
                      )}
                      {inv.open && inv.state !== 'legacy' && r.status === 'IN_PROGRESS' && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {inv.state === 'prepared' && (
                            <button className={btnPrimary} disabled={!!busy} onClick={() => act('send', { action: 'retry_invitation', invitationId: inv.id }, 'Invitation sent')}>Send</button>
                          )}
                          {(inv.state === 'failed' || (inv.state === 'uncertain' && !inv.retryWindowPassed)) && (
                            <button className={btnPrimary} disabled={!!busy} onClick={() => act('retry', { action: 'retry_invitation', invitationId: inv.id }, 'Invitation accepted by Resend')}>
                              {busy === 'retry' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} Retry
                            </button>
                          )}
                          {(inv.state === 'sent' || inv.state === 'opened' || inv.state === 'expired' || inv.state === 'uncertain') && (
                            <button className={btnGhost} disabled={!!busy} onClick={() => { if (confirm('Send a NEW link? The previous link stops working.')) act('resend', { action: 'resend_invitation', invitationId: inv.id }, 'New link sent — the previous link no longer works') }}>
                              {busy === 'resend' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Resend new link
                            </button>
                          )}
                          <button className={btnDanger} disabled={!!busy} onClick={() => { if (confirm('Revoke this invitation? The link stops working.')) act('revoke', { action: 'revoke_invitation', invitationId: inv.id }, 'Invitation revoked') }}>
                            <Ban className="w-3.5 h-3.5" /> Revoke
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {r.status === 'IN_PROGRESS' && !openInvitation && school.owners.length === 0 && (
                !confirmInvite ? (
                  <div className="space-y-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <label className="text-[11px] font-semibold text-gray-500">Recipient email</label>
                        <input className={input} type="email" value={inviteForm.recipientEmail} onChange={e => setInviteForm(f => ({ ...f, recipientEmail: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-gray-500">Recipient name</label>
                        <input className={input} value={inviteForm.recipientName} onChange={e => setInviteForm(f => ({ ...f, recipientName: e.target.value }))} />
                      </div>
                    </div>
                    {inviteForm.recipientEmail.trim().toLowerCase() !== r.contactEmail.toLowerCase() && (
                      <p className="text-xs text-amber-700">This differs from the requester’s email ({r.contactEmail}).</p>
                    )}
                    <button className={btnPrimary} disabled={!inviteForm.recipientEmail.trim()} onClick={() => setConfirmInvite(true)}>Review and send…</button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-sm space-y-1">
                    <p className="font-semibold">Send owner invitation?</p>
                    <p>School: <strong>{school.name}</strong></p>
                    <p>Contact: {r.contactName}</p>
                    <p>To: <strong className="break-all">{inviteForm.recipientEmail.trim()}</strong></p>
                    {school.email && school.email.toLowerCase() !== inviteForm.recipientEmail.trim().toLowerCase() && (
                      <p className="text-xs text-gray-500">The school’s public email ({school.email}) is not used and will not change.</p>
                    )}
                    <p className="text-xs text-gray-500">The link is single-use and expires in 7 days. Access is granted only after the invitee confirms this email address.</p>
                    <div className="pt-2 flex gap-2">
                      <button className={btnPrimary} disabled={!!busy} onClick={async () => { await act('invite', { action: 'send_invitation', ...inviteForm }, 'Invitation accepted by Resend'); setConfirmInvite(false) }}>
                        {busy === 'invite' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send invitation
                      </button>
                      <button className={btnGhost} onClick={() => setConfirmInvite(false)}>Back</button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* Timeline */}
          <div className={card}>
            <h2 className="text-sm font-bold text-[#101828] mb-3 flex items-center gap-2"><History className="w-4 h-4 text-gray-400" /> History</h2>
            {detail.events.length === 0 ? (
              <p className="text-xs text-gray-400">No recorded actions{r.status === 'RESOLVED' ? ' — this request was closed with the old “Mark resolved” before actions were recorded' : ''}.</p>
            ) : (
              <ol className="space-y-2">
                {detail.events.map(e => (
                  <li key={e.id} className="text-xs">
                    <span className="text-gray-400">{fmt(e.createdAt)}</span>{' · '}
                    <span className="text-[#101828] font-medium">{EVENT_LABEL[e.type] ?? e.type}</span>
                    {e.actor && <span className="text-gray-500"> · {e.actor}</span>}
                    {e.data && typeof e.data.schoolName === 'string' && <span className="text-gray-500"> · {e.data.schoolName}</span>}
                    {e.data && typeof e.data.recipientEmail === 'string' && <span className="text-gray-500"> · {e.data.recipientEmail}</span>}
                    {e.data && typeof e.data.reason === 'string' && <span className="text-gray-500"> · “{e.data.reason}”</span>}
                    {e.data && typeof e.data.error === 'string' && <span className="text-red-500 break-words"> · {e.data.error}</span>}
                  </li>
                ))}
              </ol>
            )}
            {r.status === 'RESOLVED' && <p className="text-xs text-gray-400 mt-2">Closed {fmt(r.resolvedAt)} (legacy).</p>}
          </div>
        </div>

        {/* Original request */}
        <aside className="space-y-4">
          <div className={card}>
            <h2 className="text-sm font-bold text-[#101828] mb-3">Original request</h2>
            <dl className="text-sm space-y-2">
              <div><dt className="text-[11px] text-gray-400">School (as written)</dt><dd className="break-words">{r.schoolName}</dd></div>
              {r.city && <div><dt className="text-[11px] text-gray-400">City</dt><dd className="flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-300" />{r.city}</dd></div>}
              <div><dt className="text-[11px] text-gray-400">Contact</dt><dd>{r.contactName}</dd></div>
              <div><dt className="text-[11px] text-gray-400">Email</dt><dd><a href={`mailto:${r.contactEmail}`} className="text-[#0870E2] break-all flex items-center gap-1"><Mail className="w-3 h-3" />{r.contactEmail}</a></dd></div>
              {r.phone && <div><dt className="text-[11px] text-gray-400">Phone</dt><dd className="flex items-center gap-1"><Phone className="w-3 h-3 text-gray-300" />{r.phone}</dd></div>}
              {r.message && <div><dt className="text-[11px] text-gray-400">Message</dt><dd className="whitespace-pre-wrap break-words text-gray-600">{r.message}</dd></div>}
              {detail.sourceSchool && <div><dt className="text-[11px] text-gray-400">Started from school page</dt><dd><Link href={`/admin/schools/${detail.sourceSchool.id}`} className="text-[#0870E2]">{detail.sourceSchool.name}</Link> <span className="text-[11px] text-gray-400">(hint only)</span></dd></div>}
              <div><dt className="text-[11px] text-gray-400">Received</dt><dd className="flex items-center gap-1"><Clock className="w-3 h-3 text-gray-300" />{fmt(r.createdAt)}</dd></div>
              {r.completedAt && <div><dt className="text-[11px] text-gray-400">Completed</dt><dd>{fmt(r.completedAt)}{r.completedBy ? ` · ${r.completedBy}` : ''}</dd></div>}
            </dl>
          </div>
        </aside>
      </div>
    </div>
  )
}
