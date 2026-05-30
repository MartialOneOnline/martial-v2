/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { ArrowRight, Award } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

export default function MissionSection() {
  const { language } = useLanguage();

  const missionTitle: Record<string, string> = {
    en: 'Our Mission is to Bring Technology Solutions to the Martial Arts and Combat Sports Industry',
    es: 'Nuestra Misión es Llevar Soluciones Tecnológicas a la Industria de las Artes Marciales y Deportes de Combate',
    pt: 'Nossa Missão é Trazer Soluções Tecnológicas para a Indústria de Artes Marciais e Esportes de Combate',
    fr: 'Notre Mission est d\'Apporter des Solutions Technologiques à l\'Industrie des Arts Martiaux et des Sports de Combat'
  };

  const moreAboutUs: Record<string, string> = {
    en: 'More About Us',
    es: 'Más Sobre Nosotros',
    pt: 'Saiba Mais Sobre Nós',
    fr: 'En savoir plus sur nous'
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-[#0092ff] to-cyan-500 text-white py-14 sm:py-20" id="mission-section">
      {/* Decorative vectors */}
      <div className="absolute top-0 left-0 -z-0 opacity-10 pointer-events-none">
        <svg className="w-80 h-80 text-white" fill="currentColor" viewBox="0 0 100 100">
          <circle cx="20" cy="20" r="40" />
        </svg>
      </div>
      <div className="absolute bottom-0 right-0 -z-0 opacity-15 pointer-events-none">
        <svg className="w-[450px] h-[450px] text-white" fill="currentColor" viewBox="0 0 100 100">
          <circle cx="80" cy="80" r="50" />
        </svg>
      </div>

      <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
        
        {/* Centered White Logo Symbol */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white overflow-hidden shadow-lg mb-8" id="mission-logo">
          <img
            src="/martial-logo.png"
            alt="Martial App"
            className="w-full h-full object-contain p-2.5"
          />
        </div>

        {/* Mission Statement */}
        <h2 className="text-2xl sm:text-3.5xl lg:text-4xl font-extrabold tracking-tight leading-tight mb-8">
          {missionTitle[language] || missionTitle['en']}
        </h2>

        {/* Link / Button */}
        <div>
          <a
            href="#technology"
            className="inline-flex items-center gap-2 group text-white font-extrabold text-[15px] border-b-2 border-white pb-1.5 focus:outline-none hover:text-sky-100 hover:border-sky-100 transition-colors"
            id="mission-more-btn"
          >
            <span>{moreAboutUs[language] || moreAboutUs['en']}</span>
            <motion.span
              animate={{ x: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
            >
              <ArrowRight className="w-4 h-4" />
            </motion.span>
          </a>
        </div>

      </div>
    </section>
  );
}
