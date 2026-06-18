'use client'

import { QrCode } from 'lucide-react'

export default function MyQRPage() {
  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-5 py-4 sticky top-0 z-10">
        <h1 className="text-base font-bold text-[#101828]">QR Scanner</h1>
        <p className="text-xs text-gray-400 mt-0.5">Scan to check in to class</p>
      </div>
      <div className="flex flex-col items-center justify-center h-72 gap-3 text-center px-6">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
          <QrCode className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm font-semibold text-[#101828]">Coming soon</p>
        <p className="text-xs text-gray-400">QR check-in will be available in the next update.</p>
      </div>
    </div>
  )
}
