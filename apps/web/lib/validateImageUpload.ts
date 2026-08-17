// A browser-reported File.type is just a client-supplied string — trivially
// spoofed (rename a script to photo.jpg, or set an arbitrary Blob type via
// JS/curl). This checks the actual file bytes (magic numbers) against the
// three formats the app ever renders as an <img>, so a request can't smuggle
// an SVG (script-capable), HTML, or executable through by lying about its
// Content-Type.
const SIGNATURES: { ext: 'jpg' | 'png' | 'webp'; mime: string; matches: (bytes: Uint8Array) => boolean }[] = [
  { ext: 'jpg', mime: 'image/jpeg', matches: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', mime: 'image/png', matches: b => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  {
    ext: 'webp', mime: 'image/webp',
    matches: b =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // 'RIFF'
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50, // 'WEBP'
  },
]

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5MB

// Returns the real (sniffed) extension + mime for a valid JPEG/PNG/WebP, or
// null if the bytes don't match any of them — regardless of what the
// upload's declared filename or Content-Type claimed.
export function sniffImage(bytes: Uint8Array): { ext: 'jpg' | 'png' | 'webp'; mime: string } | null {
  const sig = SIGNATURES.find(s => s.matches(bytes))
  return sig ? { ext: sig.ext, mime: sig.mime } : null
}
