/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, ChevronDown, Globe } from 'lucide-react';
import { NAV_LINKS } from '../types';
import { useLanguage, Language } from '../LanguageContext';

function FlagIcon({ lang }: { lang: string }) {
  if (lang === 'es') {
    return (
      <div className="w-5 h-3.5 flex flex-col rounded-xs border border-gray-200 overflow-hidden shrink-0">
        <div className="h-1 bg-red-600 w-full" />
        <div className="h-1.5 bg-amber-400 w-full flex items-center pl-1">
          <div className="w-1 h-1 bg-red-600 rounded-full shrink-0" />
        </div>
        <div className="h-1 bg-red-600 w-full" />
      </div>
    );
  }
  if (lang === 'pt') {
    return (
      <div className="w-5 h-3.5 flex rounded-xs border border-gray-200 overflow-hidden shrink-0">
        <div className="w-[40%] bg-emerald-700 h-full relative" />
        <div className="w-[60%] bg-red-600 h-full relative flex items-center justify-start">
          <div className="absolute -left-1 w-2.5 h-2.5 bg-amber-400 rounded-full border border-blue-800 shrink-0" />
        </div>
      </div>
    );
  }
  if (lang === 'fr') {
    return (
      <div className="w-5 h-3.5 flex rounded-xs border border-gray-200 overflow-hidden shrink-0">
        <div className="w-1/3 bg-blue-800 h-full" />
        <div className="w-1/3 bg-white h-full" />
        <div className="w-1/3 bg-red-600 h-full" />
      </div>
    );
  }
  // Fallback / default uk flag
  return (
    <div className="w-5 h-3.5 bg-blue-800 relative overflow-hidden rounded-xs border border-gray-200 shrink-0">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-0.5 bg-white rotate-45 absolute" />
        <div className="w-full h-0.5 bg-white -rotate-45 absolute" />
        <div className="w-full h-1 bg-white absolute" />
        <div className="w-1 h-full bg-white absolute" />
        <div className="w-full h-[0.5px] bg-red-600 rotate-45 absolute" />
        <div className="w-full h-[0.5px] bg-red-600 -rotate-45 absolute" />
        <div className="w-full h-[0.6px] bg-red-600 absolute" />
        <div className="w-[0.6px] h-full bg-red-600 absolute" />
      </div>
    </div>
  );
}

interface HeaderProps {
  activeView: 'home' | 'explore' | 'school-detail' | 'academy' | 'academy-dashboard';
  onNavigate: (view: 'home' | 'explore' | 'school-detail' | 'academy' | 'academy-dashboard', sectionId?: string) => void;
  onLogout?: () => void;
}

const FIGMA_NAV_LINKS = [
  { label: 'HOME', view: 'home', sectionId: '' },
  { label: 'EXPLORE', view: 'explore', sectionId: '' },
  { label: 'ACADEMY', view: 'academy', sectionId: '' },
  { label: 'DASHBOARD', view: 'academy-dashboard', sectionId: '' },
  { label: 'TECHNOLOGY', view: 'home', sectionId: 'technology' },
  { label: 'PRICE', view: 'home', sectionId: 'payment-methods-section' }
];

