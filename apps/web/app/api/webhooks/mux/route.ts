import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { unwrapMuxWebhook } from '@/lib/mux'

// POST /api/webhooks/mux
// One endpoint for every school (Mux has a single webhook URL per
// environment, not per-asset) — every event carries its own upload_id/asset
// id, so we always resolve the target row from the payload, never from the
// URL. Unlike the Stripe webhook, this never touches money — flipping a
// CurriculumLesson's status is naturally idempotent (re-applying the same
// "ready" update twice is harmless), so there's no claim/dedupe table here.
export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  let event: { type: string; data: Record<string, unknown> }
  try {
    const unwrapped = await unwrapMuxWebhook(rawBody, req.headers)
    event = { type: unwrapped.type, data: unwrapped.data as Record<string, unknown> }
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'video.asset.ready': {
      const uploadId = event.data.upload_id as string | undefined
      if (!uploadId) break
      const playbackIds = event.data.playback_ids as Array<{ id: string; policy: string }> | undefined
      await prisma.curriculumLesson.updateMany({
        where: { muxUploadId: uploadId },
        data: {
          status: 'READY',
          muxAssetId: event.data.id as string,
          muxPlaybackId: playbackIds?.[0]?.id ?? null,
          durationSec: (event.data.duration as number | undefined) ?? null,
          errorMessage: null,
        },
      })
      break
    }
    case 'video.asset.errored': {
      const uploadId = event.data.upload_id as string | undefined
      if (!uploadId) break
      const errors = event.data.errors as { messages?: string[] } | undefined
      await prisma.curriculumLesson.updateMany({
        where: { muxUploadId: uploadId },
        data: { status: 'ERRORED', errorMessage: errors?.messages?.join(' ') ?? 'Processing failed' },
      })
      break
    }
    case 'video.upload.errored': {
      const uploadId = event.data.id as string | undefined
      if (!uploadId) break
      const error = event.data.error as { message?: string } | undefined
      await prisma.curriculumLesson.updateMany({
        where: { muxUploadId: uploadId },
        data: { status: 'ERRORED', errorMessage: error?.message ?? 'Upload failed' },
      })
      break
    }
    default:
      break
  }

  return NextResponse.json({ received: true })
}
