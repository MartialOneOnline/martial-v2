/**
 * Grading templates: super admin CRUD guard + publishing rule, and a school
 * copying a published template into its own grading system.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const { guardSuperadmin, guardSuperadminUser, getAuthUser, getCurrentSchoolId, requireSchoolAccess, memberHasPermission, tpl, tx } = vi.hoisted(() => ({
  guardSuperadmin: vi.fn(), guardSuperadminUser: vi.fn(), getAuthUser: vi.fn(), getCurrentSchoolId: vi.fn(),
  requireSchoolAccess: vi.fn(), memberHasPermission: vi.fn(),
  tpl: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  tx: {
    gradingSystem: { count: vi.fn(), updateMany: vi.fn(), create: vi.fn(), findUniqueOrThrow: vi.fn() },
    beltRank: { createMany: vi.fn() },
  },
}))
vi.mock('@/lib/auth/server', () => ({ guardSuperadmin, guardSuperadminUser, getAuthUser, getCurrentSchoolId }))
vi.mock('@/lib/auth/contexts', () => ({ requireSchoolAccess }))
vi.mock('@/lib/auth/customRoles', () => ({ memberHasPermission }))
vi.mock('@/lib/db', () => ({
  prisma: {
    gradingTemplate: tpl,
    gradingSystem: { findMany: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
    $transaction: (fn: (t: typeof tx) => unknown) => fn(tx),
  },
}))

import * as adminList from '../app/api/admin/grading-templates/route'
import * as adminOne from '../app/api/admin/grading-templates/[id]/route'
import * as schoolSystems from '../app/api/dashboard/grading-systems/route'
import * as schoolTemplates from '../app/api/dashboard/grading-templates/route'

const req = (body?: unknown) => new NextRequest('http://x.test/api', {
  method: body ? 'POST' : 'GET',
  ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}),
})
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  vi.clearAllMocks()
  guardSuperadmin.mockResolvedValue(null)
  guardSuperadminUser.mockResolvedValue({ id: 'admin1', email: 'a@x.test' })
  getAuthUser.mockResolvedValue({ id: 'u1', role: 'USER' })
  getCurrentSchoolId.mockResolvedValue('school1')
  requireSchoolAccess.mockResolvedValue({ role: 'OWNER' })
  memberHasPermission.mockResolvedValue(true)
})

describe('admin grading templates', () => {
  it('every handler is super admin only', async () => {
    const deny = NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    guardSuperadmin.mockResolvedValue(deny)
    guardSuperadminUser.mockResolvedValue(deny)
    expect((await adminList.GET(req())).status).toBe(403)
    expect((await adminList.POST(req({ name: 'X' }))).status).toBe(403)
    expect((await adminOne.GET(req(), params('t1'))).status).toBe(403)
    expect((await adminOne.PATCH(req({ name: 'X' }), params('t1'))).status).toBe(403)
    expect((await adminOne.DELETE(req(), params('t1'))).status).toBe(403)
    expect(tpl.create).not.toHaveBeenCalled()
    expect(tpl.update).not.toHaveBeenCalled()
    expect(tpl.delete).not.toHaveBeenCalled()
  })

  it('creates a template with validated ranks and the creator', async () => {
    tpl.create.mockResolvedValue({ id: 't1' })
    const res = await adminList.POST(req({ name: 'IBJJF', ranks: [{ name: 'White' }, { name: 'Blue', minAge: 16 }] }))
    expect(res.status).toBe(201)
    const data = tpl.create.mock.calls[0]![0].data
    expect(data).toMatchObject({ name: 'IBJJF', createdById: 'admin1' })
    expect(data.ranks.map((r: { name: string }) => r.name)).toEqual(['White', 'Blue'])
  })

  it('rejects invalid ranks with the rank number', async () => {
    const res = await adminList.POST(req({ name: 'X', ranks: [{ name: '' }] }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('Rank 1')
  })

  it('cannot publish a template without ranks', async () => {
    expect((await adminList.POST(req({ name: 'X', isPublished: true, ranks: [] }))).status).toBe(400)
    tpl.findUnique.mockResolvedValue({ id: 't1', ranks: [], isPublished: false })
    expect((await adminOne.PATCH(req({ isPublished: true }), params('t1'))).status).toBe(400)
    expect(tpl.update).not.toHaveBeenCalled()
  })

  it('PATCH and DELETE 404 for an unknown template', async () => {
    tpl.findUnique.mockResolvedValue(null)
    expect((await adminOne.PATCH(req({ name: 'X' }), params('nope'))).status).toBe(404)
    expect((await adminOne.DELETE(req(), params('nope'))).status).toBe(404)
  })
})

describe('school: templates and creating a system from one', () => {
  it('only lists published templates with ranks', async () => {
    tpl.findMany.mockResolvedValue([
      { id: 't1', name: 'IBJJF', activity: 'BJJ', description: null, ranks: [{ name: 'White' }] },
      { id: 't2', name: 'Empty', activity: null, description: null, ranks: [] },
    ])
    const res = await schoolTemplates.GET()
    expect(tpl.findMany.mock.calls[0]![0].where).toEqual({ isPublished: true })
    expect((await res.json()).templates.map((t: { id: string }) => t.id)).toEqual(['t1'])
  })

  it('needs the gradings permission', async () => {
    memberHasPermission.mockResolvedValue(false)
    expect((await schoolTemplates.GET()).status).toBe(403)
    expect((await schoolSystems.POST(req({ templateId: 't1' }))).status).toBe(403)
    expect(tx.gradingSystem.create).not.toHaveBeenCalled()
  })

  it('a draft or unknown template cannot be copied', async () => {
    tpl.findFirst.mockResolvedValue(null)
    const res = await schoolSystems.POST(req({ templateId: 'draft' }))
    expect(res.status).toBe(404)
    expect(tpl.findFirst.mock.calls[0]![0].where).toEqual({ id: 'draft', isPublished: true })
  })

  it('copies the ranks into a new system of this school; the first one is the default', async () => {
    tpl.findFirst.mockResolvedValue({
      id: 't1', name: 'IBJJF', activity: 'BJJ',
      ranks: [{ name: 'White', maxDegrees: 4, classesByDegree: [8] }, { name: 'Blue', minAge: 16 }],
    })
    tx.gradingSystem.count.mockResolvedValue(0)
    tx.gradingSystem.create.mockResolvedValue({ id: 'sys9' })
    tx.gradingSystem.findUniqueOrThrow.mockResolvedValue({ id: 'sys9', ranks: [] })
    const res = await schoolSystems.POST(req({ templateId: 't1' }))
    expect(res.status).toBe(201)
    expect(tx.gradingSystem.create.mock.calls[0]![0].data).toEqual({
      schoolId: 'school1', name: 'IBJJF', activity: 'BJJ', isDefault: true, templateId: 't1',
    })
    const ranks = tx.beltRank.createMany.mock.calls[0]![0].data
    expect(ranks.map((r: { name: string; order: number; systemId: string }) => [r.name, r.order, r.systemId]))
      .toEqual([['White', 0, 'sys9'], ['Blue', 1, 'sys9']])
    expect(ranks[1]).toMatchObject({ minAge: 16, classTypeIds: [] })
  })

  it('a school that already has a system keeps its default', async () => {
    tpl.findFirst.mockResolvedValue({ id: 't1', name: 'IBJJF', activity: null, ranks: [{ name: 'White' }] })
    tx.gradingSystem.count.mockResolvedValue(2)
    tx.gradingSystem.create.mockResolvedValue({ id: 'sys9' })
    tx.gradingSystem.findUniqueOrThrow.mockResolvedValue({ id: 'sys9', ranks: [] })
    await schoolSystems.POST(req({ templateId: 't1' }))
    expect(tx.gradingSystem.create.mock.calls[0]![0].data.isDefault).toBe(false)
    expect(tx.gradingSystem.updateMany).not.toHaveBeenCalled()
  })
})
