import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { getAuthUser, getCurrentSchoolId, requireSchoolAccess, memberHasPermission, db } = vi.hoisted(() => ({
  getAuthUser: vi.fn(), getCurrentSchoolId: vi.fn(), requireSchoolAccess: vi.fn(), memberHasPermission: vi.fn(),
  db: {
    school: { findUnique: vi.fn() },
    lead: { findMany: vi.fn() },
    leadNote: { groupBy: vi.fn() },
    booking: { findMany: vi.fn() },
    transaction: { groupBy: vi.fn() },
    $queryRaw: vi.fn(),
  },
}))
vi.mock('@/lib/auth/server', () => ({ getAuthUser, getCurrentSchoolId }))
vi.mock('@/lib/auth/contexts', () => ({ requireSchoolAccess }))
vi.mock('@/lib/auth/customRoles', () => ({ memberHasPermission }))
vi.mock('@/lib/db', () => ({ prisma: db }))

import { GET } from '../app/api/dashboard/reports/leads/route'

const NOW = Date.now()
const daysAgo = (d: number) => new Date(NOW - d * 24 * 60 * 60 * 1000)
const L = (id: string, p: Record<string, unknown> = {}) => ({
  id, name: id, email: `${id}@x.test`, phone: null, source: 'WEBSITE', status: 'NEW', interestedIn: null,
  createdAt: daysAgo(5), convertedAt: null, convertedUserId: null, ...p,
})
const get = (qs = '') => GET(new NextRequest(`http://x.test/api/dashboard/reports/leads${qs}`))

beforeEach(() => {
  vi.clearAllMocks()
  getAuthUser.mockResolvedValue({ id: 'staff', role: 'USER' })
  getCurrentSchoolId.mockResolvedValue('school1')
  requireSchoolAccess.mockResolvedValue({ role: 'OWNER' })
  memberHasPermission.mockResolvedValue(true)
  db.school.findUnique.mockResolvedValue({ country: 'ES' })
  db.leadNote.groupBy.mockResolvedValue([])
  db.$queryRaw.mockResolvedValue([])
  db.booking.findMany.mockResolvedValue([])
  db.transaction.groupBy.mockResolvedValue([])
})

describe('GET /api/dashboard/reports/leads', () => {
  it('needs the leads permission', async () => {
    memberHasPermission.mockResolvedValue(false)
    expect((await get()).status).toBe(403)
    expect(db.lead.findMany).not.toHaveBeenCalled()
  })

  it('leaves staff invites out by default, in with includeInvites=1; 90 days by default', async () => {
    db.lead.findMany.mockResolvedValue([])
    await get()
    const where = db.lead.findMany.mock.calls[0]![0].where
    expect(where.source).toEqual({ not: 'INVITE' })
    expect(Date.now() - where.createdAt.gte.getTime()).toBeGreaterThan(89 * 24 * 60 * 60 * 1000)
    await get('?includeInvites=1&period=all')
    const where2 = db.lead.findMany.mock.calls[1]![0].where
    expect(where2.source).toBeUndefined()
    expect(where2.createdAt).toBeUndefined()
  })

  it('matches leads to users by email and builds funnel + follow-up lists', async () => {
    db.lead.findMany.mockResolvedValue([
      L('silent'),                                        // no contact → not contacted
      L('noshow', { email: 'NoShow@X.test' }),            // email case differs from users
      L('tried'),
      L('joined'),
      L('lost', { status: 'LOST' }),
    ])
    db.$queryRaw.mockResolvedValue([
      { id: 'u-noshow', email: 'noshow@x.test' }, { id: 'u-tried', email: 'tried@x.test' }, { id: 'u-joined', email: 'joined@x.test' },
    ])
    db.booking.findMany.mockResolvedValue([
      { userId: 'u-noshow', scheduledAt: daysAgo(2), status: 'CONFIRMED', attendedAt: null },
      { userId: 'u-tried', scheduledAt: daysAgo(4), status: 'COMPLETED', attendedAt: null },
      { userId: 'u-joined', scheduledAt: daysAgo(4), status: 'CONFIRMED', attendedAt: daysAgo(4) },
    ])
    db.transaction.groupBy.mockResolvedValue([{ userId: 'u-joined', _min: { date: daysAgo(1) } }])

    const data = await (await get()).json()
    expect(data.funnel).toEqual({ total: 5, contacted: 4, trialBooked: 3, tried: 2, joined: 1, lost: 1 })
    expect(data.rates).toMatchObject({ joined: 20, joinedOfTried: 50 })
    expect(data.followUps.NOT_CONTACTED.map((x: { id: string }) => x.id)).toEqual(['silent'])
    expect(data.followUps.NO_SHOW.map((x: { id: string }) => x.id)).toEqual(['noshow'])
    expect(data.followUps.TRIED_NOT_JOINED.map((x: { id: string }) => x.id)).toEqual(['tried'])
    expect(data.bySource).toEqual([expect.objectContaining({ source: 'WEBSITE', total: 5, joined: 1, joinedRate: 20 })])
    // Only this school's bookings and paid membership payments count
    expect(db.booking.findMany.mock.calls[0]![0].where.class).toEqual({ schoolId: 'school1' })
    expect(db.transaction.groupBy.mock.calls[0]![0].where).toMatchObject({ schoolId: 'school1', category: 'MEMBERSHIP', status: 'PAID', deletedAt: null })
  })

  it('cleans phones and builds the WhatsApp number with the school country', async () => {
    db.lead.findMany.mockResolvedValue([L('a', { phone: '612 345 678' }), L('b', { phone: 'NULL' })])
    const data = await (await get()).json()
    const [a, b] = ['a', 'b'].map(id => data.followUps.NOT_CONTACTED.find((x: { id: string }) => x.id === id))
    expect(a).toMatchObject({ phone: '612 345 678', whatsapp: '34612345678' })
    expect(b).toMatchObject({ phone: null, whatsapp: null })
  })
})
