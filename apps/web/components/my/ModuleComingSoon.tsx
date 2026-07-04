'use client'

import { PlayCircle, ShoppingBag, Newspaper, Music, Timer } from 'lucide-react'
import { useT } from '../../lib/i18n/LanguageContext'

type ModuleLabelKey = 'navCurriculum' | 'navStore' | 'navNews' | 'navMusic' | 'navTimer'

const MODULE_ICONS: Record<ModuleLabelKey, React.ElementType> = {
  navCurriculum: PlayCircle,
  navStore: ShoppingBag,
  navNews: Newspaper,
  navMusic: Music,
  navTimer: Timer,
}

export function ModuleComingSoon({ labelKey }: { labelKey: ModuleLabelKey }) {
  const t = useT()
  const Icon = MODULE_ICONS[labelKey]

  return (
    <div className="min-h-screen pb-4" style={{ background: '#F2F2F7' }}>
      <div className="max-w-lg mx-auto">
        <div className="px-4 md:px-6 pt-4 md:pt-7 pb-4">
          <p className="text-xs" style={{ color: '#6B6B70' }}>{t.my.navDashboard}</p>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#1C1C1E', letterSpacing: '-0.5px' }}>
            {t.my[labelKey]}
          </h1>
        </div>

        <div className="mx-4 md:mx-6 rounded-2xl flex flex-col items-center text-center gap-3 px-6 py-14"
          style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(8,112,226,.10)' }}>
            <Icon className="w-6 h-6" style={{ color: '#0870E2' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: '#1C1C1E' }}>{t.my.moduleComingSoon}</p>
          <p className="text-[13px]" style={{ color: '#6B6B70' }}>{t.my.moduleComingSoonDesc}</p>
        </div>
      </div>
    </div>
  )
}
