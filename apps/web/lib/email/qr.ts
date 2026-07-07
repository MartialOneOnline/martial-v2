import QRCode from 'qrcode'

// Same scannable format the dashboard check-in scanner expects —
// see EventCheckinClient.tsx's `^martial:event:(.+)$` match.
export async function generateEventQrDataUri(qrToken: string): Promise<string> {
  return QRCode.toDataURL(`martial:event:${qrToken}`, { width: 360, margin: 1 })
}
