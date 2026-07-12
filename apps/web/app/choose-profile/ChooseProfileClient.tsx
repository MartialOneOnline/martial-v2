'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'
import type { ActiveContext, AvailableContext } from '@/lib/auth/activeContext'
import type { SchoolMemberRole } from '@/lib/prisma-client/enums'
import {
  classifyContexts,
  fetchAvailableContexts,
  resolveChooseProfileRedirect,
  selectProfileContext,
} from './logic'

// Same English-only role labels as components/SchoolPicker.tsx (the other
// school-role picker in this repo) — role names aren't translated there
// either, so this mirrors existing precedent rather than inventing a new
// localization surface for role names in this PR.
const ROLE_LABEL: Record<SchoolMemberRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  INSTRUCTOR: 'Instructor',
  ASSISTANT_INSTRUCTOR: 'Asst. Instructor',
  RECEPTIONIST: 'Receptionist',
  STUDENT: 'Student',
}

type Status = 'loading' | 'error' | 'ready'

type Props = {
  userName: string | null
  userAvatarUrl: string | null
}

function contextKey(c: ActiveContext) {
  return `${c.mode}:${c.schoolId}`
}

function Initials({ label }: { label: string }) {
  return <span>{label.trim().charAt(0).toUpperCase() || '?'}</span>
}

// `useSearchParams()` requires a <Suspense> boundary in the app router — see
// the default export below, which wraps this with the same pattern already
// used by app/login/page.tsx (LoginPageInner inside <Suspense>).
function ChooseProfileClientInner({ userName, userAvatarUrl }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useT().chooseProfile

  // Only ever consumed by resolveChooseProfileRedirect() below, which routes
  // it through safeRedirect() + a mode/portal compatibility check — never
  // used raw. See logic.ts for the full rule set (loop guard, dashboard vs
  // student portal prefixes, external-host rejection).
  const redirectParam = searchParams.get('redirect')

  const [status, setStatus] = useState<Status>('loading')
  const [contexts, setContexts] = useState<AvailableContext[]>([])
  const [selectingKey, setSelectingKey] = useState<string | null>(null)
  const [selectError, setSelectError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setStatus('loading')
    const result = await fetchAvailableContexts()
    if (!result.ok) {
      setStatus('error')
      return
    }
    setContexts(result.contexts)
    setStatus('ready')
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSelect = async (context: AvailableContext) => {
    if (selectingKey) return
    setSelectError(null)
    setSelectingKey(contextKey(context))

    const result = await selectProfileContext({ mode: context.mode, schoolId: context.schoolId })

    if (!result.ok) {
      setSelectingKey(null)
      setSelectError(t.selectError)
      return
    }

    // result.redirectTo is just the plain mode->portal fallback; the actual
    // destination (honouring ?redirect= when it's safe and compatible with
    // the chosen mode) is decided here so the error-handling above (which
    // never calls this) stays untouched.
    router.push(resolveChooseProfileRedirect(context.mode, redirectParam))
  }

  const handleSignOut = () => {
    window.location.href = '/api/auth/signout'
  }

  return (
    <div className="min-h-screen bg-gray-25 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-bold text-gray-950">{t.title}</h1>
          <p className="mt-1.5 text-sm text-gray-500">{t.subtitle}</p>
        </div>

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">{t.loading}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
            <p className="text-sm font-semibold text-gray-950">{t.errorTitle}</p>
            <p className="mt-1 text-sm text-gray-500">{t.errorDesc}</p>
            <button
              type="button"
              onClick={load}
              className="mt-4 px-5 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-colors cursor-pointer"
            >
              {t.retry}
            </button>
          </div>
        )}

        {status === 'ready' && (
          <ChooseProfileBody
            contexts={contexts}
            userName={userName}
            userAvatarUrl={userAvatarUrl}
            selectingKey={selectingKey}
            selectError={selectError}
            onSelect={handleSelect}
            emptyTitle={t.emptyTitle}
            emptyDesc={t.emptyDesc}
            emptyCta={t.emptyCta}
            dashboardLabel={t.dashboardLabel}
            studentAt={t.studentAt}
          />
        )}

        {status !== 'loading' && (
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            {t.useAnotherAccount}
          </button>
        )}
      </div>
    </div>
  )
}

