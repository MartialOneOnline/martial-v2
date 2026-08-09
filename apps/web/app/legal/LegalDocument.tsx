'use client'

import Link from 'next/link'
import { ReactNode } from 'react'
import { useLanguage } from '../../lib/i18n/LanguageContext'

const backCopy = {
  en: 'Back to Martial',
  es: 'Volver a Martial',
  pt: 'Voltar ao Martial',
  fr: 'Retour à Martial',
}

const updatedCopy = {
  en: 'Last updated',
  es: 'Última actualización',
  pt: 'Última atualização',
  fr: 'Dernière mise à jour',
}

export function LegalDocument({
  title,
  lastUpdated,
  children,
}: {
  title: string
  lastUpdated: string
  children: ReactNode
}) {
  const { locale } = useLanguage()

  return (
    <main className="min-h-screen bg-[#F2F2F7] px-4 py-12">
      <article className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm md:p-10">
        <Link href="/" className="text-sm font-semibold text-[#0870E2]">
          ← {backCopy[locale]}
        </Link>
        <h1 className="mt-8 text-3xl font-semibold text-[#1C1C1E]">{title}</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Martial App Ltd · {updatedCopy[locale]}: {lastUpdated}
        </p>
        <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-[#374151]">
          {children}
        </div>
      </article>
    </main>
  )
}

export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 border-b border-gray-200 pb-2 text-lg font-semibold text-[#1C1C1E]">
        {heading}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

export function List({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5">{children}</ul>
}
