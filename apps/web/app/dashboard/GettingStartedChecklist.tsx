'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, ChevronDown, Building2, CalendarDays, Award, CreditCard, Users, Settings2 } from 'lucide-react'
import { useT } from '../../lib/i18n/LanguageContext'

type GettingStarted = {
  profile: boolean
  classes: boolean
  memberships: boolean
  payments: boolean
  students: boolean
  settings: boolean
  doneCount: number
  total: number
}

interface Props {
  gettingStarted: GettingStarted
  dismissed: boolean
  onDismiss: () => void
}

export default function GettingStartedChecklist({ gettingStarted, dismissed, onDismiss }: Props) {
  const t = useT()
  const g = t.dashboard.gettingStarted
  const [collapsed, setCollapsed] = useState(false)
  const [dismissing, setDismissing] = useState(false)

  if (dismissed || gettingStarted.doneCount >= gettingStarted.total) return null

  const steps = [
    { key: 'profile' as const,     icon: Building2,   title: g.profileTitle,     desc: g.profileDesc,     cta: g.profileCta,     href: '/dashboard/settings?tab=school' },
    { key: 'classes' as const,     icon: CalendarDays, title: g.classesTitle,    desc: g.classesDesc,     cta: g.classesCta,     href: '/dashboard/classes' },
    { key: 'memberships' as const, icon: Award,        title: g.membershipsTitle, desc: g.membershipsDesc, cta: g.membershipsCta, href: '/dashboard/memberships' },
    { key: 'payments' as const,    icon: CreditCard,   title: g.paymentsTitle,   desc: g.paymentsDesc,    cta: g.paymentsCta,    href: '/dashboard/settings?tab=payments' },
    { key: 'students' as const,    icon: Users,        title: g.studentsTitle,   desc: g.studentsDesc,    cta: g.studentsCta,    href: '/dashboard/users' },
    { key: 'settings' as const,    icon: Settings2,    title: g.settingsTitle,   desc: g.settingsDesc,    cta: g.settingsCta,    href: '/dashboard/settings' },
  ]

  const firstUndoneIndex = steps.findIndex(s => !gettingStarted[s.key])
  const pct = Math.round((gettingStarted.doneCount / gettingStarted.total) * 100)

  async function handleDismiss() {
    setDismissing(true)
    try {
      await fetch('/api/dashboard/getting-started/dismiss', { method: 'POST' })
    } finally {
      onDismiss()
    }
  }

  return (
    <div className="rounded-2xl" style={{ background: '#fff', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap" style={{ padding: '20px 22px 16px' }}>
        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#0071E3' }}>{g.eyebrow}</span>
          <p style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginTop: 4 }}>{g.title}</p>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{g.subtitle}</p>
        </div>
        <div className="flex items-center gap-3" style={{ minWidth: 200 }}>
          <div style={{ flex: 1, height: 6, borderRadius: 999, background: '#F3F4F6', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 999, width: `${pct}%`, background: '#0071E3', transition: 'width .4s ease' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>
            {gettingStarted.doneCount}<span style={{ color: '#9CA3AF', fontWeight: 600 }}>/{gettingStarted.total}</span>
          </span>
          <button
            onClick={() => setCollapsed(c => !c)}
            aria-label={collapsed ? g.showSteps : g.hideChecklist}
            style={{
              width: 30, height: 30, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
              transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform .25s ease',
            }}
          >
            <ChevronDown size={15} color="#6B7280" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div style={{ borderTop: '1px solid #F3F4F6' }}>
            {steps.map((step, i) => {
              const done = gettingStarted[step.key]
              const Icon = step.icon
              return (
                <Link
                  key={step.key}
                  href={step.href}
                  className="flex items-center gap-4"
                  style={{
                    padding: '14px 22px',
                    borderBottom: i < steps.length - 1 ? '1px solid #F3F4F6' : 'none',
                    textDecoration: 'none',
                  }}
                >
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    border: done ? 'none' : '2px solid #E5E7EB',
                    background: done ? '#16A34A' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {done && <CheckCircle2 size={15} color="#fff" strokeWidth={2.5} />}
                  </div>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: done ? '#F0FDF4' : '#EFF6FF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={17} color={done ? '#16A34A' : '#0071E3'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{
                        fontSize: 14, fontWeight: 600, color: done ? '#9CA3AF' : '#111827',
                        textDecoration: done ? 'line-through' : 'none', textDecorationColor: '#D1D5DB',
                      }}>
                        {step.title}
                      </span>
                      {!done && i === firstUndoneIndex && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                          color: '#0071E3', background: '#EFF6FF', padding: '2px 7px', borderRadius: 999,
                        }}>
                          {firstUndoneIndex === 0 ? g.startHere : g.upNext}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12.5, color: '#9CA3AF', marginTop: 2 }}>{step.desc}</p>
                  </div>
                  {!done && (
                    <span style={{
                      fontSize: 13, fontWeight: 600, color: '#fff', background: '#0071E3',
                      padding: '7px 13px', borderRadius: 8, flexShrink: 0, whiteSpace: 'nowrap',
                    }}>
                      {step.cta}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          <div className="flex justify-end" style={{ padding: '10px 22px 14px' }}>
            <button
              onClick={handleDismiss}
              disabled={dismissing}
              style={{
                fontSize: 12.5, fontWeight: 600, color: '#9CA3AF', background: 'none', border: 'none',
                cursor: 'pointer', padding: 0,
              }}
            >
              {g.hideChecklist}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