// Same fallback shown by ChooseProfileClientInner's own 'loading' status —
// this one only ever flashes for the instant before useSearchParams() first
// resolves, which in practice is imperceptible; kept minimal rather than
// duplicating the full t.loading copy (i18n isn't available outside
// ChooseProfileClientInner without its own LanguageContext plumbing).
function ChooseProfileFallback() {
  return (
    <div className="min-h-screen bg-gray-25 flex items-center justify-center px-4 py-12">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function ChooseProfileClient(props: Props) {
  return (
    <Suspense fallback={<ChooseProfileFallback />}>
      <ChooseProfileClientInner {...props} />
    </Suspense>
  )
}

// ── Body: empty / single / multiple, driven by the pure classifyContexts() ──

function ChooseProfileBody({
  contexts,
  userName,
  userAvatarUrl,
  selectingKey,
  selectError,
  onSelect,
  emptyTitle,
  emptyDesc,
  emptyCta,
  dashboardLabel,
  studentAt,
}: {
  contexts: AvailableContext[]
  userName: string | null
  userAvatarUrl: string | null
  selectingKey: string | null
  selectError: string | null
  onSelect: (context: AvailableContext) => void
  emptyTitle: string
  emptyDesc: string
  emptyCta: string
  dashboardLabel: string
  studentAt: string
}) {
  const view = classifyContexts(contexts)

  if (view.kind === 'empty') {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
        <p className="text-sm font-semibold text-gray-950">{emptyTitle}</p>
        <p className="mt-1 text-sm text-gray-500">{emptyDesc}</p>
        <Link
          href="/explore"
          className="mt-4 inline-block px-5 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-colors"
        >
          {emptyCta}
        </Link>
      </div>
    )
  }

  const cards = view.kind === 'single' ? [view.context] : view.contexts

  return (
    <div className="flex flex-col gap-3">
      {selectError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-center">
          {selectError}
        </p>
      )}

      {cards.map(context => (
        <ProfileCard
          key={contextKey(context)}
          context={context}
          userName={userName}
          userAvatarUrl={userAvatarUrl}
          selecting={selectingKey === contextKey(context)}
          disabled={selectingKey !== null}
          onSelect={() => onSelect(context)}
          dashboardLabel={dashboardLabel}
          studentAt={studentAt}
        />
      ))}
    </div>
  )
}

// ── One card ─────────────────────────────────────────────────────────────────

function ProfileCard({
  context,
  userName,
  userAvatarUrl,
  selecting,
  disabled,
  onSelect,
  dashboardLabel,
  studentAt,
}: {
  context: AvailableContext
  userName: string | null
  userAvatarUrl: string | null
  selecting: boolean
  disabled: boolean
  onSelect: () => void
  dashboardLabel: string
  studentAt: string
}) {
  const isDashboard = context.mode === 'dashboard'

  const title = isDashboard ? context.schoolName : (userName ?? context.schoolName)
  const subtitle = isDashboard ? dashboardLabel : studentAt.replace('{school}', context.schoolName)
  const badge = isDashboard ? ROLE_LABEL[context.role] : context.subtitle

  // Dashboard cards show the school's own logo. Student cards prefer the
  // user's own avatar (it's the user's card, not the school's), falling
  // back to the school logo, then to initials — matches the fallback chain
  // requested in the ticket.
  const avatarUrl = isDashboard ? context.schoolLogoUrl : (userAvatarUrl ?? context.schoolLogoUrl)
  const initialsLabel = isDashboard ? context.schoolName : (userName ?? context.schoolName)

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className="w-full flex items-center gap-4 px-4 py-4 bg-white rounded-2xl border border-gray-200 hover:border-blue-500 hover:shadow-[0_2px_12px_rgba(8,112,226,0.08)] transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-100"
        />
      ) : (
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
          <span className="text-blue-500 font-bold text-base">
            <Initials label={initialsLabel} />
          </span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-semibold text-gray-950 truncate">{title}</div>
        <div className="text-sm text-gray-500 truncate">{subtitle}</div>
        {badge && (
          <span className="inline-block mt-1 text-[11px] font-semibold text-navy-700 bg-navy-50 rounded-full px-2 py-0.5">
            {badge}
          </span>
        )}
      </div>

      {selecting ? (
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
      ) : (
        <span className="text-gray-300 group-hover:text-blue-500 text-lg shrink-0">→</span>
      )}
    </button>
  )
}
