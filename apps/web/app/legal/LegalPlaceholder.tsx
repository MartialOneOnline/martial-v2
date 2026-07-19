'use client'

import Link from 'next/link'
import { useLanguage } from '../../lib/i18n/LanguageContext'

const copy = {
  en: { back: 'Back to Martial', notice: 'This policy is being finalized. Please check back soon.', privacy: 'Privacy Policy', terms: 'Terms of Service', cookies: 'Cookie Policy' },
  es: { back: 'Volver a Martial', notice: 'Esta política se está finalizando. Vuelve a consultarla próximamente.', privacy: 'Política de privacidad', terms: 'Términos de uso', cookies: 'Política de cookies' },
  pt: { back: 'Voltar ao Martial', notice: 'Esta política está sendo finalizada. Volte em breve.', privacy: 'Política de privacidade', terms: 'Termos de uso', cookies: 'Política de cookies' },
  fr: { back: 'Retour à Martial', notice: 'Cette politique est en cours de finalisation. Revenez bientôt.', privacy: 'Politique de confidentialité', terms: "Conditions d'utilisation", cookies: 'Politique relative aux cookies' },
}

export function LegalPlaceholder({ policy }: { policy: 'privacy' | 'terms' | 'cookies' }) {
  const { locale } = useLanguage()
  const text = copy[locale]
  return (
    <main className="min-h-screen bg-[#F2F2F7] px-4 py-12">
      <article className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-sm md:p-10">
        <Link href="/my/privacy" className="text-sm font-semibold text-[#0870E2]">← {text.back}</Link>
        <h1 className="mt-8 text-3xl font-semibold text-[#1C1C1E]">{text[policy]}</h1>
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {text.notice}
        </div>
      </article>
    </main>
  )
}
