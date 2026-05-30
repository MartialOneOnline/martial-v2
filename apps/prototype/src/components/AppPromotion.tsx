/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Phone, Search, Bell, Map, ListFilter, Star, Grid } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

export default function AppPromotion() {
  const [mobileSearch, setMobileSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const { language } = useLanguage();

  const categories = ['All', 'Jiu-Jitsu', 'Karate', 'Boxing', 'Muay Thai'];

  const labels: Record<string, any> = {
    badge: { en: 'Sync Your Operations Anywhere', es: 'Sincroniza tus Operaciones en Cualquier Lugar', pt: 'Sincronize Suas Operações de Qualquer Lugar', fr: 'Synchronisez Vos Opérations N\'importe Où' },
    title_main: { en: 'An All-in-one App', es: 'Una Aplicación Todo en Uno', pt: 'Um Aplicativo Tudo em Um', fr: 'Une Application Tout-en-Un' },
    title_sub: { en: 'For Academy Owners', es: 'Para Dueños de Academias', pt: 'Para Donos de Academias', fr: 'Pour les Dirigeants de Clubs' },
    desc: {
      en: 'Martial App empowers academy owners with a simple user experience that frees up time for them to teach, retain current memberships, and find new students. Your pocket administrator is always synced with our real-time cloud database.',
      es: 'Martial App empodera a los dueños de academias con una experiencia de usuario simple que les libera tiempo para enseñar, retener alumnos y captar nuevos prospectos. Tu administrador de bolsillo está siempre sincronizado.',
      pt: 'O Martial App capacita proprietários de academias com uma experiência de usuário simples que libera tempo para focar nas aulas, reter alunos e atrair novas matrículas. Seu gestor de bolso está sempre sincronizado.',
      fr: 'Martial App donne aux dirigeants les outils pour simplifier la gestion quotidienne, les libérant pour enseigner, fidéliser et attirer de nouveaux élèves. Votre gestionnaire de poche est toujours synchronisé.'
    },
    search_placeholder: {
      en: 'Search academies...',
      es: 'Buscar dojos...',
      pt: 'Buscar dojos...',
      fr: 'Chercher clubs...'
    },
    explore_near: { en: 'Explore Near You', es: 'Explorar Cerca', pt: 'Explorar Perto', fr: 'Découvrir' },
    no_results: { en: 'No active dojos match.', es: 'Sin resultados de dojos.', pt: 'Sem resultados para dojos.', fr: 'Aucun dojo trouvé.' },
    home: { en: 'Home', es: 'Inicio', pt: 'Início', fr: 'Accueil' },
    map: { en: 'Map', es: 'Mapa', pt: 'Mapa', fr: 'Carte' },
    filter: { en: 'Filter', es: 'Filtro', pt: 'Filtrar', fr: 'Filtre' },
    categories_trans: {
      'All': { en: 'All', es: 'Todos', pt: 'Todos', fr: 'Tous' },
      'Jiu-Jitsu': { en: 'Jiu-Jitsu', es: 'Jiu-Jitsu', pt: 'Jiu-Jitsu', fr: 'Jiu-Jitsu' },
      'Karate': { en: 'Karate', es: 'Karate', pt: 'Caratê', fr: 'Karaté' },
      'Boxing': { en: 'Boxing', es: 'Boxeo', pt: 'Boxe', fr: 'Boxe' },
      'Muay Thai': { en: 'Muay Thai', es: 'Muay Thai', pt: 'Muay Thai', fr: 'Muay Thai' }
    },
    clubs: [
      { name: 'Apex Combat London', distance: { en: '1.2 miles away', es: 'A 1.8 km de ti', pt: 'A 1.8 km de distância', fr: 'À 1.8 km' }, arts: { en: 'Jiu-Jitsu / Boxing', es: 'Jiu-Jitsu / Boxeo', pt: 'Jiu-Jitsu / Boxe', fr: 'Jiu-Jitsu / Boxe' }, rating: '4.8' },
      { name: 'Red Dragon Kickboxing', distance: { en: '2.4 miles away', es: 'A 3.8 km de ti', pt: 'A 3.8 km de distância', fr: 'À 3.8 km' }, arts: { en: 'Muay Thai / TKD', es: 'Muay Thai / Taekwondo', pt: 'Muay Thai / TKD', fr: 'Muay Thai / TKD' }, rating: '4.7' },
      { name: 'Satori Arts Centre', distance: { en: '3.1 miles away', es: 'A 5.0 km de ti', pt: 'A 5.0 km de distância', fr: 'À 5.0 km' }, arts: { en: 'Aikido / Karate', es: 'Aikido / Karate', pt: 'Aikido / Caratê', fr: 'Aïkido / Karaté' }, rating: '4.9' }
    ],
    bullets: [
      {
        en: 'Track student progress to see who is up for stripe promotion.',
        es: 'Sigue el progreso de tus alumnos para ver quién está listo para graduarse.',
        pt: 'Acompanhe o progresso para saber quem está pronto para receber graus/faixas.',
        fr: 'Suivez la progression des élèves et préparez les passages de grades.'
      },
      {
        en: 'Find students who haven\'t come to train recently.',
        es: 'Identifica a los alumnos que han faltado a entrenar recientemente.',
        pt: 'Identifique alunos ausentes que precisam de incentivo de treino.',
        fr: 'Visualisez les élèves absents ces derniers temps.'
      },
      {
        en: 'Set classed schedules and events.',
        es: 'Programa tus horarios, clases presenciales y seminarios.',
        pt: 'Defina escalas de horários, treinos e eventos especiais.',
        fr: 'Gérez le planning de cours et les stages.'
      },
      {
        en: 'Organize teams for tournaments.',
        es: 'Gestiona la inscripción de tus equipos a torneos deportivos.',
        pt: 'Organize equipes e atletas de torneios marciais.',
        fr: 'Organisez les compétitions et les athlètes.'
      },
      {
        en: 'Resolve any billing issues.',
        es: 'Resuelve incidencias de facturación al instante.',
        pt: 'Gerencie faturas pendentes de forma simples e segura.',
        fr: 'Gérez et résolvez les incidents de paiement.'
      },
      {
        en: 'Bill membership fees.',
        es: 'Cobra membrecías mensuales recurrentes automáticamente.',
        pt: 'Faça cobrança recorrente automatizada para inscrições.',
        fr: 'Facturez les abonnements récurrents.'
      }
    ]
  };

  const getTranslatedCategory = (cat: string) => {
    return labels.categories_trans[cat]?.[language] || labels.categories_trans[cat]?.['en'] || cat;
  };

  const filteredClubs = labels.clubs.filter((club: any) => {
    const nameStr = club.name.toLowerCase();
    const artsStr = club.arts[language]?.toLowerCase() || club.arts['en'].toLowerCase();
    const matchSearch = nameStr.includes(mobileSearch.toLowerCase()) || artsStr.includes(mobileSearch.toLowerCase());
    if (activeCategory === 'All') return matchSearch;
    return matchSearch && artsStr.includes(activeCategory.toLowerCase());
  });

  return (
    <section className="bg-white py-20 relative overflow-hidden text-left" id="app-promo-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center" id="app-promo-grid">
          
          {/* Left Column: Descriptions & Checklist */}
          <div className="lg:col-span-6 space-y-8 text-left animate-fade-in" id="app-promo-text-container">
            <div>
              <span className="text-xs font-black text-[#0092ff] uppercase tracking-widest block mb-2">
                {labels.badge[language] || labels.badge['en']}
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
                {labels.title_main[language] || labels.title_main['en']} <br />
                <span className="text-sky-500">
                  {labels.title_sub[language] || labels.title_sub['en']}
                </span>
              </h2>
            </div>

            <p className="text-slate-600 text-[14px] leading-relaxed font-semibold">
              {labels.desc[language] || labels.desc['en']}
            </p>

            {/* Bullets grid */}
            <div className="grid sm:grid-cols-2 gap-4" id="app-promo-bullets">
              {labels.bullets.map((bulletObj: any, idx: number) => (
                <div key={idx} className="flex gap-3 items-start group">
                  <div className="flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-5 h-5 text-sky-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="text-slate-600 text-xs font-bold leading-relaxed text-left">
                    {bulletObj[language] || bulletObj['en']}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Premium Smartphone App simulation */}
          <div className="lg:col-span-6 flex justify-center" id="phone-simulation-column">
            
            {/* Hard shell Phone chassis matching the look of the smartphone mockup inside design */}
            <div className="relative w-[300px] h-[580px] bg-slate-950 rounded-[40px] border-[8px] border-slate-900 shadow-2xl p-3 flex flex-col overflow-hidden" id="phone-chassis">
              
              {/* Speaker & camera notch at top */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-5 bg-slate-950 rounded-b-xl z-20 flex justify-center gap-1.5 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                <span className="w-10 h-1 bg-slate-900 rounded-full" />
                <span className="text-[7.5px] font-bold text-slate-500 font-mono">12:00</span>
              </div>

              {/* Status information space */}
              <div className="h-6 flex items-center justify-between text-[8px] text-slate-400 px-3 z-10 font-bold font-mono pt-1">
                <span>Signal ••••</span>
                <span>Martial App</span>
              </div>

              {/* Interactive Phone Body viewport */}
              <div className="flex-1 bg-slate-900 rounded-[30px] overflow-hidden flex flex-col p-3 relative text-white" id="phone-screen">
                
                {/* Simulated App Header */}
                <div className="flex items-center justify-between pb-3 mt-1 pt-2">
                  <div className="flex items-center gap-1.5 font-display">
                    <div className="w-5 h-5 rounded-md bg-[#0092ff] flex items-center justify-center font-black text-[9px] text-white">
                      M
                    </div>
                    <span className="text-[10px] font-extrabold tracking-wider text-slate-200">MARTIAL</span>
                  </div>
                  <Bell className="w-3.5 h-3.5 text-slate-400 hover:text-white cursor-pointer" />
                </div>

                {/* Simulated Search bar */}
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-2 w-3 h-3 text-slate-500" />
                  <input
                    type="text"
                    value={mobileSearch}
                    onChange={(e) => setMobileSearch(e.target.value)}
                    placeholder={labels.search_placeholder[language] || labels.search_placeholder['en']}
                    className="w-full bg-slate-800/80 border border-slate-700/50 rounded-lg pl-8 pr-3 py-1 text-[10px] focus:outline-none focus:border-[#0092ff]"
                  />
                </div>

                {/* Simulated Category Pill List inside App */}
                <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-3">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-2.5 py-1 text-[8px] font-black rounded-full whitespace-nowrap cursor-pointer transition-all ${
                        activeCategory === cat ? 'bg-[#0092ff] text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {getTranslatedCategory(cat)}
                    </button>
                  ))}
                </div>

                {/* Subtitle Inside Screen */}
                <p className="text-[10px] font-extrabold text-slate-400 mb-2 uppercase tracking-wider text-left">
                  {labels.explore_near[language] || labels.explore_near['en']}
                </p>

                {/* Active Dynamic items */}
                <div className="space-y-1.5 overflow-y-auto max-h-[220px] scrollbar-none flex-1 text-left">
                  <AnimatePresence mode="popLayout">
                    {filteredClubs.length > 0 ? (
                      filteredClubs.map((club: any) => (
                        <motion.div
                          key={club.name}
                          layout
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 5 }}
                          transition={{ duration: 0.15 }}
                          className="p-2 bg-slate-800/50 border border-slate-700/60 rounded-xl flex items-center justify-between"
                        >
                          <div className="text-left">
                            <p className="text-[10px] font-black text-slate-200 leading-tight">{club.name}</p>
                            <span className="text-[8px] text-slate-400 mt-0.5 block">
                              {club.arts[language] || club.arts['en']}
                            </span>
                            <span className="text-[7.5px] text-[#0092ff] font-medium block mt-0.5">
                              {club.distance[language] || club.distance['en']}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5 bg-slate-900 px-1.5 py-0.5 rounded-md flex-shrink-0">
                            <Star className="w-2 h-2 text-amber-400 fill-amber-400" />
                            <span className="text-[8px] font-black">{club.rating}</span>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <p className="text-[9px] text-slate-500 py-6 text-center font-semibold">
                        {labels.no_results[language] || labels.no_results['en']}
                      </p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Mock Phone App Bottom Bar */}
                <div className="mt-auto border-t border-slate-800 pt-2 flex justify-around text-slate-500 text-[8px] font-black">
                  <div className="flex flex-col items-center gap-0.5 text-[#0092ff] hover:text-[#0092ff] cursor-pointer">
                    <Grid className="w-3.5 h-3.5" />
                    <span>{labels.home[language] || labels.home['en']}</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 hover:text-slate-200 cursor-pointer">
                    <Map className="w-3.5 h-3.5" />
                    <span>{labels.map[language] || labels.map['en']}</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 hover:text-slate-200 cursor-pointer">
                    <ListFilter className="w-3.5 h-3.5" />
                    <span>{labels.filter[language] || labels.filter['en']}</span>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
