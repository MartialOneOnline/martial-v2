'use client'

import Link from 'next/link'

const TABS = [
  { label: 'Overview',   href: '/admin/reports' },
  { label: 'Growth',     href: '/admin/reports/growth' },
  { label: 'Attendance', href: '/admin/reports/attendance' },
  { label: 'Gradings',   href: '/admin/reports/gradings' },
  { label: 'Payments',   href: '/admin/reports/payments' },
]

export default function ReportsTabs({ active }: { active: string }) {
  return (
    <div className="flex items-center gap-1">
      {TABS.map(tab => (
        <Link
          key={tab.href}
          href={tab.href}
          prefetch={false}
          className={`h-8 px-3 flex items-center rounded-lg text-xs font-medium transition-colors ${
            active === tab.href
              ? 'bg-[#0870E2]/10 text-[#0870E2]'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
