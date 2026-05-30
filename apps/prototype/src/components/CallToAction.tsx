/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Search, Compass } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

export default function CallToAction() {
  const { language } = useLanguage();

  const dict: Record<string, Record<string, string>> = {
    badge: {
      en: "Join the Global Martial Movement",
      es: "Únete al movimiento global de artes marciales",
      pt: "Junte-se ao movimento marcial global",
      fr: "Rejoignez le mouvement mondial des arts martiaux"
    },
    heading: {
      en: "Search Academies, Book Classes, Chat with instructors, Digital learning",
      es: "Busca academias, reserva clases, chatea con instructores, aprendizaje digital",
      pt: "Procure academias, reserve aulas, converse com instrutores, aprendizado digital",
      fr: "Recherchez des académies, réservez des cours, discutez, apprentissage numérique"
    },
    desc: {
      en: "Connecting sports enthusiasts worldwide, enhancing the training experience, making it enjoyable, and easily shareable. Sync your progression metrics and join the absolute standard in martial software.",
      es: "Conecta a los apasionados de los deportes de combate en todo el mundo, mejorando la experiencia de entrenamiento de manera divertida y fácil de compartir. Sincroniza tu progreso.",
      pt: "Conectando entusiastas do esporte em todo o mundo, aprimorando a experiência de treinamento de forma agradável e compartilhável. Sincronize suas métricas.",
      fr: "Connecter les passionnés de sport du monde entier, améliorer l'expérience d'entraînement sportive de manière ludique et facile à partager. Synchronisez vos acquis."
    },
    btn: {
      en: "Explore All Academies",
      es: "Explorar Todas las Academias",
      pt: "Explorar Todas as Academias",
      fr: "Explorer toutes les académies"
    }
  };

  return (
    <section className="bg-slate-900 py-16 sm:py-20 relative overflow-hidden" id="cta-exploration-section">
      {/* Background Graphic Grid */}
      <div className="absolute right-0 top-0 bottom-0 w-full lg:w-1/2 -z-0">
        <img
          src="https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&q=80&w=1200"
          alt="Focus Fighter wrapping hands"
          className="w-full h-full object-cover opacity-35 lg:opacity-75"
          referrerPolicy="no-referrer"
        />
        {/* Soft elegant gradient overlay so the text never clashes */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 lg:via-slate-900/40 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10" id="cta-container">
        <div className="lg:w-7/12 space-y-8 text-left">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0092ff]/20 border border-[#0092ff]/30 text-[#0092ff] text-xs font-black uppercase tracking-wider">
            <Compass className="w-4 h-4 text-sky-400 animate-pulse" />
            <span>{dict.badge[language] || dict.badge.en}</span>
          </div>

          {/* Heading */}
          <h2 className="text-3xl sm:text-4.5xl font-extrabold text-white leading-tight uppercase font-display">
            {dict.heading[language] || dict.heading.en}
          </h2>

          {/* Subtext */}
          <p className="text-slate-300 text-sm font-semibold leading-relaxed max-w-xl">
            {dict.desc[language] || dict.desc.en}
          </p>

          {/* Button CTA */}
          <div className="pt-2">
            <a
              href="#schools"
              className="inline-flex items-center gap-2.5 px-8 py-4 bg-[#0092ff] text-white hover:bg-[#007cd7] text-sm font-extrabold rounded-xl shadow-lg shadow-[#0092ff]/10 hover:shadow-[#0092ff]/20 transition-all cursor-pointer select-none active:scale-95"
              id="cta-explore-all-btn"
            >
              <Search className="w-4 h-4 text-white" />
              <span>{dict.btn[language] || dict.btn.en}</span>
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}
