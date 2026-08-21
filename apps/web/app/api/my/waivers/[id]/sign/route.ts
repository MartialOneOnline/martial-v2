import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'
import { generateWaiverPdf } from '@/lib/waiverPdf'
import { notifyWaiverSigned } from '@/lib/notifications/create'
import { sendWaiverSignedEmail } from '@/lib/email/sendEmails'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY!

// POST /api/my/waivers/[id]/sign — capture a student's signature, snapshot
// the exact text they agreed to, render + store a PDF, and lift the
// booking restriction (see lib/waivers.ts#getBlockingWaivers).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const dbUser = await getAuthUser()
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { typedName, signatureDataUrl } = await req.json()
  if (!typedName?.trim()) return NextResponse.json({ error: 'Your full name is required' }, { status: 400 })

  const userWaiver = await prisma.userWaiver.findUnique({
    where: { id },
    include: { waiver: { select: { id: true, schoolId: true, title: true, content: true, version: true } } },
  })
  if (!userWaiver || userWaiver.userId !== dbUser.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const signedAt = new Date()
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const userAgent = req.headers.get('user-agent')

  const pdfBytes = await generateWaiverPdf({
    title: userWaiver.waiver.title,
    content: userWaiver.waiver.content,
    signerName: typedName.trim(),
    signedAt,
    ipAddress,
    version: userWaiver.waiver.version,
    signatureDataUrl: signatureDataUrl ?? null,
  })

  const path = `${userWaiver.waiver.schoolId}/${userWaiver.id}.pdf`
  const upload = await fetch(`${SUPABASE_URL}/storage/v1/object/waivers/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/pdf',
      'x-upsert': 'true',
    },
    body: Buffer.from(pdfBytes),
  })
  if (!upload.ok) {
    const err = await upload.json().catch(() => ({}))
    console.error('[waivers] PDF upload failed:', err)
    return NextResponse.json({ error: 'Could not store the signed document — please try again' }, { status: 500 })
  }

  await prisma.userWaiver.update({
    where: { id },
    data: {
      signedAt,
      ipAddress,
      userAgent,
      signature: signatureDataUrl ?? typedName.trim(),
      contentSnapshot: userWaiver.waiver.content,
      signedVersion: userWaiver.waiver.version,
      pdfPath: path,
      sentVia: 'EMAIL',
      revokedAt: null,
    },
  })

  notifyWaiverSigned(userWaiver.waiver.schoolId, dbUser.name ?? typedName.trim(), userWaiver.waiver.title)

  if (dbUser.email) {
    prisma.school.findUnique({ where: { id: userWaiver.waiver.schoolId }, select: { name: true, city: true, language: true } })
      .then(school => {
        if (!school) return
        return sendWaiverSignedEmail({
          to: dbUser.email!,
          studentName: dbUser.name,
          schoolName: school.name,
          schoolCity: school.city,
          waiverTitle: userWaiver.waiver.title,
          lang: school.language,
        })
      })
      .catch(err => console.error('[waivers] signed confirmation email failed:', err))
  }

  return NextResponse.json({ success: true })
}
