'use client'

export default function EmailPreviewPage() {
  return (
    <div className="min-h-screen bg-[#374151]">
      {/* Toolbar */}
      <div className="bg-[#0D1B2A] text-white px-6 py-3 flex items-center gap-3 text-sm sticky top-0 z-10">
        <span className="font-bold">📧 Email Preview</span>
        <span className="text-gray-500">·</span>
        <span className="text-gray-400 text-xs">
          Subject: Roger Gracie Málaga — your profile is live on Martial App
        </span>
        <a
          href="/api/admin/email-preview"
          target="_blank"
          className="ml-auto text-[#4DB8E8] text-xs hover:underline"
        >
          Open raw HTML ↗
        </a>
      </div>

      {/* iframe shows the actual email HTML */}
      <div className="flex justify-center py-8">
        <iframe
          src="/api/admin/email-preview"
          className="w-full max-w-2xl rounded-2xl shadow-2xl"
          style={{ height: '900px', border: 'none', background: '#fff' }}
          title="Email preview"
        />
      </div>
    </div>
  )
}
