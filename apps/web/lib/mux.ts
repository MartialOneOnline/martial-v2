import Mux from '@mux/mux-node'

// Reads MUX_TOKEN_ID / MUX_TOKEN_SECRET / MUX_WEBHOOK_SECRET / MUX_SIGNING_KEY /
// MUX_PRIVATE_KEY from the environment automatically — see .env.example.
export const mux = new Mux()

// Every curriculum asset is created with a signed playback policy, never
// "public" — playback always goes through signCurriculumPlaybackToken() below
// after a membership check, there's no route that serves these unauthenticated.
export async function createCurriculumUpload(corsOrigin: string) {
  const upload = await mux.video.uploads.create({
    cors_origin: corsOrigin,
    new_asset_settings: {
      playback_policies: ['signed'],
      video_quality: 'basic',
    },
  })
  return { uploadId: upload.id, uploadUrl: upload.url }
}

// Short-lived (playback sessions are a few minutes to ~30min of seminar
// footage, not a long-running subscription) so a leaked URL stops working
// quickly rather than granting indefinite access.
export async function signCurriculumPlaybackToken(playbackId: string) {
  return mux.jwt.signPlaybackId(playbackId, { type: 'video', expiration: '2h' })
}

// For the thumbnail <img> shown on lesson cards — same signed-asset story as
// playback, just the "thumbnail" audience instead of "video".
export async function signCurriculumThumbnailToken(playbackId: string) {
  return mux.jwt.signPlaybackId(playbackId, { type: 'thumbnail', expiration: '2h' })
}

export async function unwrapMuxWebhook(rawBody: string, headers: Headers) {
  return mux.webhooks.unwrap(rawBody, headers, process.env.MUX_WEBHOOK_SECRET)
}

// Fallback path for reconciling an UPLOADING/PROCESSING row when the webhook
// hasn't (yet, or ever) fired — Mux can't reach a webhook URL on localhost at
// all, and even in production a delivery can be delayed or dropped. Asking
// Mux directly is the same data the webhook would have delivered, just
// pulled instead of pushed. Returns null if there's nothing new to report.
export async function pollUploadStatus(uploadId: string) {
  const upload = await mux.video.uploads.retrieve(uploadId)
  if (!upload.asset_id) return null
  const asset = await mux.video.assets.retrieve(upload.asset_id)
  if (asset.status === 'ready') {
    return {
      status: 'READY' as const,
      muxAssetId: asset.id,
      muxPlaybackId: asset.playback_ids?.[0]?.id ?? null,
      durationSec: asset.duration ?? null,
    }
  }
  if (asset.status === 'errored') {
    return { status: 'ERRORED' as const, errorMessage: 'Processing failed' }
  }
  return null
}
