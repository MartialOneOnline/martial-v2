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

async function callPage() {
  const { default: ChooseProfilePage } = await import('@/app/choose-profile/page')
  return ChooseProfilePage()
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ChooseProfilePage (app/choose-profile/page.tsx)', () => {
  it('redirects to /login when there is no authenticated user', async () => {
    mockGetAuthUser.mockResolvedValue(null)

    await expect(callPage()).rejects.toThrow('NEXT_REDIRECT:/login?redirect=/choose-profile')
    expect(mockFindUnique).not.toHaveBeenCalled()
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
