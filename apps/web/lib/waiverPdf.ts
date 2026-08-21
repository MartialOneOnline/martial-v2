import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

// Renders a simple, legally-oriented snapshot of a signed waiver: title,
// exact text agreed to, signer identity, and the audit trail (date, IP,
// version). This is the permanent record stored alongside the DB row —
// even if UserWaiver.contentSnapshot is later inspected, the PDF is what a
// school hands to a lawyer or insurer.
export async function generateWaiverPdf({
  title,
  content,
  signerName,
  signedAt,
  ipAddress,
  version,
  signatureDataUrl,
}: {
  title: string
  content: string
  signerName: string
  signedAt: Date
  ipAddress: string | null
  version: string
  signatureDataUrl: string | null
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  const pageWidth = 595.28 // A4
  const pageHeight = 841.89
  const margin = 56
  const maxWidth = pageWidth - margin * 2

  let page = doc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin

  function ensureSpace(needed: number) {
    if (y - needed < margin) {
      page = doc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
    }
  }

  function drawWrapped(text: string, size: number, useFont = font, lineGap = 4, color = rgb(0.07, 0.09, 0.15)) {
    const words = text.split(/\s+/)
    let line = ''
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (useFont.widthOfTextAtSize(test, size) > maxWidth) {
        ensureSpace(size + lineGap)
        page.drawText(line, { x: margin, y, size, font: useFont, color })
        y -= size + lineGap
        line = word
      } else {
        line = test
      }
    }
    if (line) {
      ensureSpace(size + lineGap)
      page.drawText(line, { x: margin, y, size, font: useFont, color })
      y -= size + lineGap
    }
  }

  page.drawText('MARTIAL', { x: margin, y, size: 11, font: bold, color: rgb(0.05, 0.23, 0.48) })
  y -= 28
  drawWrapped(title, 18, bold)
  y -= 8

  // Waiver.content is stored as free text (HTML/Markdown) — stripped down
  // to plain text for the PDF rather than rendering markup, since this is a
  // legal record, not a styled document.
  const plainContent = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  for (const paragraph of plainContent.split(/\n{2,}/)) {
    drawWrapped(paragraph, 11)
    y -= 6
  }

  y -= 12
  ensureSpace(90)
  page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) })
  y -= 20

  drawWrapped(`Signed by: ${signerName}`, 11, bold)
  drawWrapped(`Date: ${signedAt.toISOString().replace('T', ' ').slice(0, 19)} UTC`, 10)
  drawWrapped(`Waiver version: ${version}`, 10)
  drawWrapped(`IP address: ${ipAddress ?? 'unknown'}`, 10)

  if (signatureDataUrl?.startsWith('data:image/png;base64,')) {
    try {
      const base64 = signatureDataUrl.split(',')[1] ?? ''
      const bytes = Uint8Array.from(Buffer.from(base64, 'base64'))
      const png = await doc.embedPng(bytes)
      const sigWidth = 180
      const sigHeight = (png.height / png.width) * sigWidth
      ensureSpace(sigHeight + 20)
      y -= 10
      page.drawImage(png, { x: margin, y: y - sigHeight, width: sigWidth, height: sigHeight })
      y -= sigHeight + 10
    } catch {
      // Malformed signature image — the text audit trail above still stands
      // as proof of signing, so skip the image rather than failing the PDF.
    }
  }

  return doc.save()
}
