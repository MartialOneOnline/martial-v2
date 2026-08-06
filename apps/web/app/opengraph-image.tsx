import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const runtime = 'nodejs'
export const alt = 'Martial — The Global Martial Arts Platform'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const logoData = await readFile(join(process.cwd(), 'public', 'martial-logo.png'))
  const logoSrc = `data:image/png;base64,${logoData.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #06224A 0%, #0E3A7A 55%, #0870E2 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <img
          src={logoSrc}
          width={180}
          height={180}
          style={{ borderRadius: 40, boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}
        />
        <div
          style={{
            marginTop: 40,
            fontSize: 88,
            fontWeight: 700,
            color: '#FFFFFF',
            letterSpacing: -2,
          }}
        >
          Martial
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 32,
            color: '#7DE7EC',
            fontWeight: 500,
          }}
        >
          The Global Martial Arts Platform
        </div>
      </div>
    ),
    { ...size }
  )
}
