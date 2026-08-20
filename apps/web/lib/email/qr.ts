import QRCode from 'qrcode'

// Same scannable format the dashboard check-in scanner expects —
// see EventCheckinClient.tsx's `^martial:event:(.+)$` match.
export async function generateEventQrDataUri(qrToken: string): Promise<string> {
  return QRCode.toDataURL(`martial:event:${qrToken}`, { width: 360, margin: 1 })
}

// Encodes a real, openable HTTPS URL directly — unlike generateEventQrDataUri
// above (an internal `martial:event:token` scheme meant for the staff
// check-in scanner), this is meant to be scanned by any phone's camera app
// and land straight on a public page, e.g. a collectible's verification URL.
export async function generateUrlQrDataUri(url: string): Promise<string> {
  return QRCode.toDataURL(url, { width: 360, margin: 1 })
}
