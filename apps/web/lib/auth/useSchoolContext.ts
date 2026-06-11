'use client'

import { useEffect, useState } from 'react'
import type { SchoolContext } from './contexts'

export type AuthMe = {
  user: { id: string; email: string; name: string | null; globalRole: string }
  contexts: {
    isAdmin: boolean
    schools: SchoolContext[]
    currentSchoolId: string | null
  }
}

export function useSchoolContext() {
  const [data, setData] = useState<AuthMe | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(json => setData(json))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const currentSchool = data?.contexts.schools.find(
    s => s.schoolId === data.contexts.currentSchoolId
  ) ?? data?.contexts.schools[0] ?? null

  const switchSchool = async (schoolId: string) => {
    await fetch('/api/auth/context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId }),
    })
    // Refresh context
    const res = await fetch('/api/auth/me')
    if (res.ok) setData(await res.json())
  }

  return {
    loading,
    user: data?.user ?? null,
    isAdmin: data?.contexts.isAdmin ?? false,
    schools: data?.contexts.schools ?? [],
    currentSchool,
    switchSchool,
  }
}
