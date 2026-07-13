/**
 * Tests for app/choose-profile/page.tsx — the server-component guard for
 * the new /choose-profile screen (first UI PR consuming the
 * lib/auth/activeContext.ts + activeContextCookie.ts + /api/auth/contexts +
 * /api/auth/context/select infra merged in Sesión 60/61).
 *
 * Same pattern as myPortalStaffGuard.test.ts's MyLayout tests: no session ->
 * redirect('/login?...'); with a session -> renders through without
 * redirecting, passing the user's own display name/avatar down to
 * ChooseProfileClient (which owns the actual context-list fetch — see
 * chooseProfileLogic.test.ts for that layer, and the comment in page.tsx
 * for why the context list isn't fetched again here).
 *
 * The page now takes `searchParams: Promise<{ redirect?: string }>` (Next.js
 * 16 server-component convention — see checkin/[classId]/page.tsx for the
 * repo's existing precedent) so the no-session branch can preserve an
 * incoming `?redirect=` through the login detour. That preservation/
 * validation/encoding logic itself lives in loginRedirect.ts and has its own
 * dedicated unit tests (chooseProfileLoginRedirect.test.ts) — the cases here
 * only confirm page.tsx wires `searchParams` into it correctly, plus the
 * pre-existing "no redirect param at all" and "has a session" behavior.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetAuthUser = vi.fn()
const mockFindUnique = vi.fn()
const mockRedirect = vi.fn((url: string) => { throw new Error(`NEXT_REDIRECT:${url}`) })

vi.mock('next/navigation', () => ({ redirect: mockRedirect }))
vi.mock('@/lib/auth/server', () => ({ getAuthUser: mockGetAuthUser }))
vi.mock('@/lib/db', () => ({
  prisma: { user: { findUnique: mockFindUnique } },
}))
vi.mock('@/app/choose-profile/ChooseProfileClient', () => ({
  default: (props: unknown) => props,
}))

async function callPage(searchParams: { redirect?: string } = {}) {
  const { default: ChooseProfilePage } = await import('@/app/choose-profile/page')
  return ChooseProfilePage({ searchParams: Promise.resolve(searchParams) })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ChooseProfilePage (app/choose-profile/page.tsx)', () => {
  it('redirects to /login when there is no authenticated user and no redirect param', async () => {
    mockGetAuthUser.mockResolvedValue(null)

    await expect(callPage()).rejects.toThrow('NEXT_REDIRECT:/login?redirect=/choose-profile')
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('redirects to /login preserving a valid ?redirect= param', async () => {
    mockGetAuthUser.mockResolvedValue(null)

    await expect(callPage({ redirect: '/my/events' })).rejects.toThrow(
      'NEXT_REDIRECT:/login?redirect=%2Fchoose-profile%3Fredirect%3D%252Fmy%252Fevents',
    )
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('falls back to the plain /login redirect for an unsafe ?redirect= param', async () => {
    mockGetAuthUser.mockResolvedValue(null)

    await expect(callPage({ redirect: 'https://evil.com' })).rejects.toThrow(
      'NEXT_REDIRECT:/login?redirect=/choose-profile',
    )
  })

  it('renders through (no redirect) for an authenticated user, passing name + avatar', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-1', name: 'Jane Doe', role: 'STUDENT' })
    mockFindUnique.mockResolvedValue({ avatarUrl: 'https://cdn.example.com/jane.png' })

    const result = await callPage()

    expect(mockRedirect).not.toHaveBeenCalled()
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { avatarUrl: true },
    })
    // page.tsx returns <ChooseProfileClient {...} /> — a React element
    // descriptor, not a called function — so the props the page decided to
    // pass down live on .props, not on the result itself.
    expect(result).toMatchObject({
      props: {
        userName: 'Jane Doe',
        userAvatarUrl: 'https://cdn.example.com/jane.png',
      },
    })
  })

  it('falls back to null avatar when the user has none set', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-2', name: 'No Avatar', role: 'STUDENT' })
    mockFindUnique.mockResolvedValue({ avatarUrl: null })

    const result = await callPage()

    expect(result).toMatchObject({ props: { userName: 'No Avatar', userAvatarUrl: null } })
  })

  it('falls back to null avatar when the user row is somehow missing', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-3', name: 'Ghost', role: 'STUDENT' })
    mockFindUnique.mockResolvedValue(null)

    const result = await callPage()

    expect(result).toMatchObject({ props: { userName: 'Ghost', userAvatarUrl: null } })
  })
})
