// Loads one lead for the CRM drawer. Returns a cancel function: once called,
// a late response (success, error status or network failure) is ignored, so
// a slow load of a lead the user already closed can't overwrite the drawer
// now showing another one (Project Audit PR #43 reaudit P2).

export interface LeadDetailHandlers<T> {
  onLoaded: (lead: T) => void
  onError: () => void
  onSettled: () => void
}

export function loadLeadDetail<T>(
  leadId: string,
  handlers: LeadDetailHandlers<T>,
  fetchFn: typeof fetch = fetch,
): () => void {
  let stale = false
  const controller = new AbortController()
  fetchFn(`/api/dashboard/leads/${leadId}`, { signal: controller.signal })
    .then(res => (res.ok ? res.json() : null))
    .then((data: { lead?: T } | null) => {
      if (stale) return
      if (data?.lead) handlers.onLoaded(data.lead)
      else handlers.onError()
    })
    .catch(() => { if (!stale) handlers.onError() })
    .finally(() => { if (!stale) handlers.onSettled() })
  return () => { stale = true; controller.abort() }
}
