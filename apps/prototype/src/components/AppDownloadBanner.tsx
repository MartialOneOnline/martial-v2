/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Download, Users, Navigation } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

export default function AppDownloadBanner() {
  const { language } = useLanguage();

  const labels: Record<string, Record<string, string>> = {
    badge_pro: {
      en: "Pro Grade Solution",
      es: "Solución de Nivel Profesional",
      pt: "Solução de Nível Profissional",
      fr: "Solution de Niveau Professionnel"
    },
    sync_systems: {
      en: "Synchronized Combat Systems",
      es: "Sistemas de Combate Sincronizados",
      pt: "Sistemas de Combate Sincronizados",
      fr: "Systèmes de Combat Synchronisés"
    },
    adopted_by: {
      en: "Adopted by elite trainers across Europe & US.",
      es: "Adoptado por entrenadores de élite de Europa y EE. UU.",
      pt: "Adotado por treinadores de elite na Europa e nos EUA.",
      fr: "Adopté par les meilleurs entraîneurs en Europe et aux États-Unis."
    },
    instant_app: {
      en: "Instant App Download",
      es: "Descarga Instantánea de la Aplicación",
      pt: "Download Instantâneo do Aplicativo",
      fr: "Téléchargement Instantané"
    },
    platform_avail: {
      en: "Our platform is available on any app store",
      es: "Nuestra plataforma está disponible en todas las tiendas",
      pt: "Nossa plataforma está disponível em qualquer app store",
      fr: "Notre plateforme est disponible sur tous les stores"
    },
    innovative_software: {
      en: "Innovative Management Software for Martial Arts Academies and Business & User Interaction Worldwide. Get the native app now to coordinate grades and pay subscriptions on the fly.",
      es: "Software de gestión innovador para academias de artes marciales e interacción empresarial y de usuarios en todo el mundo. Descarga la aplicación nativa ahora mismo.",
      pt: "Software de gestão inovador para academias de artes marciais e interação global com os alunos. Baixe o aplicativo e gerencie exames e assinaturas de onde estiver.",
      fr: "Logiciel de gestion innovant pour les académies d'arts martiaux et l'interaction des utilisateurs. Obtenez l'application native pour suivre vos grades et règlements."
    },
    members: {
      en: "Members",
      es: "Miembros",
      pt: "Membros",
      fr: "Membres"
    },
    downloads: {
      en: "Downloads",
      es: "Descargas",
      pt: "Downloads",
      fr: "Téléchargements"
    },
    cities: {
      en: "Cities",
      es: "Ciudades",
      pt: "Cidades",
      fr: "Villes"
    }
  };

  return (
    <section className="bg-slate-50 py-16 sm:py-20 relative overflow-hidden" id="app-download-banner-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main curved layout card panel */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden grid lg:grid-cols-12 gap-8 items-center" id="download-panel-frame">
          
          {/* Left Visual: Fighting Champion Image inside octagonal ring */}
          <div className="lg:col-span-5 h-[320px] lg:h-[450px] bg-slate-900 relative overflow-hidden" id="champion-image-container">
            <img
              src="https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=1200"
              alt="Martial champion inside cage celebration"
              className="w-full h-full object-cover object-top opacity-85"
              referrerPolicy="no-referrer"
            />
            {/* Ambient vignette lines */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
            
            <div className="absolute bottom-6 left-6 text-white text-left space-y-1">
              <span className="text-[9px] font-black tracking-widest bg-sky-500 px-2.5 py-1 rounded-md uppercase">
                {labels.badge_pro[language] || labels.badge_pro.en}
              </span>
              <h4 className="text-lg font-extrabold tracking-tight">
                {labels.sync_systems[language] || labels.sync_systems.en}
              </h4>
              <p className="text-xs text-slate-300 font-semibold">
                {labels.adopted_by[language] || labels.adopted_by.en}
              </p>
            </div>
          </div>

          {/* Right Information Column */}
          <div className="lg:col-span-7 p-6 sm:p-10 lg:pl-4 space-y-8 text-left" id="download-text-container">
            <div>
              <span className="text-xs font-black text-sky-500 uppercase tracking-widest block mb-1">
                {labels.instant_app[language] || labels.instant_app.en}
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight uppercase font-display">
                <span className="text-[#0092ff] block sm:inline">Our platform</span> is available <br className="hidden sm:inline" />
                on any app store
              </h2>
              <p className="text-slate-600 text-sm mt-3 leading-relaxed max-w-lg font-semibold">
                {labels.innovative_software[language] || labels.innovative_software.en}
              </p>
            </div>

            {/* Badges buttons row */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Play Store */}
              <a
                href="#play-store"
                className="flex items-center gap-3 bg-slate-900 text-white px-5 py-2.5 rounded-lg border border-slate-800 hover:bg-slate-950 transition-colors shadow-xs"
                id="footer-gplay-btn"
              >
                <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3.25 2.1c-.13 0-.25.04-.36.12l10.95 10.95 3.32-3.32L3.6 2.2c-.1-.08-.22-.1-.35-.1zM2.5 3v18c0 .24.1.48.28.66l10.33-10.33L2.78 2.34C2.6 2.52 2.5 2.76 2.5 3zm11.23 9.66l3.33 3.33 3.54-2.03c.5-.28.8-.8.8-1.38s-.3-1.1-.8-1.38l-3.54-2.03-3.33 3.33l-.03.11v.05zm-.87-.87l-10.3 10.3c.11.08.23.1.36.1l13.56-7.78-3.62-3.62z" />
                </svg>
                <div className="text-left">
                  <p className="text-[8px] font-medium text-slate-400 uppercase tracking-wider leading-none">GET IT ON</p>
                  <p className="text-xs font-semibold tracking-wide leading-tight mt-0.5">Google Play</p>
                </div>
              </a>

              {/* App store */}
              <a
                href="#app-store"
                className="flex items-center gap-3 bg-slate-900 text-white px-5 py-2.5 rounded-lg border border-slate-800 hover:bg-slate-950 transition-colors shadow-xs"
                id="footer-appstore-btn"
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.02-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.58 2.95-1.39z" />
                </svg>
                <div className="text-left">
                  <p className="text-[8px] font-medium text-slate-400 uppercase tracking-wider leading-none">Download on the</p>
                  <p className="text-xs font-semibold tracking-wide leading-tight mt-0.5">App Store</p>
                </div>
              </a>
            </div>

            {/* Miniature Stats Row inside layout */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-100 max-w-md" id="download-mini-stats">
              <div className="space-y-1">
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-display block">+23.6k</span>
                <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase inline-flex items-center gap-1">
                  <Users className="w-3 h-3 text-sky-500" />
                  {labels.members[language] || labels.members.en}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-display block">1000+</span>
                <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase inline-flex items-center gap-1">
                  <Download className="w-3 h-3 text-sky-500" />
                  {labels.downloads[language] || labels.downloads.en}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-display block">25</span>
                <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase inline-flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-sky-500" />
                  {labels.cities[language] || labels.cities.en}
                </span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
