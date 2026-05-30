/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Search, 
  Users, 
  Video, 
  Layers, 
  Star, 
  User, 
  PlayCircle, 
  Clock, 
  DollarSign, 
  Sparkles, 
  CheckCircle,
  TrendingUp,
  Award,
  Lock,
  ChevronRight,
  Monitor
} from 'lucide-react';
import { AcademyCourse, CreatorTier } from './academyTypes';
import { INITIAL_COURSES, PATREON_TIERS } from './academyData';
import { useLanguage } from '../LanguageContext';

interface MartialOnlineLandingProps {
  onNavigateToDashboard: () => void;
  onNavigateToView: (view: 'home' | 'explore' | 'school-detail') => void;
  userBalance: number;
  setUserBalance: React.Dispatch<React.SetStateAction<number>>;
  purchasedCourseIds: string[];
  setPurchasedCourseIds: React.Dispatch<React.SetStateAction<string[]>>;
  subscribedTierId: string | null;
  setSubscribedTierId: React.Dispatch<React.SetStateAction<string | null>>;
  addNotification: (message: string) => void;
}

export default function MartialOnlineLanding({
  onNavigateToDashboard,
  onNavigateToView,
  userBalance,
  setUserBalance,
  purchasedCourseIds,
  setPurchasedCourseIds,
  subscribedTierId,
  setSubscribedTierId,
  addNotification
}: MartialOnlineLandingProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCourse, setSelectedCourse] = useState<AcademyCourse | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [tierToSubscribe, setTierToSubscribe] = useState<CreatorTier | null>(null);
  const { t, language } = useLanguage();

  // Filter courses based on category and search query
  const filteredCourses = INITIAL_COURSES.filter(course => {
    const matchesCategory = selectedCategory === 'All' || course.category === selectedCategory;
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          course.instructor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          course.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handlePurchaseCourse = (course: AcademyCourse) => {
    if (purchasedCourseIds.includes(course.id)) {
      addNotification(`You have already enrolled in: ${course.title}!`);
      return;
    }

    if (userBalance < course.price) {
      addNotification(`Insufficient simulated balance! Please add funds in the Dashboard.`);
      return;
    }

    setUserBalance(prev => Number((prev - course.price).toFixed(2)));
    setPurchasedCourseIds(prev => [...prev, course.id]);
    addNotification(`🎉 Course purchased successfully: ${course.title}!`);
    setCheckoutModalOpen(false);
    setSelectedCourse(null);
  };

  const handleSubscribeTier = (tier: CreatorTier) => {
    if (subscribedTierId === tier.id) {
      addNotification(`You are already subscribed to: ${tier.name}!`);
      return;
    }

    if (userBalance < tier.priceMonthly) {
      addNotification(`Insufficient balance to subscribe to ${tier.name}. Please top up your wallet.`);
      return;
    }

    setUserBalance(prev => Number((prev - tier.priceMonthly).toFixed(2)));
    setSubscribedTierId(tier.id);
    addNotification(`💖 Thank you! Subscribed to ${tier.name} ($${tier.priceMonthly}/mo)`);
    setTierToSubscribe(null);
  };

  const getTranslatedCourseTitle = (title: string, id: string) => {
    const dict: Record<string, Record<string, string>> = {
      'course-1': {
        en: 'Roger Gracie Masterclass: Closed Guard Control',
        es: 'Clase Maestra Roger Gracie: Control de Guardia Cerrada',
        pt: 'Roger Gracie Masterclass: Controle de Guarda Fechada',
        fr: 'Masterclass Roger Gracie : Contrôle de Garde Fermée'
      },
      'course-2': {
        en: 'Dynamic Sweeps & Submission Frameworks',
        es: 'Raspados Dinámicos y Llaves de Sumisión',
        pt: 'Raspadas Dinâmicas e Sistemas de Finalização',
        fr: 'Renversements Dynamiques & Soumissions'
      },
      'course-3': {
        en: 'Championship Sparring: Elite Striking Combos',
        es: 'Combate de Campeonato: Combos de Golpeo de Élite',
        pt: 'Sparring de Campeonato: Combinações de Elite',
        fr: 'Sparring de Championnat : Combos de Percussion d\'Élite'
      },
      'course-4': {
        en: 'Satori Karate: Core Kata Fundamentals',
        es: 'Satori Karate: Fundamentos de Katas Esenciales',
        pt: 'Satori Caratê: Fundamentos de Katas Essenciais',
        fr: 'Karaté Satori : Principes Fondamentaux du Kata'
      }
    };
    return dict[id]?.[language] || title;
  };

  const getTranslatedCourseDesc = (desc: string, id: string) => {
    const dict: Record<string, Record<string, string>> = {
      'course-1': {
        en: 'Learn the exact details of Roger Gracie\'s legendary closed guard system. Includes position dominance, defense recovery and transitions.',
        es: 'Aprende los detalles exactos del legendario sistema de guardia cerrada de Roger Gracie. Dominación posicional y transiciones.',
        pt: 'Aprenda os detalhes exatos do lendário sistema de guarda fechada de Roger Gracie. Controle, defesa e finalizações clássicas.',
        fr: 'Découvrez les secrets du légendaire système de garde fermée de Roger Gracie. Dominez les positions et finalisez sereinement.'
      },
      'course-2': {
        en: 'Unlock high-level sweeps from half-guard, spider-guard, and de la riva. Engineered strictly for modern competitive athletes.',
        es: 'Desbloquea raspados de nivel avanzado desde media guardia, guardia araña y de la riva. Diseñado para atletas competitivos.',
        pt: 'Domine raspagens de alto nível de meia-guarda, guarda-aranha e dela riva. Desenvolvido para atletas competitivos modernos.',
        fr: 'Maîtrisez les renversements depuis la demi-garde, la garde araignée ou de la riva. Pour les compétiteurs modernes.'
      },
      'course-3': {
        en: 'Refine your fight IQ with pro kicking setups, defensive cover-ups, and custom sparring combos from certified trainers.',
        es: 'Refina tu IQ de pelea con esquemas de patadas profesionales, coberturas defensivas y combos de sparring avanzados.',
        pt: 'Refine seu QI de luta com setups profissionais de chutes, coberturas de esquiva e combinações de sparring de elite.',
        fr: 'Améliorez votre QI de combat avec des enchaînements de frappes, des gardes hermétiques et des conseils de sparring.'
      },
      'course-4': {
        en: 'Perfect your stances, rotational power, and breathing. Essential catalog of traditional black belt syllabus tutorials.',
        es: 'Perfecciona tus posturas, potencia de rotación y respiración. Catálogo básico para cinturones negros tradicionales.',
        pt: 'Guia completo para aperfeiçoar sua postura, potência de rotação e respiração. Essencial para exames de faixa preta.',
        fr: 'Perfectionnez vos postures, votre force de rotation et votre respiration. Catalogue d\'apprentissage traditionnel.'
      }
    };
    return dict[id]?.[language] || desc;
  };

  return (
    <div className="bg-[#f8fafc] text-slate-800 min-h-screen pb-16 font-sans">
      
      {/* Academy Subheader Ribbon */}
      <div className="bg-slate-900 text-white border-b border-sky-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6 overflow-x-auto scrollbar-none py-1">
            <span className="font-black text-xs uppercase tracking-widest text-[#0092ff] whitespace-nowrap">
              {t('academy.header_ribbon')}
            </span>
            <div className="h-4 w-px bg-slate-700" />
            {['Categories', 'All Courses', 'Instructors Portal', 'Creator Patreon System'].map((item, idx) => {
              let displayItem = item;
              if (item === 'Categories') displayItem = language === 'es' ? 'Categorías' : language === 'pt' ? 'Categorias' : language === 'fr' ? 'Catégories' : 'Categories';
              if (item === 'All Courses') displayItem = language === 'es' ? 'Todos los Cursos' : language === 'pt' ? 'Todos os Cursos' : language === 'fr' ? 'Tous les Cours' : 'All Courses';
              if (item === 'Instructors Portal') displayItem = language === 'es' ? 'Portal de Instructores' : language === 'pt' ? 'Portal de Instrutores' : language === 'fr' ? 'Espace Enseignants' : 'Instructors Portal';
              if (item === 'Creator Patreon System') displayItem = language === 'es' ? 'Suscripciones Patreon' : language === 'pt' ? 'Assinaturas Patreon' : language === 'fr' ? 'Abonnements Patreon' : 'Creator Patreon System';

              return (
                <button 
                  key={idx} 
                  className="text-slate-300 hover:text-white text-xs font-bold transition-all whitespace-nowrap cursor-pointer hover:underline"
                  onClick={() => {
                    if (item.includes('Creator') || item.includes('Instructors')) {
                      onNavigateToDashboard();
                    } else {
                      setSelectedCategory('All');
                      setSearchQuery('');
                    }
                  }}
                >
                  {displayItem}
                </button>
              );
            })}
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400">
              {language === 'es' ? 'Tu saldo virtual:' : language === 'pt' ? 'Carteira virtual:' : language === 'fr' ? 'Votre solde :' : 'Your Wallet:'}
            </span>
            <span className="bg-sky-500/10 text-[#0092ff] border border-sky-400/20 px-2.5 py-1 rounded-md text-xs font-black">
              ${userBalance.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Hero Header Area */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white py-14 sm:py-20 px-4 md:px-8">
        {/* Background glowing effects */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-1/3 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10" id="academy-hero-texts">
          <span className="bg-sky-500/10 text-sky-400 border border-sky-500/30 font-black text-[11px] tracking-widest uppercase px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 mb-5 select-none animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> {t('academy.hero_badge')}
          </span>
          
          <h1 className="text-3xl sm:text-5xl md:text-5xl font-black tracking-tight leading-tight uppercase font-display max-w-4xl mx-auto">
            {t('academy.hero_title_p1')} <span className="text-sky-400 outline-text">{t('academy.hero_title_p2')}</span>
          </h1>
          
          <p className="mt-5 text-sm sm:text-base text-slate-300 max-w-3xl mx-auto font-medium leading-relaxed">
            {t('academy.hero_desc')}
          </p>

          {/* Quick Creator CTA Panels */}
          <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
            <button
              onClick={onNavigateToDashboard}
              className="w-full sm:w-auto bg-[#0092ff] hover:bg-[#007cd7] text-white font-extrabold text-sm py-4 px-8 rounded-xl shadow-lg shadow-sky-500/20 hover:scale-105 transition-all flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span>{t('academy.btn_creator')}</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button
              onClick={() => {
                const element = document.getElementById('patreon-tiers-section');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="w-full sm:w-auto bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 text-white font-extrabold text-sm py-4 px-8 rounded-xl hover:scale-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{t('academy.btn_patreon')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Core Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        
        {/* Statistics Bar - Image 1 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white rounded-2xl p-5 border border-slate-100 shadow-xl" id="academy-statistics">
          {[
            { value: '10', label: t('academy.stat_instructors'), icon: Users, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
            { value: '10k+', label: t('academy.stat_students'), icon: Award, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
            { value: '9', label: t('academy.stat_classes'), icon: Monitor, color: 'text-rose-600 bg-rose-50 border-rose-100' },
            { value: '8', label: t('academy.stat_courses'), icon: BookOpen, color: 'text-sky-600 bg-sky-50 border-sky-100' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-4 p-3 border-r border-slate-100 last:border-0">
              <div className={`p-3 rounded-xl border ${item.color}`}>
                <item.icon className="w-5 h-5 flex-shrink-0" />
              </div>
              <div className="text-left">
                <p className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">{item.value}</p>
                <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Categories Bar & Search */}
        <div className="mt-12 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
          {/* Categories Nav */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1" id="category-scroller">
            {['All', 'BJJ', 'Striking', 'MMA', 'Fitness'].map((cat) => {
              let displayCat = cat;
              if (cat === 'All') displayCat = language === 'es' ? 'Todos' : language === 'pt' ? 'Todos' : language === 'fr' ? 'Tous' : 'All';
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-black tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#0092ff] text-white shadow-md shadow-sky-500/10'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {displayCat}
                </button>
              );
            })}
          </div>

          {/* Search box */}
          <div className="relative w-full md:w-80 flex items-center">
            <Search className="w-5 h-5 absolute left-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder={t('academy.search_courses')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-slate-800 text-sm pl-11 pr-20 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 tracking-tight transition-all shadow-xs"
            />
            <span className="absolute right-3.5 bg-slate-100 text-slate-500 text-[10px] font-black tracking-wide px-2 py-0.5 rounded-md border border-slate-200 uppercase">
              Ctrl+K
            </span>
          </div>
        </div>

        {/* Recently Published Section */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-8">
            <div className="text-left">
              <h2 className="text-xs font-black tracking-widest text-[#0092ff] uppercase">{t('academy.recently_pub')}</h2>
              <p className="text-xl sm:text-2xl font-black text-slate-800">{t('academy.new_courses')}</p>
            </div>
            <span className="text-slate-400 text-xs font-bold">
              {language === 'es' ? 'Mostrando' : language === 'pt' ? 'Mostrando' : language === 'fr' ? 'Affichage de' : 'Showing'} {filteredCourses.length} {language === 'es' ? 'resultados' : language === 'pt' ? 'resultados' : language === 'fr' ? 'résultats' : 'results'}
            </span>
          </div>

          {filteredCourses.length === 0 ? (
            <div className="bg-white rounded-2xl py-12 px-6 text-center border border-slate-100 shadow-xs max-w-xl mx-auto">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-md font-extrabold text-slate-700">
                {language === 'es' ? 'No hay cursos que coincidan' : language === 'pt' ? 'Nenhum curso coincide' : language === 'fr' ? 'Aucun cours ne correspond' : 'No courses match your parameters'}
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                {language === 'es' ? 'Prueba reiniciando los filtros o buscando otro término.' : language === 'pt' ? 'Tente limpar os filtros ou buscar outro termo.' : language === 'fr' ? 'Veuillez réinitialiser vos critères de recherche.' : 'Try resetting the category filter or searching for alternative terms.'}
              </p>
              <button
                onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
                className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-extrabold rounded-lg text-xs cursor-pointer"
              >
                {t('academy.clear_filters')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="academy-course-grid">
              {filteredCourses.map((course) => {
                const isPurchased = purchasedCourseIds.includes(course.id);
                const matchesTier = subscribedTierId === 'tier-purple' || subscribedTierId === 'tier-black';
                const isUnlockedBySub = course.isSubscriptionOnly && matchesTier;
                const hasAccess = isPurchased || isUnlockedBySub;

                let categoryDisplay: string = course.category;
                if (course.category === 'Striking') categoryDisplay = language === 'es' ? 'Golpeo' : language === 'pt' ? 'Combate em Pé' : language === 'fr' ? 'Percussion' : 'Striking';

                return (
                  <motion.div
                    layout
                    key={course.id}
                    className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-lg hover:shadow-xl transition-shadow flex flex-col"
                  >
                    {/* Cover image & category tag */}
                    <div className="relative h-44 w-full bg-slate-100 overflow-hidden group">
                      <img
                        src={course.image}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-black tracking-widest px-2.5 py-1 rounded-md uppercase border border-white/10">
                        {categoryDisplay}
                      </div>

                      {course.isSubscriptionOnly && (
                        <div className="absolute top-3 right-3 bg-indigo-600/90 backdrop-blur-xs text-white text-[9px] font-black tracking-widest px-2.5 py-1 rounded-md border border-indigo-400/30 flex items-center gap-1 uppercase">
                          <Lock className="w-2.5 h-2.5" /> {language === 'es' ? 'Exclusivo Patreon' : language === 'pt' ? 'Exclusivo Patreon' : language === 'fr' ? 'Exclusif Patreon' : 'Patreon Exclusive'}
                        </div>
                      )}

                      {/* Course Quick Stats Row */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                        <div className="flex gap-2 text-white bg-slate-900/60 backdrop-blur-xs text-[10px] font-extrabold px-2 py-0.5 rounded-sm">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-sky-400" /> {course.durationHours}h
                          </span>
                          <span className="flex items-center gap-1 border-l border-white/20 pl-2">
                            <BookOpen className="w-3 h-3 text-sky-400" /> {course.lessonsCount} {language === 'es' ? 'lecciones' : language === 'pt' ? 'aulas' : language === 'fr' ? 'chapitres' : 'lessons'}
                          </span>
                        </div>
                        <div className="bg-yellow-400 text-slate-900 px-1.5 py-0.5 rounded-xs flex items-center gap-0.5 text-[10px] font-black">
                          <Star className="w-3 h-3 fill-slate-900" /> {course.rating.toFixed(1)}
                        </div>
                      </div>
                    </div>

                    {/* Meta info & content */}
                    <div className="p-5 flex-1 flex flex-col text-left">
                      
                      {/* Instructor block */}
                      <div className="flex items-center gap-2.5 mb-3">
                        <img
                          src={course.instructor.avatar}
                          alt={course.instructor.name}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200"
                          referrerPolicy="no-referrer"
                        />
                        <div className="leading-tight">
                          <p className="text-[11px] font-black text-slate-800">{course.instructor.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{course.instructor.role}</p>
                        </div>
                      </div>

                      <h3 className="text-md font-black text-slate-900 leading-snug uppercase min-h-12 flex items-center">
                        {getTranslatedCourseTitle(course.title, course.id)}
                      </h3>

                      <p className="text-xs font-semibold text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                        {getTranslatedCourseDesc(course.description, course.id)}
                      </p>

                      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-400 tracking-wider">
                            {language === 'es' ? 'PRECIO' : language === 'pt' ? 'VALOR' : language === 'fr' ? 'TARIF' : 'PRICING'}
                          </span>
                          <span className="text-lg font-black text-slate-900">
                            {course.isSubscriptionOnly 
                              ? (language === 'es' ? 'Suscripción' : language === 'pt' ? 'Assinatura' : language === 'fr' ? 'Abonnement' : 'Sub Access')
                              : `$${course.price.toFixed(2)}`}
                          </span>
                        </div>

                        {hasAccess ? (
                          <button
                            onClick={() => { setSelectedCourse(course); }}
                            className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-xs py-2 px-4 rounded-xl flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4 text-emerald-600" /> {t('academy.unlocked')}
                          </button>
                        ) : (
                          <button
                            onClick={() => { setSelectedCourse(course); }}
                            className="bg-[#0092ff] hover:bg-[#007cd7] text-white font-extrabold text-xs py-2 px-4 rounded-xl hover:scale-105 transition-all cursor-pointer shadow-sm"
                          >
                            {t('academy.get_course')}
                          </button>
                        )}
                      </div>

                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Patreon Patreon Sponsor tiers Section */}
        <div className="mt-20 border-t border-slate-200 pt-16 text-center" id="patreon-tiers-section">
          <span className="text-[#ff424d] font-black text-xs tracking-widest uppercase bg-[#ff424d]/10 px-3 py-1.5 rounded-full inline-flex items-center gap-1 shadow-sm">
            {t('academy.patreon_title_badge')}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-4 leading-tight uppercase font-display">
            {t('academy.patreon_headline')}
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-slate-500 max-w-2xl mx-auto leading-relaxed">
            {t('academy.patreon_desc')}
          </p>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {PATREON_TIERS.map((tier) => {
              const isSubscribed = subscribedTierId === tier.id;

              // Translate benefits list
              const getTranslatedBenefits = (tierId: string) => {
                const benefitsDict: Record<string, string[]> = {
                  'tier-white': [
                    'Sponsor Badge inside group chat',
                    'Direct contact with Roger Gracie Malaga',
                    'Weekly sparring breakdown videos'
                  ],
                  'tier-purple': [
                    'All White Belt sponsor benefits',
                    'Acess to premium subscription tutorials',
                    'Monthly private Q&A live broadcast'
                  ],
                  'tier-black': [
                    'Access to ALL video lessons library',
                    'Direct video feedback critique from coach',
                    'Instant check-in notifications priority'
                  ]
                };
                
                // Direct translation values
                const localBenefits: Record<string, Record<string, string[]>> = {
                  'tier-white': {
                    en: ['Sponsor Badge inside group chat', 'Direct contact with instructors', 'Weekly sparring breakdown videos'],
                    es: ['Insignia de Patrocinador en chat grupal', 'Contacto directo con instructores', 'Videos semanales de combates comentados'],
                    pt: ['Selo de Apoiador no chat de grupo', 'Contato direto com professores', 'Análise semanal de lutas em vídeo'],
                    fr: ['Badge de Donateur dans le chat', 'Contact direct avec l\'équipe', 'Vidéos d\'analyse de sparring hebdomadaires']
                  },
                  'tier-purple': {
                    en: ['All White Belt sponsor benefits', 'Access to premium subscription tutorials', 'Monthly private Q&A live broadcast'],
                    es: ['Todos los beneficios del cinturón blanco', 'Acceso a tutoriales y cursos prémium', 'Directos privados mensuales de preguntas y respuestas'],
                    pt: ['Todos os benefícios da faixa branca', 'Acesso completo a tutorias premium', 'Live mensal restrita de perguntas e respostas'],
                    fr: ['Tous les avantages ceinture blanche', 'Accès aux tutoriels exclusifs', 'Foyers de discussion questions/réponses']
                  },
                  'tier-black': {
                    en: ['Access to ALL video lessons library', 'Direct video feedback critique from coach', 'Instant check-in notifications priority'],
                    es: ['Acceso total a la biblioteca de videos', 'Videorretroalimentación y crítica de técnicas directa de entrenadores', 'Notificaciones de entrada prioritarias'],
                    pt: ['Acesso a TODA a biblioteca de aulas', 'Correção de técnica em vídeo diretamente pelo professor', 'Suporte prioritário instantâneo'],
                    fr: ['Accès à l\'INTÉGRALITÉ des cours', 'Correction vidéo personnalisée de vos techniques', 'Support prioritaire instantané']
                  }
                };

                return localBenefits[tierId]?.[language] || benefitsDict[tierId];
              };

              let tierNameDisplay = tier.name;
              if (tier.name.includes('White')) tierNameDisplay = language === 'es' ? 'Faixa Blanca' : language === 'pt' ? 'Faixa Branca' : language === 'fr' ? 'Ceinture Blanche' : 'White Belt Sponsor';
              if (tier.name.includes('Purple')) tierNameDisplay = language === 'es' ? 'Faixa Morada' : language === 'pt' ? 'Faixa Roxa' : language === 'fr' ? 'Ceinture Violette' : 'Purple Belt Supporter';
              if (tier.name.includes('Black')) tierNameDisplay = language === 'es' ? 'Faixa Negra' : language === 'pt' ? 'Faixa Preta' : language === 'fr' ? 'Ceinture Noire' : 'Black Belt Patron';

              let tierDescDisplay = tier.description;
              if (tier.id === 'tier-white') {
                tierDescDisplay = language === 'es' ? 'Apoya a nuestro talentoso dojo y accede al tablón de noticias.' : language === 'pt' ? 'Apoie nosso dojo e receba atualizações exclusivas no feed.' : language === 'fr' ? 'Soutenez activement notre dojo et accédez au forum.' : tier.description;
              } else if (tier.id === 'tier-purple') {
                tierDescDisplay = language === 'es' ? 'Accede a los tutoriales de video exclusivos para patrocinadores.' : language === 'pt' ? 'Acesse os guias em vídeo exclusivos de treinamento.' : language === 'fr' ? 'Débloquez les tutoriels techniques exclusifs.' : tier.description;
              } else {
                tierDescDisplay = language === 'es' ? 'Recibe correcciones y críticas en video personalizadas del profesor.' : language === 'pt' ? 'Receba correções personalizadas em vídeo pelo próprio treinador.' : language === 'fr' ? 'Bénéficiez d\'une correction vidéo personnalisée par le coach.' : tier.description;
              }

              return (
                <div
                  key={tier.id}
                  className={`bg-white rounded-2xl border p-6 flex flex-col relative overflow-hidden transition-all duration-300 ${
                    isSubscribed 
                      ? 'border-[#ff424d] ring-2 ring-[#ff424d]/30 shadow-xl' 
                      : 'border-slate-200 shadow-md hover:border-slate-300'
                  }`}
                >
                  {isSubscribed && (
                    <div className="absolute top-0 right-0 bg-[#ff424d] text-white text-[9px] font-black tracking-widest uppercase px-4 py-1 rounded-bl-lg">
                      {t('academy.my_subscription')}
                    </div>
                  )}

                  <span className={`border text-[9px] font-black tracking-widest uppercase py-1 px-2.5 rounded-md self-start ${tier.badgeColor}`}>
                    {tierNameDisplay}
                  </span>

                  <h3 className="text-xl font-black text-slate-900 mt-4">${tier.priceMonthly.toFixed(2)}<span className="text-slate-400 font-semibold text-xs lowercase"> / m</span></h3>
                  
                  <p className="text-xs text-slate-500 mt-2 font-medium">
                    {tierDescDisplay}
                  </p>

                  <div className="my-5 h-px bg-slate-100" />

                  <ul className="space-y-2.5 flex-1 text-xs text-slate-600 font-semibold">
                    {getTranslatedBenefits(tier.id).map((benefit, bIdx) => (
                      <li key={bIdx} className="flex gap-2 text-left bg-transparent">
                        <CheckCircle className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => {
                      if (isSubscribed) {
                        addNotification(`You are already subscribed to ${tierNameDisplay}!`);
                      } else {
                        setTierToSubscribe(tier);
                      }
                    }}
                    className={`w-full py-3 rounded-xl font-extrabold text-xs tracking-wider transition-all cursor-pointer mt-6 flex items-center justify-center gap-1.5 ${
                      isSubscribed
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                        : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md'
                    }`}
                  >
                    {isSubscribed ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        {t('academy.active_membership')}
                      </>
                    ) : (
                      <>
                        {t('academy.sponsor_btn')}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Creator Call-To-Action (Bottom Banner) */}
        <div className="mt-20 bg-slate-900 text-white rounded-3xl p-6 sm:p-12 relative overflow-hidden border border-slate-800" id="patreon-cta-banner text-left">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-2xl text-left relative z-10">
            <h3 className="text-lg sm:text-2xl font-black uppercase tracking-tight font-display mb-3 text-left">
              {t('academy.p_cta_headline')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-semibold text-left">
              {t('academy.p_cta_desc')}
            </p>
            <div className="mt-6 flex flex-wrap gap-4 justify-start">
              <button
                onClick={onNavigateToDashboard}
                className="bg-[#0092ff] hover:bg-[#007cd7] text-white text-xs font-extrabold py-3 px-6 rounded-lg transition-all hover:scale-105 cursor-pointer shadow-md"
              >
                {t('academy.p_btn_dashboard')}
              </button>
              <button
                onClick={() => onNavigateToView('explore')}
                className="bg-transparent hover:bg-white/10 text-white border border-slate-700 text-xs font-extrabold py-3 px-6 rounded-lg transition-all cursor-pointer"
              >
                {t('academy.p_btn_explore')}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* RENDER DYNAMIC COURSE DETAILS MODAL */}
      <AnimatePresence>
        {selectedCourse && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-2xl border border-slate-100 overflow-hidden shadow-2xl relative"
            >
              <div className="p-6">
                {/* Visual header */}
                <div className="relative h-60 w-full rounded-2xl overflow-hidden bg-slate-100">
                  <img
                    src={selectedCourse.image}
                    alt={selectedCourse.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    onClick={() => setSelectedCourse(null)}
                    className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs text-white rounded-full hover:bg-slate-900 cursor-pointer text-sm font-extrabold z-30"
                    style={{ cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent flex items-end p-5 text-left">
                    <div>
                      <span className="bg-sky-500 text-white text-[9px] font-black tracking-widest px-2 py-0.5 rounded-sm uppercase">
                        {selectedCourse.category}
                      </span>
                      <h3 className="text-xl font-black text-white mt-2 leading-tight uppercase font-display">
                        {getTranslatedCourseTitle(selectedCourse.title, selectedCourse.id)}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Content details and buy triggers */}
                <div className="mt-6 text-left grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2">
                    <h4 className="text-[10px] font-black text-slate-400 tracking-widest uppercase">{t('academy.about_course')}</h4>
                    <p className="text-xs text-slate-600 mt-2 font-medium leading-relaxed">
                      {getTranslatedCourseDesc(selectedCourse.description, selectedCourse.id)}
                    </p>

                    <h4 className="text-[10px] font-black text-slate-400 tracking-widest uppercase mt-5">{t('academy.what_will_learn')}</h4>
                    <div className="mt-2.5 space-y-2">
                      {[
                        language === 'es' ? 'Detalles tácticos precisos, optimización de posturas y desplazamientos.' : language === 'pt' ? 'Detalhes táticos precisos, distribuição de peso e transições técnicas.' : language === 'fr' ? 'Détails tactiques de précision, distribution du poids et transitions.' : 'High frequency tactical drills & balance optimization mechanics.',
                        language === 'es' ? 'Protocolos de sumisión tradicionales y esquemas defensivos posicionales.' : language === 'pt' ? 'Sistemas de submissão tradicionais e controle de guarda.' : language === 'fr' ? 'Contrôle technique et défense active.' : 'Position dominance protocols and transition defenses.',
                        language === 'es' ? 'Preparación física adaptada y rutinas de recuperación de respiración.' : language === 'pt' ? 'Routines diárias de preparação respiratória e isométrica.' : language === 'fr' ? 'Exercices respiratoires et conditionnement athlétique.' : 'Daily isometric preparation and breath recovery routines.'
                      ].map((item, idx) => (
                        <div key={idx} className="flex gap-2 text-[11px] text-slate-600 font-bold">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 flex items-center gap-3 bg-slate-50 border border-slate-100 p-3 rounded-xl">
                      <img
                        src={selectedCourse.instructor.avatar}
                        alt={selectedCourse.instructor.name}
                        className="w-8 h-8 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="text-left">
                        <p className="text-xs font-black text-slate-800">{selectedCourse.instructor.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{selectedCourse.instructor.role}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">{t('academy.sub_status')}</h4>
                      
                      {purchasedCourseIds.includes(selectedCourse.id) || (selectedCourse.isSubscriptionOnly && (subscribedTierId === 'tier-purple' || subscribedTierId === 'tier-black')) ? (
                        <span className="text-emerald-600 font-black text-sm uppercase py-1 border-b border-emerald-100 block">
                          {language === 'es' ? 'Acceso Desbloqueado' : language === 'pt' ? 'Acesso Desbloqueado' : language === 'fr' ? 'Accès Débloqué' : 'Unlocked Access'}
                        </span>
                      ) : (
                        <span className="text-slate-700 font-black text-sm uppercase py-1 border-b border-slate-200 block">
                          {language === 'es' ? 'Acceso Bloqueado' : language === 'pt' ? 'Acesso Bloqueado' : language === 'fr' ? 'Accès Bloqué' : 'Locked Course'}
                        </span>
                      )}

                      <div className="mt-4 space-y-2.5">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-400 font-bold">
                            {language === 'es' ? 'Lecciones:' : language === 'pt' ? 'Aulas:' : language === 'fr' ? 'Cours :' : 'Lessons:'}
                          </span>
                          <span className="text-slate-700 font-black">{selectedCourse.lessonsCount} {language === 'es' ? 'capítulos' : language === 'pt' ? 'capítulos' : language === 'fr' ? 'chapitres' : 'chapters'}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-400 font-bold">
                            {language === 'es' ? 'Duración:' : language === 'pt' ? 'Duração:' : language === 'fr' ? 'Durée :' : 'Duration:'}
                          </span>
                          <span className="text-slate-700 font-black">{selectedCourse.durationHours} {language === 'es' ? 'horas' : language === 'pt' ? 'horas' : language === 'fr' ? 'heures' : 'hrs'}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-400 font-bold">
                            {language === 'es' ? 'Precio Unitario:' : language === 'pt' ? 'Preço Avulso:' : language === 'fr' ? 'Prix Seul :' : 'Standalone Price:'}
                          </span>
                          <span className="text-slate-700 font-black">${selectedCourse.price.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-200">
                      {purchasedCourseIds.includes(selectedCourse.id) || (selectedCourse.isSubscriptionOnly && (subscribedTierId === 'tier-purple' || subscribedTierId === 'tier-black')) ? (
                        <button
                          onClick={() => {
                            addNotification(`🎬 Playing lesson video: ${getTranslatedCourseTitle(selectedCourse.title, selectedCourse.id)}! (Simulation)`);
                            setSelectedCourse(null);
                          }}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <PlayCircle className="w-4 h-4" /> {t('academy.play_lesson')}
                        </button>
                      ) : (
                        <div className="space-y-2">
                          {!selectedCourse.isSubscriptionOnly && (
                            <button
                              onClick={() => handlePurchaseCourse(selectedCourse)}
                              className="w-full bg-[#0092ff] hover:bg-[#007cd7] text-white font-extrabold text-xs py-3 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                            >
                              {t('academy.standalone_buy')} (${selectedCourse.price.toFixed(2)})
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedCourse(null);
                              const element = document.getElementById('patreon-tiers-section');
                              if (element) {
                                element.scrollIntoView({ behavior: 'smooth' });
                              }
                            }}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-3 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Lock className="w-3.5 h-3.5" /> {t('academy.unlock_by_sub')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RENDER SUBSCRIPTION CONFIRMATION MODAL */}
      <AnimatePresence>
        {tierToSubscribe && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-md border border-slate-100 overflow-hidden shadow-2xl p-6 text-left"
            >
              <h3 className="text-xl font-black text-slate-900 leading-tight uppercase font-display">
                {t('modal.become_sponsor')}
              </h3>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                {t('modal.sponsor_p')}
              </p>

              <div className="mt-4 bg-slate-50 rounded-2xl border border-slate-100 p-4">
                <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">{t('modal.sub_selection')}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm font-black text-indigo-700">{tierToSubscribe.name}</span>
                  <span className="text-md font-black text-slate-800">${tierToSubscribe.priceMonthly.toFixed(2)}/mo</span>
                </div>
                <div className="mt-3 text-[11px] font-bold text-slate-500 leading-snug space-y-1">
                  <p>✓ {language === 'es' ? 'Acceso a tutoriales y videotecas' : language === 'pt' ? 'Acesso a tutoriais e videotecas' : language === 'fr' ? 'Accès aux cours et tutoriels' : 'All digital learning materials & video unlocks'}</p>
                  <p>✓ {language === 'es' ? 'Mensajería directa y soporte con el entrenador' : language === 'pt' ? 'Mensageiro direto para dúvidas com o professor' : language === 'fr' ? 'Support direct par messagerie avec l\'instructeur' : 'Direct messenger support channel with your dojo trainer'}</p>
                </div>
              </div>

              <div className="mt-5 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold">{t('modal.bal')}</span>
                  <span className="text-slate-700 font-black">${userBalance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold">{t('modal.cost')}</span>
                  <span className="text-rose-500 font-black">-${tierToSubscribe.priceMonthly.toFixed(2)}</span>
                </div>
                <div className="h-px bg-slate-100 my-2" />
                <div className="flex justify-between items-center text-xs font-black">
                  <span className="text-slate-700">{t('modal.remain')}</span>
                  <span className="text-emerald-600">${(userBalance - tierToSubscribe.priceMonthly).toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setTierToSubscribe(null)}
                  className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer"
                >
                  {t('modal.cancel')}
                </button>
                <button
                  onClick={() => handleSubscribeTier(tierToSubscribe)}
                  className="w-1/2 py-3 bg-[#ff424d] hover:bg-[#e03a44] text-white font-extrabold text-xs rounded-xl cursor-pointer shadow-md shadow-[#ff424d]/10"
                >
                  {t('modal.confirm')} (${tierToSubscribe.priceMonthly.toFixed(2)})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
