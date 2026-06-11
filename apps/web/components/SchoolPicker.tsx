'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SchoolContext } from '@/lib/auth/contexts'

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  INSTRUCTOR: 'Instructor',
  ASSISTANT_INSTRUCTOR: 'Asst. Instructor',
  RECEPTIONIST: 'Receptionist',
  STUDENT: 'Student',
}

interface Props {
  schools: SchoolContext[]
  onSelect: (schoolId: string) => void
  onPersonal: () => void
}

export default function SchoolPicker({ schools, onSelect, onPersonal }: Props) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleSelect = async (schoolId: string) => {
    setLoading(schoolId)
    await fetch('/api/auth/context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId }),
    })
    onSelect(schoolId)
  }

  return (
    <AnimatePresence>
      <motion.div
        key="picker-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4"
      >
        <motion.div
          key="picker-card"
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Continue as</h2>
          <p className="text-sm text-gray-500 mb-5">Select how you want to enter</p>

          <div className="flex flex-col gap-2">
            {schools.map(s => (
              <button
                key={s.schoolId}
                onClick={() => handleSelect(s.schoolId)}
                disabled={loading !== null}
                className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 hover:border-[#006197] hover:bg-[#006197]/5 transition-all text-left group disabled:opacity-50"
              >
                <div>
                  <div className="text-sm font-semibold text-gray-900 group-hover:text-[#006197]">
                    {s.schoolName}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{ROLE_LABEL[s.role] ?? s.role}</div>
                </div>
                {loading === s.schoolId ? (
                  <div className="w-4 h-4 border-2 border-[#006197] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="text-gray-300 group-hover:text-[#006197] text-sm">→</span>
                )}
              </button>
            ))}

            <button
              onClick={onPersonal}
              disabled={loading !== null}
              className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all text-left group disabled:opacity-50"
            >
              <div>
                <div className="text-sm font-semibold text-gray-700">Personal area</div>
                <div className="text-xs text-gray-400 mt-0.5">Bookings, memberships, progress</div>
              </div>
              <span className="text-gray-300 group-hover:text-gray-500 text-sm">→</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
