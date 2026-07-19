'use client'

import { useState, useEffect } from 'react'
import { Bell, Globe, Moon, ChevronRight } from 'lucide-react'
import { useLanguage } from '../../../lib/i18n/LanguageContext'
import type { Locale } from '../../../lib/i18n/translations'

function Toggle({ on, onChange, disabled = false }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => onChange(!on)}
      disabled={disabled}
      className="relative shrink-0 transition-colors"
      style={{
        width: 51, height: 31, borderRadius: 15.5,
        background: on ? '#34C759' : '#E5E5EA',
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', padding: 0,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <span
        className="absolute top-0.5 transition-transform"
        style={{
          width: 27, height: 27, borderRadius: '50%', background: '#fff',
          boxShadow: '0 2px 6px rgba(0,0,0,.20)',
          transform: on ? 'translateX(21px)' : 'translateX(2px)',
          display: 'block',
        }}
      />
    </button>
  )
}

const LANGUAGE_OPTIONS: { locale: Locale; label: string }[] = [
  { locale: 'en', label: 'English' },
  { locale: 'es', label: 'Español' },
  { locale: 'pt', label: 'Português' },
  { locale: 'fr', label: 'Français' },
]

export default function MySettingsPage() {
  const { locale, setLocale, t } = useLanguage()
  const [notifClass,      setNotifClass]      = useState(true)
  const [notifBooking,    setNotifBooking]     = useState(true)
  const [notifMembership, setNotifMembership]  = useState(true)
  const [notifPromo,      setNotifPromo]       = useState(false)
  const [showLangPicker,  setShowLangPicker]   = useState(false)
  const [preferencesError, setPreferencesError] = useState(false)
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set())

  // Load persisted prefs on mount
  useEffect(() => {
    fetch('/api/my/preferences')
      .then(res => {
        if (!res.ok) throw new Error('Preferences failed')
        return res.json()
      })
      .then(({ preferences }) => {
        setNotifClass(preferences.notifyClassReminders)
        setNotifBooking(preferences.notifyBookingConfirmed)
        setNotifMembership(preferences.notifyMembershipUpdates)
        setNotifPromo(preferences.notifyPromotions)
      })
      .catch(() => setPreferencesError(true))
  }, [])

  // Disables this key's own toggle for the duration of its PATCH so a second
  // click can't fire before the first one's response comes back — two
  // in-flight requests for the same key could otherwise resolve out of
  // order and leave the DB on a different value than what's shown.
  function setAndSave(setter: (v: boolean) => void, key: string) {
    return async (v: boolean) => {
      setter(v)
      setPreferencesError(false)
      setPendingKeys(prev => new Set(prev).add(key))
      const res = await fetch('/api/my/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: v }),
      }).catch(() => null)
      if (!res?.ok) {
        setter(!v)
        setPreferencesError(true)
      }
      setPendingKeys(prev => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  const currentLangLabel = LANGUAGE_OPTIONS.find(o => o.locale === locale)?.label ?? 'English'

  return (
    <div className="min-h-screen pb-4" style={{ background: '#F2F2F7' }}>
      <div className="max-w-lg mx-auto">

        <div className="px-4 md:px-6 pt-4 md:pt-7 pb-4">
          <p className="text-xs" style={{ color: '#6B6B70' }}>{t.my.navDashboard}</p>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#1C1C1E', letterSpacing: '-0.5px' }}>{t.my.navSettings}</h1>
        </div>

        {/* Notifications */}
        <p className="px-4 md:px-6 pb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B6B70' }}>{t.my.settingsNotifications}</p>
        <div className="mx-4 md:mx-6 mb-4 rounded-2xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)' }}>
          {[
            { key: 'notifyClassReminders',    label: t.my.notifClassReminders,   sub: t.my.notifClassSub,       val: notifClass,       set: setAndSave(setNotifClass,      'notifyClassReminders') },
            { key: 'notifyBookingConfirmed',  label: t.my.notifBookingConfirmed,  sub: t.my.notifBookingSub,     val: notifBooking,     set: setAndSave(setNotifBooking,    'notifyBookingConfirmed') },
            { key: 'notifyMembershipUpdates', label: t.my.notifMembershipUpdates, sub: t.my.notifMembershipSub,  val: notifMembership,  set: setAndSave(setNotifMembership, 'notifyMembershipUpdates') },
            { key: 'notifyPromotions',        label: t.my.notifPromotions,        sub: t.my.notifPromotionsSub,  val: notifPromo,       set: setAndSave(setNotifPromo,      'notifyPromotions') },
          ].map(({ key, label, sub, val, set }, i, arr) => (
            <div
              key={key}
              className="flex items-center justify-between px-4 py-3.5"
              style={i < arr.length - 1 ? { borderBottom: '0.5px solid rgba(60,60,67,.12)' } : {}}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,122,255,.10)' }}>
                  <Bell className="w-4 h-4" style={{ color: '#007AFF' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#1C1C1E' }}>{label}</p>
                  <p className="text-[11px]" style={{ color: '#6B6B70' }}>{sub}</p>
                </div>
              </div>
              <Toggle on={val} onChange={set} disabled={pendingKeys.has(key)} />
            </div>
          ))}
        </div>
        {preferencesError && <p className="text-center text-xs mb-4 px-6" style={{ color: '#FF3B30' }}>{t.common.error}</p>}

        {/* Appearance */}
        <p className="px-4 md:px-6 pb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B6B70' }}>{t.my.settingsAppearance}</p>
        <div className="mx-4 md:mx-6 mb-4 rounded-2xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)' }}>
          <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '0.5px solid rgba(60,60,67,.12)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(88,86,214,.10)' }}>
                <Moon className="w-4 h-4" style={{ color: '#5856D6' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: '#1C1C1E' }}>{t.my.settingsDarkMode}</p>
                <p className="text-[11px]" style={{ color: '#6B6B70' }}>{t.my.settingsComingSoon}</p>
              </div>
            </div>
            <Toggle on={false} onChange={() => {}} disabled />
          </div>

          {/* Language */}
          <button
            onClick={() => setShowLangPicker(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3.5"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(50,173,230,.10)' }}>
                <Globe className="w-4 h-4" style={{ color: '#32ADE6' }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium" style={{ color: '#1C1C1E' }}>{t.my.settingsLanguage}</p>
                <p className="text-[11px]" style={{ color: '#6B6B70' }}>{currentLangLabel}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: '#C7C7CC', transform: showLangPicker ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }} />
          </button>

          {showLangPicker && (
            <div style={{ borderTop: '0.5px solid rgba(60,60,67,.12)' }}>
              {LANGUAGE_OPTIONS.map((opt, i) => (
                <button
                  key={opt.locale}
                  onClick={() => { setLocale(opt.locale); setShowLangPicker(false) }}
                  className="w-full flex items-center justify-between px-4 py-3"
                  style={i < LANGUAGE_OPTIONS.length - 1 ? { borderBottom: '0.5px solid rgba(60,60,67,.08)' } : {}}
                >
                  <span className="text-sm" style={{ color: '#1C1C1E' }}>{opt.label}</span>
                  {locale === opt.locale && (
                    <span className="text-sm font-semibold" style={{ color: '#007AFF' }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* App info */}
        <p className="px-4 md:px-6 pb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B6B70' }}>{t.my.settingsAbout}</p>
        <div className="mx-4 md:mx-6 mb-4 rounded-2xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)' }}>
          {[
            { label: t.my.settingsVersion,     value: '2.0.0' },
            { label: t.my.settingsTerms,       value: '' },
            { label: t.my.settingsPrivacyPolicy, value: '' },
          ].map(({ label, value }, i) => (
            <div
              key={label}
              className="flex items-center justify-between px-4 py-3.5"
              style={i < 2 ? { borderBottom: '0.5px solid rgba(60,60,67,.12)' } : {}}
            >
              <p className="text-sm font-medium" style={{ color: '#1C1C1E' }}>{label}</p>
              <p className="text-sm" style={{ color: '#6B6B70' }}>{value}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