export default function Header({ activeView, onNavigate, onLogout }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const handleLinkClick = (e: React.MouseEvent, item: typeof FIGMA_NAV_LINKS[0]) => {
    e.preventDefault();
    onNavigate(item.view as any, item.sectionId);
    setIsOpen(false);
  };

  const getNavLabelKey = (label: string) => {
    switch (label.toUpperCase()) {
      case 'HOME': return 'nav.home';
      case 'EXPLORE': return 'nav.schools';
      case 'ACADEMY': return 'nav.martial_online';
      case 'DASHBOARD': return 'nav.instructor_hub';
      case 'TECHNOLOGY': return 'nav.technology';
      case 'PRICE': return 'nav.price';
      default: return 'nav.home';
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20" id="navbar-container">
          
          {/* Logo */}
          <a
            href="#home"
            onClick={(e) => { e.preventDefault(); onNavigate('home'); }}
            className="flex items-center gap-3 group focus:outline-none"
            id="brand-logo-link"
          >
            <div className="relative w-12 h-12 overflow-hidden rounded-xl shadow-md group-hover:scale-105 transition-transform duration-300 bg-white">
              <img
                src="/martial-logo.png"
                alt="Martial App"
                className="w-full h-full object-contain"
              />
            </div>
            
            <div className="flex flex-col text-left">
              <span className="text-xl font-black tracking-wider text-slate-800 font-display leading-none">
                MARTIAL
              </span>
              <span className="text-[9px] font-bold tracking-[0.25em] text-cyan-600 mt-0.5 leading-none uppercase">
                {t('nav.tagline')}
              </span>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8" id="desktop-nav">
            {FIGMA_NAV_LINKS.map((link) => {
              const representsActive = 
                (activeView === 'home' && link.view === 'home' && !link.sectionId) ||
                (activeView === 'explore' && link.view === 'explore') ||
                (activeView === 'school-detail' && link.label === 'EXPLORE') ||
                (activeView === 'academy' && link.view === 'academy') ||
                (activeView === 'academy-dashboard' && link.view === 'academy-dashboard') ||
                (activeView === 'home' && link.sectionId && window.location.hash.includes(link.sectionId));

              return (
                <a
                  key={link.label}
                  href={`#${link.sectionId || link.view}`}
                  onClick={(e) => handleLinkClick(e, link)}
                  className={`text-[12.5px] lg:text-[13.5px] font-extrabold transition-all duration-200 relative py-2 ${
                    representsActive ? 'text-sky-500' : 'text-slate-600 hover:text-sky-500'
                  }`}
                >
                  {t(getNavLabelKey(link.label))}
                  <span className={`absolute bottom-0 left-0 h-0.5 bg-sky-500 transition-all duration-200 ${
                    representsActive ? 'w-full' : 'w-0'
                  }`} />
                </a>
              );
            })}
          </nav>

          {/* Utility Buttons: Interactive Dashboard/Logout Ribbon + country dropdown */}
          <div className="hidden md:flex items-center gap-4 lg:gap-6" id="desktop-utilities">
            {/* Country Selector */}
            <div className="relative">
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-extrabold text-[12.5px] py-2 focus:outline-none cursor-pointer"
                id="lang-select-btn"
              >
                <FlagIcon lang={language} />
                <span className="uppercase">{language}</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              <AnimatePresence>
                {langDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-30"
                    id="lang-dropdown"
                  >
                    {[
                      { code: 'en', name: 'English', flag: 'GB' },
                      { code: 'es', name: 'Español', flag: 'ES' },
                      { code: 'pt', name: 'Português', flag: 'PT' },
                      { code: 'fr', name: 'Français', flag: 'FR' },
                    ].map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code as Language);
                          setLangDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer ${
                          language === lang.code ? 'bg-sky-50 text-sky-600' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <FlagIcon lang={lang.code} />
                        <span>{lang.name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Figma angled double panel "DASHBOARD" | "LOGOUT" */}
            <div className="flex items-center select-none" id="figma-parallelogram-ribbon">
              {/* Dashboard Ribbon Button */}
              <button
                onClick={() => onNavigate('explore')}
                className="relative bg-[#0092ff] text-white font-black text-[11px] uppercase tracking-wider py-2.5 px-6 rounded-l-md hover:bg-[#007cd7] shadow-sm transform -skew-x-[15deg] transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <span className="transform skew-x-[15deg] inline-block">{t('nav.dashboard')}</span>
              </button>
              
              {/* Logout Ribbon Button */}
              <button
                onClick={() => {
                  if (onLogout) {
                    onLogout();
                  } else {
                    onNavigate('home');
                  }
                }}
                className="relative bg-slate-800 text-slate-200 font-extrabold text-[11px] uppercase tracking-widest py-2.5 px-6 rounded-r-md hover:bg-slate-900 border-l border-slate-700 transform -skew-x-[15deg] transition-all cursor-pointer"
              >
                <span className="transform skew-x-[15deg] inline-block">{t('nav.logout')}</span>
              </button>
            </div>

          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden" id="mobile-menu-container">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-600 hover:text-slate-900 p-2 rounded-lg focus:outline-none"
              id="mobile-hamburger"
              aria-label="Toggle Menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-100 text-left"
            id="mobile-drawer-items"
          >
            <div className="px-4 pt-4 pb-6 space-y-3">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-50 mb-1">
                <span className="text-xs font-black text-slate-400">LANGUAGE</span>
                <div className="flex gap-2">
                  {['en', 'es', 'pt', 'fr'].map((code) => (
                    <button
                      key={code}
                      onClick={() => setLanguage(code as Language)}
                      className={`px-2.5 py-1 text-[11px] font-black rounded uppercase border transition-all ${
                        language === code
                          ? 'border-sky-500 bg-sky-500 text-white'
                          : 'border-gray-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>

              {FIGMA_NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={`#${link.sectionId || link.view}`}
                  onClick={(e) => {
                    handleLinkClick(e, link);
                  }}
                  className="block px-3 py-2.5 rounded-lg text-sm font-black text-slate-600 hover:bg-slate-50 hover:text-sky-500 transition-all uppercase tracking-wider"
                >
                  {t(getNavLabelKey(link.label))}
                </a>
              ))}
              <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
                <button
                  onClick={() => { setIsOpen(false); onNavigate('explore'); }}
                  className="w-full text-center py-3 bg-[#0092ff] hover:bg-[#007cd7] text-white font-black text-xs uppercase tracking-wider rounded-lg transition-colors"
                >
                  {t('nav.dashboard')}
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    if (onLogout) {
                      onLogout();
                    } else {
                      onNavigate('home');
                    }
                  }}
                  className="w-full text-center py-3 bg-slate-800 hover:bg-slate-900 text-slate-200 font-black text-xs uppercase tracking-wider rounded-lg transition-colors"
                >
                  {t('nav.logout')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
