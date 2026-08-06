// Pure request/state logic behind UsersClient.tsx's member status changes
// (status dropdown, archive, and the membership-drift banner's Reactivate
// button), kept in its own non-JSX module so it can be unit tested without
// rendering the component — this repo has no @testing-library/react or DOM
// test environment (vitest.config.ts runs `environment: 'node'`).

// Returns true only for a real 2xx response; false for a non-2xx response
// or a thrown network error, never throws itself. Previously the component
// only caught thrown errors and treated any resolved fetch — including a
// 403/500 — as success, so a rejected status change (e.g. Reactivate racing
// a permission change) left the optimistic ACTIVE update in place and the
// membership-drift banner silently dropped a member that was never actually
// fixed.
export async function submitMemberStatusChange(memberId: string, status: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/dashboard/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    return res.ok
  } catch {
    return false
  }
}

export type MemberLike = { id: string; status: string }

// Applies an optimistic status change to a members array — pure, no I/O.
export function applyOptimisticStatus<T extends MemberLike>(members: T[], memberId: string, status: string): T[] {
  return members.map(m => (m.id === memberId ? { ...m, status } : m))
}
