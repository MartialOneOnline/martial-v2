// Client helper for the pipeline "Send" buttons (Admin → Schools pipeline and
// Leads). A plain send/retry is tried first; when the server refuses a retry
// because Resend's idempotency window has passed (RETRY_WINDOW_PASSED), the
// admin is asked to confirm an explicit new link — the old link stops working
// and the invitee may receive two emails, only the newest of which works.
type Fetcher = (input: string, init?: RequestInit) => Promise<Response>

export async function sendPipelineInvite(fetcher: Fetcher, id: string, confirmNewLink: (message: string) => boolean): Promise<{ ok: boolean; message?: string }> {
  const call = async (action: 'send' | 'new_link') => {
    const res = await fetcher('/api/admin/invitations', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }),
    })
    return { res, data: await res.json().catch(() => ({})) as { ok?: boolean; error?: string; code?: string } }
  }
  try {
    let { res, data } = await call('send')
    if (res.status === 409 && data.code === 'RETRY_WINDOW_PASSED') {
      if (!confirmNewLink(`${data.error ?? 'A retry could deliver a duplicate.'}\n\nSend a new link now? The old link will stop working.`)) return { ok: false }
      ;({ res, data } = await call('new_link'))
    }
    if (res.ok && data.ok) return { ok: true }
    return { ok: false, message: data.error || `Failed (HTTP ${res.status}) — nothing was confirmed` }
  } catch {
    return { ok: false, message: 'Network error — unknown whether the invitation went out.' }
  }
}
