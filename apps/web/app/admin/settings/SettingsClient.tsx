'use client'

import { useState } from 'react'
import { Settings, Bell, Shield, Globe, Mail, Save, Check } from 'lucide-react'

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-50">
        <div className="w-7 h-7 rounded-lg bg-[#006197]/8 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-[#006197]" />
        </div>
        <p className="text-sm font-bold text-[#0D1B2A]">{title}</p>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  )
}

function Toggle({ label, description, checked, onChange }: {
  label: string; description?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-[#0D1B2A]">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
          checked ? 'bg-[#006197]' : 'bg-gray-200'
        }`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`} />
      </button>
    </div>
  )
}

export default function SettingsClient() {
  const [saved, setSaved] = useState(false)

  // Notification settings
  const [emailNewSchool, setEmailNewSchool] = useState(true)
  const [emailVerification, setEmailVerification] = useState(true)
  const [emailWeeklyReport, setEmailWeeklyReport] = useState(false)

  // Platform settings
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [allowSelfRegistration, setAllowSelfRegistration] = useState(true)
  const [requireEmailVerification, setRequireEmailVerification] = useState(true)

  const save = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-[#0D1B2A]">Settings</h1>
          <p className="text-xs text-gray-400">Platform configuration and preferences</p>
        </div>
        <button
          onClick={save}
          className="flex items-center gap-2 h-9 px-4 rounded-xl text-white text-xs font-semibold hover:opacity-90 transition-opacity"
          style={{ background: saved ? '#10B981' : '#006197' }}
        >
          {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saved ? 'Saved!' : 'Save changes'}
        </button>
      </div>

      <div className="p-8 max-w-2xl space-y-6">
        <Section title="Notifications" icon={Bell}>
          <Toggle
            label="New school registered"
            description="Email when a school completes onboarding"
            checked={emailNewSchool}
            onChange={setEmailNewSchool}
          />
          <Toggle
            label="Verification request"
            description="Email when a school claims their listing"
            checked={emailVerification}
            onChange={setEmailVerification}
          />
          <Toggle
            label="Weekly report"
            description="Receive a weekly platform summary every Monday"
            checked={emailWeeklyReport}
            onChange={setEmailWeeklyReport}
          />
        </Section>

        <Section title="Platform" icon={Globe}>
          <Toggle
            label="Allow self-registration"
            description="Schools can register without an invitation"
            checked={allowSelfRegistration}
            onChange={setAllowSelfRegistration}
          />
          <Toggle
            label="Require email verification"
            description="Users must verify their email before accessing the platform"
            checked={requireEmailVerification}
            onChange={setRequireEmailVerification}
          />
          <Toggle
            label="Maintenance mode"
            description="Take the platform offline for maintenance (shows a maintenance page)"
            checked={maintenanceMode}
            onChange={setMaintenanceMode}
          />
        </Section>

        <Section title="Security" icon={Shield}>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-[#0D1B2A] mb-1">Super admin email</p>
              <input
                type="email"
                defaultValue="admin@martial.app"
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#006197]/20 focus:border-[#006197]"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-[#0D1B2A] mb-1">Support email</p>
              <input
                type="email"
                defaultValue="hello@martial.app"
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#006197]/20 focus:border-[#006197]"
              />
            </div>
          </div>
        </Section>

        <Section title="Email" icon={Mail}>
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
            <p className="text-xs font-semibold text-amber-700">Resend configured</p>
            <p className="text-xs text-amber-600 mt-0.5">Emails are sent via Resend. Update your API key in environment variables.</p>
          </div>
          <div>
            <p className="text-sm font-medium text-[#0D1B2A] mb-1">Sender name</p>
            <input
              type="text"
              defaultValue="Martial"
              className="w-full h-9 px-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#006197]/20 focus:border-[#006197]"
            />
          </div>
        </Section>
      </div>
    </div>
  )
}
