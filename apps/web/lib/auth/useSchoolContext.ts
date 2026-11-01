'use client'

import { useEffect, useState } from 'react'
import type { SchoolContext } from './contexts'

export type AuthMe = {
  user: { id: string; email: string; name: string | null; globalRole: string; gettingStartedDismissedAt: string | null }
  contexts: {
    isAdmin: boolean
    schools: SchoolContext[]
    currentSchoolId: string | null
  }
}

export function useSchoolContext() {
  const [data, setData] = useState<AuthMe | null>(null)
  const [loading, setLoading] = useState(true)
  // The context request failed (network / server) — distinct from "loading"
  // so screens waiting on it can offer a retry instead of spinning forever
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(async (json) => {
        if (!json) { setFailed(true); return setData(json) }
        // Auto-set context if cookie missing but user has a school
        if (!json.contexts?.currentSchoolId && json.contexts?.schools?.length > 0) {
          const firstSchoolId = json.contexts.schools[0].schoolId
          await fetch('/api/auth/context', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schoolId: firstSchoolId }),
          })
          json.contexts.currentSchoolId = firstSchoolId
        }
        setData(json)
      })
      .catch(() => { setData(null); setFailed(true) })
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

  // Re-read after a settings change that affects the context (e.g. modules).
  // Never throws: resolves true when the context was updated, false otherwise.
  const refresh = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/me')
      if (!res.ok) return false
      setData(await res.json())
      setFailed(false)
      return true
    } catch {
      return false
    }
  }

  return {
    loading,
    failed,
    user: data?.user ?? null,
    isAdmin: data?.contexts.isAdmin ?? false,
    schools: data?.contexts.schools ?? [],
    currentSchool,
    switchSchool,
    refresh,
  }
}
