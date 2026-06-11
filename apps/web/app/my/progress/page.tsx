'use client'

import { useEffect, useState } from 'react'
import { Award, User } from 'lucide-react'

type SchoolMember = {
  id: string
  belt: string | null
  beltDegree: number | null
  beltDate: string | null
  role: string
  school: { id: string; name: string; slug: string; logoUrl: string | null }
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

const BELT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'White Belt':  { bg: '#F9FAFB', text: '#374151', border: '#D1D5DB' },
  'Blue Belt':   { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  'Purple Belt': { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE' },
  'Brown Belt':  { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  'Black Belt':  { bg: '#111827', text: '#FFFFFF', border: '#374151' },
}

function BeltStripe({ belt, degree }: { belt: string; degree?: number | null }) {
  const colors = BELT_COLORS[belt] ?? { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB' }
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl border font-semibold text-sm"
      style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}
    >
      <div className="w-6 h-2.5 rounded-sm border" style={{ background: colors.text === '#FFFFFF' ? '#374151' : colors.text, borderColor: colors.border, opacity: 0.3 }} />
      {belt}
      {!!degree && (
        <div className="flex gap-1 ml-auto">
          {Array.from({ length: degree }).map((_, i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          ))}
        </div>
      )}
    </div>
  )
}

export default function MyProgressPage() {
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

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-[#0D1B2A]">Progress</h1>
        <p className="text-xs text-gray-400">Your belt ranks and grading history</p>
      </div>

      <div className="p-6 space-y-6 max-w-2xl">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[#006197] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Current ranks per school */}
            {members.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Current rank</p>
                {members.map(m => (
                  <div key={m.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-[#006197]/8 flex items-center justify-center overflow-hidden shrink-0">
                        {m.school.logoUrl
                          ? <img src={m.school.logoUrl} alt="" className="w-9 h-9 object-cover" />
                          : <span className="text-[#006197] font-bold">{m.school.name[0]}</span>
                        }
                      </div>
                      <p className="text-sm font-bold text-[#0D1B2A]">{m.school.name}</p>
                    </div>
                    {m.belt
                      ? <BeltStripe belt={m.belt} degree={m.beltDegree} />
                      : <p className="text-xs text-gray-400 italic">No belt assigned yet</p>
                    }
                    {m.beltDate && (
                      <p className="text-[11px] text-gray-400 mt-2">
                        Awarded {new Date(m.beltDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Grading timeline */}
            {gradings.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Grading history</p>
                <div className="relative">
                  <div className="absolute left-[18px] top-0 bottom-0 w-px bg-gray-100" />
                  <div className="space-y-4">
                    {gradings.map((g, i) => (
                      <div key={g.id} className="flex gap-4 relative">
                        <div className="w-9 h-9 rounded-full bg-amber-50 border-2 border-amber-100 flex items-center justify-center shrink-0 z-10">
                          <Award className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm p-4 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="text-xs font-bold text-[#0D1B2A]">
                                {g.fromBelt ? `${g.fromBelt} → ` : ''}{g.toBelt}
                                {g.toDegree ? ` (${g.toDegree} stripe${g.toDegree !== 1 ? 's' : ''})` : ''}
                              </p>
                              <p className="text-[11px] text-gray-400 mt-0.5">{g.school.name}</p>
                            </div>
                            <p className="text-[11px] text-gray-400 shrink-0">
                              {new Date(g.gradedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          {g.promotedBy?.name && (
                            <p className="text-[11px] text-gray-400 flex items-center gap-1">
                              <User className="w-3 h-3" /> Promoted by {g.promotedBy.name}
                            </p>
                          )}
                          {g.notes && (
                            <p className="text-xs text-gray-500 mt-2 italic">"{g.notes}"</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-2xl p-10 shadow-sm text-center">
                <Award className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No gradings recorded yet</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
