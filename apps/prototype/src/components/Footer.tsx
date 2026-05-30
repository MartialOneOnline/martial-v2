/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { 
  Facebook, 
  Instagram, 
  Twitter, 
  Youtube, 
  ArrowUp, 
  Dumbbell, 
  HelpCircle
} from 'lucide-react';
import { NAV_LINKS } from '../types';
import { useLanguage } from '../LanguageContext';

export default function Footer() {
  const { t, language } = useLanguage();
  
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const socialIcons = [
    { name: 'Facebook', icon: <Facebook className="w-4 h-4" />, href: '#fb' },
    { name: 'Instagram', icon: <Instagram className="w-4 h-4" />, href: '#ig' },
    { name: 'Twitter', icon: <Twitter className="w-4 h-4" />, href: '#tw' },
    { name: 'Youtube', icon: <Youtube className="w-4 h-4" />, href: '#yt' },
  ];

  // Helper dictionary for localized strings inside the Footer
  const labels: Record<string, Record<string, string>> = {
    desc: {
      en: "Discover a World of Martial Arts Experiences. Search Academies, Book Classes, Chat with instructors, Designed to connect the world of Martial Arts.",
      es: "Descubre un mundo de experiencias de artes marciales. Busca academias, reserva clases, chatea con instructores, diseñado para conectar el mundo de las artes marciales.",
      pt: "Descubra um mundo de experiências de artes marciais. Procure academias, reserve aulas, converse com instrutores, projetado para conectar o mundo das artes marciais.",
      fr: "Découvrez un monde d'expériences d'arts martiaux. Recherchez des académies, réservez des cours, discutez avec des instructeurs, conçu pour connecter le monde des arts martiaux."
    },
    navigate: {
      en: "Navigate",
      es: "Navegar",
      pt: "Navegação",
      fr: "Navigation"
    },
    support: {
      en: "Support",
      es: "Soporte",
      pt: "Suporte",
      fr: "Assistance"
    },
    about_us: {
      en: "About Us",
      es: "Sobre Nosotros",
      pt: "Sobre Nós",
      fr: "À Propos"
    },
    contact_us: {
      en: "Contact Us",
      es: "Contacto",
      pt: "Contato",
      fr: "Contactez-nous"
    },
    faq: {
      en: "FAQs",
      es: "Preguntas Frecuentes",
      pt: "Perguntas Frequentes",
      fr: "FAQ"
    },
    terms: {
      en: "Terms & Conditions",
      es: "Términos y Condiciones",
      pt: "Termos e Condições",
      fr: "Conditions Générales"
    },
    privacy: {
      en: "Privacy Policy",
      es: "Política de Privacidad",
      pt: "Política de Privacidade",
      fr: "Politique de Confidentialité"
    },
    rights: {
      en: "All Rights Reserved",
      es: "Todos los derechos reservados",
      pt: "Todos os direitos reservados",
      fr: "Tous droits réservés"
    }
  };

  const getTranslatedNavLabel = (label: string) => {
    const keyMap: Record<string, string> = {
      'Schools': 'nav.schools',
      'Explore': 'nav.schools',
      'Technology': 'nav.technology',
      'Academies & Trainers': 'nav.instructor_hub',
      'Dashboard': 'nav.instructor_hub',
      'Digital Learning': 'nav.martial_online',
      'Academy': 'nav.martial_online'
    };
    const key = keyMap[label];
    return key ? t(key) : label;
  };

  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 font-sans" id="footer-section">
      
      {/* Upper Main Footer Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-8" id="footer-main-grid">
          
          {/* Brand logotype and socials */}
          <div className="md:col-span-5 flex flex-col space-y-6 text-left" id="footer-brand-column">
            {/* Logo */}
            <a href="#" className="flex items-center gap-3 group focus:outline-none" id="footer-logo">
              <div className="relative w-12 h-12 overflow-hidden rounded-xl shadow-md group-hover:scale-105 transition-transform duration-300 bg-white">
                <img
                  src="/martial-logo.png"
                  alt="Martial App"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-wider text-slate-100 font-display animate-pulse">
                  MARTIAL
                </span>
                <span className="text-[9px] font-bold tracking-[0.25em] text-cyan-500 -mt-1 leading-none uppercase">
                  {t('nav.tagline') || 'TAKE CONTROL'}
                </span>
              </div>
            </a>

            {/* Description */}
            <p className="text-sm font-semibold leading-relaxed max-w-sm text-slate-400">
              {labels.desc[language] || labels.desc.en}
            </p>

            {/* Social media icons list */}
            <div className="flex items-center gap-2.5" id="socials-container">
              {socialIcons.map((soc) => (
                <a
                  key={soc.name}
                  href={soc.href}
                  className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-800 hover:border-cyan-500 hover:bg-slate-950 text-slate-300 hover:text-cyan-400 flex items-center justify-center transition-all cursor-pointer"
                  aria-label={soc.name}
                >
                  {soc.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Navigations */}
          <div className="md:col-span-3 text-left" id="footer-nav-col">
            <h4 className="text-white text-sm font-black uppercase tracking-wider mb-5 flex items-center gap-1.5">
              <Dumbbell className="w-4 h-4 text-cyan-400" />
              {labels.navigate[language] || labels.navigate.en}
            </h4>
            <ul className="space-y-3.5 text-sm font-semibold">
              {NAV_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="hover:text-cyan-400 transition-colors py-0.5 block"
                  >
                    {getTranslatedNavLabel(link.label)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Columns */}
          <div className="md:col-span-3 text-left" id="footer-support-col">
            <h4 className="text-white text-sm font-black uppercase tracking-wider mb-5 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              {labels.support[language] || labels.support.en}
            </h4>
            <ul className="space-y-3.5 text-sm font-semibold">
              <li>
                <a href="#about" className="hover:text-cyan-400 transition-colors py-0.5 block flex items-center gap-2">
                  <span>{labels.about_us[language] || labels.about_us.en}</span>
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-cyan-400 transition-colors py-0.5 block flex items-center gap-2">
                  <span>{labels.contact_us[language] || labels.contact_us.en}</span>
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-cyan-400 transition-colors py-0.5 block flex items-center gap-2">
                  <span>{labels.faq[language] || labels.faq.en}</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Core Scroll to Top button */}
          <div className="md:col-span-1 flex items-start md:justify-end" id="footer-scroll-top-container">
            <button
              onClick={scrollToTop}
              className="w-11 h-11 bg-slate-800 hover:bg-slate-950 text-slate-300 hover:text-cyan-400 border border-slate-700/60 hover:border-cyan-500 rounded-xl flex items-center justify-center cursor-pointer transition-all focus:outline-none"
              title="Scroll to Top"
              id="footer-scroll-top"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>

      {/* Bottom Legal bar + inline payment icons row matching Figma footer */}
      <div className="bg-slate-950 border-t border-slate-800 text-slate-500 text-[11px] font-bold" id="footer-bottom-bar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 md:text-left text-center">
            <span>© MartialApp. 2026 {labels.rights[language] || labels.rights.en}</span>
            <span className="hidden sm:inline text-slate-800">|</span>
            <div className="flex items-center gap-4">
              <a href="#terms" className="hover:text-slate-300 transition-colors">{labels.terms[language] || labels.terms.en}</a>
              <a href="#privacy" className="hover:text-slate-300 transition-colors">{labels.privacy[language] || labels.privacy.en}</a>
            </div>
          </div>

          {/* Inline footer payment icons */}
          <div className="flex items-center gap-3 flex-wrap opacity-60 hover:opacity-90 transition-opacity">
            <span className="mr-2 text-[10px] uppercase font-bold tracking-widest text-slate-600">Integrations:</span>
            {/* Stripe */}
            <span className="text-slate-400 font-extrabold italic tracking-tight font-display text-[11px]">stripe</span>
            {/* Paypal */}
            <span className="text-slate-400 font-black italic tracking-wide text-[11px]">PayPal</span>
            {/* GoCardless */}
            <span className="text-slate-400 text-[8px] font-black tracking-widest text-[9px] uppercase">gocardless</span>
            {/* Direct Debit */}
            <span className="text-[8px] border border-slate-600 px-1 rounded-sm text-[8px] uppercase font-black tracking-wider">Direct Debit</span>
            {/* Visa */}
            <span className="text-slate-400 font-black italic text-[11px] tracking-tight">VISA</span>
            {/* Mastercard dots logo */}
            <div className="flex -space-x-1 flex-shrink-0 items-center">
              <span className="w-3.5 h-3.5 bg-rose-600 rounded-full block" />
              <span className="w-3.5 h-3.5 bg-amber-500 rounded-full block" />
            </div>
          </div>

        </div>
      </div>

    </footer>
  );
}
