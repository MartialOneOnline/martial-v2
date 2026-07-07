'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, User } from 'lucide-react'
import { useT } from '../../../lib/i18n/LanguageContext'

type SchoolMember = {
  id: string
  belt: string | null
  beltDegree: number | null
  beltDate: string | null
  role: string
  school: { id: string; name: string; slug: string; logoUrl: string | null; hasGrading?: boolean }
}

type Grading = {
  id: string
  fromBelt: string | null
  toBelt: string
  toDegree: number | null
  gradedAt: string
  notes: string | null
  school: { name: string }
  promotedBy: { name: string | null } | null
}

const BELT_COLORS: Record<string, string> = {
  'White Belt':  '#D1D5DB',
  'Blue Belt':   '#3B82F6',
  'Purple Belt': '#8B5CF6',
  'Brown Belt':  '#92400E',
  'Black Belt':  '#1F2937',
}

function RankCard({ member, gradings, t }: { member: SchoolMember; gradings: Grading[]; t: ReturnType<typeof useT> }) {
  const belt = member.belt ?? 'White Belt'
  const color = BELT_COLORS[belt] ?? '#9CA3AF'
  const degree = member.beltDegree ?? 0
  // 4 stripes = ready for next belt. Progress = stripes earned / 4
  const MAX_STRIPES = 4
  const progress = degree / MAX_STRIPES
  const r = 52
  const circ = 2 * Math.PI * r
  const dash = circ * progress
  const stripesLeft = MAX_STRIPES - degree

  const schoolGradings = gradings.filter(g => g.school.name === member.school.name)

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      {/* School header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#0870E2]/8 flex items-center justify-center overflow-hidden shrink-0">
            {member.school.logoUrl
              ? <img src={member.school.logoUrl} alt="" className="w-8 h-8 object-cover" />
              : <span className="text-[#0870E2] font-bold text-sm">{member.school.name[0]}</span>
            }
          </div>
          <div>
            <p className="text-sm font-bold text-[#101828]">{member.school.name}</p>
            <p className="text-xs text-[#0870E2] font-medium">{t.my.ranks}</p>
          </div>
        </div>
        <Link href={`/school/${member.school.slug}`} className="text-xs font-semibold text-[#0870E2] flex items-center gap-0.5 hover:underline">
          {t.my.viewAllChevron} <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="px-5 py-5">
        <div className="flex items-center gap-5">
          {/* Donut */}
          <div className="relative shrink-0">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r={r} fill="none" stroke="#F0F1F3" strokeWidth="11" />
              <circle
                cx="60" cy="60" r={r}
                fill="none"
                stroke={color}
                strokeWidth="11"
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-[#101828]">{degree}<span className="text-base font-medium text-gray-400">/{MAX_STRIPES}</span></span>
              <span className="text-[10px] text-gray-400 text-center leading-tight">{t.my.stripesLabel}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">{t.my.currentBelt}</span>
              <span className="text-sm font-bold text-[#101828]">{belt}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">{t.my.stripesCount}</span>
              <span className="text-sm font-bold" style={{ color }}>{degree} / {MAX_STRIPES}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">{t.my.gradingsCount}</span>
              <span className="text-sm font-bold text-[#101828]">{schoolGradings.length}</span>
            </div>
            {stripesLeft > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">{t.my.nextPromotion}</span>
                <span className="text-xs font-semibold text-[#0870E2]">{stripesLeft === 1 ? t.my.oneStripeToGo : t.my.strapesToGo.replace('{n}', String(stripesLeft))}</span>
              </div>
            )}
            {stripesLeft === 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#22C55E]">{t.my.readyForPromotion}</span>
              </div>
            )}
          </div>
        </div>

        {/* Belt progression */}
        {belt && (
          <div className="mt-5 grid grid-cols-2 gap-3 items-center">
            <div>
              <p className="text-xs font-bold text-[#101828] mb-2">{belt}</p>
              <div className="h-3 rounded-full overflow-hidden bg-gray-100">
                <div className="h-full rounded-full" style={{ width: '65%', background: color }} />
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">
                {t.my.lastGrading} &nbsp;
                {member.beltDate
                  ? new Date(member.beltDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : '—'}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-gray-300 text-lg mt-1">→</span>
              <div className="flex-1">
                <p className="text-xs font-bold text-[#101828] mb-2">{belt} {degree + 1} Stripe</p>
                <div className="h-3 rounded-full overflow-hidden bg-gray-100">
                  <div className="h-full rounded-full" style={{ width: '20%', background: color }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">{t.my.nextGrading} &nbsp;—</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grading history */}
      {schoolGradings.length > 0 && (
        <div className="border-t border-gray-50">
          {schoolGradings.slice(0, 3).map((g, i) => (
            <div
              key={g.id}
              className={`flex items-center gap-3 px-5 py-3.5 ${i < Math.min(schoolGradings.length, 3) - 1 ? 'border-b border-gray-50' : ''}`}
            >
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <div className="w-3 h-3 rounded-full bg-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#101828]">
                  {g.fromBelt ? `${g.fromBelt} → ` : ''}{g.toBelt}
                  {g.toDegree ? ` (${g.toDegree} stripe${g.toDegree !== 1 ? 's' : ''})` : ''}
                </p>
                {g.promotedBy?.name && (
                  <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                    <User className="w-3 h-3" />{g.promotedBy.name}
                  </p>
                )}
              </div>
              <p className="text-[11px] text-gray-400 shrink-0">
                {new Date(g.gradedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MyProgressPage() {
  const t = useT()
  const [members, setMembers] = useState<SchoolMember[]>([])
  const [gradings, setGradings] = useState<Grading[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/my')
      .then(r => r.json())
      .then(d => {
        setMembers(d.user?.schoolMembers ?? [])
        setGradings(d.user?.gradings ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Only schools that actually run a belt/grading system get a rank card —
  // e.g. a Muay Thai or grappling-only school may not use belts at all.
  const gradedMembers = members.filter(m => m.school.hasGrading)

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-5 py-4 sticky top-0 z-10">
        <h1 className="text-base font-bold text-[#101828]">{t.my.ranking}</h1>
        <p className="text-xs text-gray-400 mt-0.5">{t.my.beltProgressionHistory}</p>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-2xl">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 border-2 border-[#0870E2] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-10 shadow-sm text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
              <div className="w-5 h-5 rounded-full bg-amber-300" />
            </div>
            <p className="text-sm font-semibold text-[#101828] mb-1">{t.my.noRankingsYet}</p>
            <p className="text-xs text-gray-400 mb-4">{t.my.joinAcademyToTrack}</p>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-semibold bg-[#0870E2] hover:bg-[#005580] transition-colors"
            >
              {t.my.findAnAcademy}
            </Link>
          </div>
        ) : gradedMembers.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-10 shadow-sm text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
              <div className="w-5 h-5 rounded-full bg-amber-300" />
            </div>
            <p className="text-sm font-semibold text-[#101828]">{t.my.noGradingSystem}</p>
          </div>
        ) : (
          gradedMembers.map(m => (
            <RankCard key={m.id} member={m} gradings={gradings} t={t} />
          ))
        )}

        {/* All gradings timeline */}
        {gradings.length > 0 && gradedMembers.length > 1 && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <p className="text-sm font-bold text-[#101828]">{t.my.fullGradingHistory}</p>
            </div>
            <div className="relative">
              <div className="absolute left-[37px] top-0 bottom-0 w-px bg-gray-100" />
              <div className="divide-y divide-gray-50">
                {gradings.map(g => (
                  <div key={g.id} className="flex gap-4 px-5 py-4">
                    <div className="w-8 h-8 rounded-full bg-amber-50 border-2 border-amber-100 flex items-center justify-center shrink-0 z-10">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-xs font-bold text-[#101828]">
                        {g.fromBelt ? `${g.fromBelt} → ` : ''}{g.toBelt}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{g.school.name}</p>
                      {g.notes && <p className="text-[11px] text-gray-500 mt-1 italic">"{g.notes}"</p>}
                    </div>
                    <p className="text-[11px] text-gray-400 shrink-0 pt-0.5">
                      {new Date(g.gradedAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
