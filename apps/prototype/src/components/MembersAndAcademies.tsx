/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Megaphone, 
  Gauge, 
  MessageSquare, 
  Calendar, 
  MapPin, 
  Receipt, 
  Music4, 
  User, 
  X, 
  Plus, 
  ChevronRight, 
  Tv, 
  Activity, 
  Award, 
  UsersRound,
  ShieldCheck
} from 'lucide-react';
import { FOR_MEMBERS_FEATURES, FOR_ACADEMIES_FEATURES } from '../types';
import { useLanguage } from '../LanguageContext';

export default function MembersAndAcademies() {
  const [activeModal, setActiveModal] = useState<'members' | 'academies' | null>(null);
  const { t, language } = useLanguage();

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Megaphone': return <Megaphone className="w-5 h-5" />;
      case 'Gauge': return <Gauge className="w-5 h-5" />;
      case 'MessageSquareChannel': return <MessageSquare className="w-5 h-5" />;
      case 'CalendarDays': return <Calendar className="w-5 h-5" />;
      case 'MapPin': return <MapPin className="w-5 h-5" />;
      case 'Receipt': return <Receipt className="w-5 h-5" />;
      case 'Music4': return <Music4 className="w-5 h-5" />;
      default: return <Plus className="w-5 h-5" />;
    }
  };

  const localTranslation: Record<string, any> = {
    for_members: { en: 'For Members', es: 'Para Alumnos', pt: 'Para Alunos', fr: 'Pour les Membres' },
    for_academies: { en: 'For Academies', es: 'Para Academias', pt: 'Para Academias', fr: 'Pour les Clubs' },
    extra_btn: { en: '+ Many other great features!', es: '¡Muchas otras funciones excelentes!', pt: 'Muitos outros recursos excelentes!', fr: '+ De nombreuses autres fonctions !' },
    modal_m_title: { en: '🌟 Student Club Extras', es: '🌟 Extras del Club de Alumnos', pt: '🌟 Extras do Clube de Alunos', fr: '🌟 Extras du Club Élèves' },
    modal_a_title: { en: '🚀 Premium Academy Tools', es: '🚀 Herramientas de Academia Premium', pt: '🚀 Ferramentas de Academia Premium', fr: '🚀 Outils de Club Premium' },
    modal_sub: { en: 'Designed to automate and organize combat sports businesses worldwide.', es: 'Diseñado para automatizar y organizar negocios de deportes de combate en todo el mundo.', pt: 'Projetado para automatizar e organizar negócios de esportes de combate no mundo inteiro.', fr: 'Conçu pour automatiser et organiser les clubs de sports de combat dans le monde.' },
    understand: { en: 'I Understand', es: 'Entendido', pt: 'Entendido', fr: 'Compris' },
    features_list: {
      'Send promotional messages to customers & members of your club': {
        en: 'Send promotional messages to customers & members of your club',
        es: 'Envía mensajes promocionales a clientes y miembros de tu club',
        pt: 'Envie mensagens promocionais aos clientes e membros do seu clube',
        fr: 'Envoyez des messages promotionnels aux clients et membres de votre club'
      },
      'Tracking member progress & attendance': {
        en: 'Tracking member progress & attendance',
        es: 'Seguimiento del progreso y asistencia de tus miembros',
        pt: 'Acompanhamento do progresso e frequência dos alunos',
        fr: 'Suivi de progression et d\'assiduité de vos membres'
      },
      'Communicate directly with members': {
        en: 'Communicate directly with members',
        es: 'Comunícate directamente con tus miembros',
        pt: 'Comunicação direta com seus alunos',
        fr: 'Communiquez directement avec les membres'
      },
      'Set classed schedules and events': {
        en: 'Set classed schedules and events',
        es: 'Programa clases, horarios y eventos especiales',
        pt: 'Agende aulas, horários e eventos especiais',
        fr: 'Planifiez des cours et des événements'
      },
      'Show addressed & directions': {
        en: 'Show addressed & directions',
        es: 'Muestra tu dirección y cómo llegar al club',
        pt: 'Mostre seu endereço e rotas para seu clube',
        fr: 'Affichez l\'adresse et les directions du club'
      },
      'Bill membership fees.': {
        en: 'Bill membership fees.',
        es: 'Cobro de tarifas de membresía en piloto automático',
        pt: 'Cobrança automatizada de mensalidades de alunos',
        fr: 'Facturez les frais d\'adhésion en toute sécurité'
      },
      'Links to news, music podcast, & other.': {
        en: 'Links to news, music podcast, & other.',
        es: 'Enlaces a noticias, música, podcast y más.',
        pt: 'Links para notícias, podcasts, música e outros.',
        fr: 'Liens vers des actualités, podcasts musicaux et autres.'
      }
    },
    extra_members: [
      {
        title: { en: 'Interactive Belt Promotion Log', es: 'Registro Interactivo de Graduaciones', pt: 'Registro de Graduações', fr: 'Suivi de Promotion des Grades' },
        desc: { en: 'Track your visual timeline of karate, jiu-jitsu or taekwondo gradings achieve.', es: 'Sigue tu línea de tiempo visual de tus grados en karate, jiu-jitsu o taekwondo.', pt: 'Siga sua linha de tempo visual de graus no jiu-jitsu, caratê ou taekwondo.', fr: 'Suivez la chronologie visuelle de vos ceintures de karaté, jiu-jitsu ou taekwondo.' }
      },
      {
        title: { en: 'Digital Syllabus Books', es: 'Libros de Temario Digitales', pt: 'Livros de Temário Digitais', fr: 'Cahiers Techniques Digitaux' },
        desc: { en: 'Read curriculum guides, grading techniques, and martial lore uploaded by instructors.', es: 'Lee guías de estudio, técnicas de examen y doctrina martial subidas por instructores.', pt: 'Leia guias de estudo, técnicas de exame e história marcial enviadas por instrutores.', fr: 'Consultez les programmes, techniques de passage et philosophie transmis par vos professeurs.' }
      },
      {
        title: { en: 'Family Sync Accounts', es: 'Cuentas Familiares Sincronizadas', pt: 'Contas de Família Sincronizadas', fr: 'Comptes Famille Synchronisés' },
        desc: { en: 'Manage martial schedules and training plans for multiple kids in one simple profile.', es: 'Gestiona horarios y planes de entrenamiento para múltiples hijos en un perfil único.', pt: 'Gerencie horários e treinos de vários filhos em uma única conta compartilhada.', fr: 'Gérez le planning et les entraînements de plusieurs enfants avec un profil groupé.' }
      },
      {
        title: { en: 'Video Technique Library', es: 'Videoteca de Técnicas', pt: 'Acervo de Técnicas em Vídeo', fr: 'Vidéothèque de Techniques' },
        desc: { en: 'Review instructional sparring footage, martial katas, and self-defense videos.', es: 'Revisa videos de combates reales, katas y técnicas de defensa personal.', pt: 'Revise vídeos de treinos, katas e técnicas de defesa pessoal para aperfeiçoamento.', fr: 'Revoyez les combats commentés, katas martiaux et tutoriels de self-defense.' }
      }
    ],
    extra_academies: [
      {
        title: { en: 'POS Inventory Shop', es: 'Tienda e Inventario POS', pt: 'Loja e Inventário de Produtos', fr: 'Boutique POS et Inventaire' },
        desc: { en: 'Sell custom academy gi, t-shirts, martial gear, and energy supplements.', es: 'Vende kimonos, camisetas, equipamiento y suplementos con pago rápido.', pt: 'Venda quimonos, camisetas, equipamentos e suplementos com código de barras rápido.', fr: 'Vendez des gants, kimonos, t-shirts du club et compléments avec lecture rapide.' }
      },
      {
        title: { en: 'Automated Check-in Kiosk', es: 'Quiosco de Entrada Automatizado', pt: 'Totem de Entrada Automatizado', fr: 'Kiosque d\'Entrée Automatisé' },
        desc: { en: 'Place a tablet at gym reception for instant student entry scanning via barcode or pin.', es: 'Coloca una tablet en recepción para registrar entradas mediante código de barras o pin.', pt: 'Use um tablet na recepção para registro automático de entrada do aluno por código ou pin.', fr: 'Installez une tablette à l\'accueil pour scanner l\'entrée de vos élèves par code ou pin.' }
      },
      {
        title: { en: 'Payroll & Trainer Shares', es: 'Nómina y Comisiones de Entrenadores', pt: 'Comissões para Professores', fr: 'Comissions et Paie des Coachs' },
        desc: { en: 'Calculate automated salary commissions for custom coach slots based on total attendees.', es: 'Calcula comisiones mensuales automatizadas por clase según el número de asistentes.', pt: 'Calcule comissões mensais automatizadas de instrutores conforme a presença nas aulas.', fr: 'Calculez automatiquement les commissions des coachs basées sur le taux de présence.' }
      },
      {
        title: { en: 'Marketing Lead Funnels', es: 'Embudos de Captación de Leads', pt: 'Funis de Captação de Alunos', fr: 'Funnels d\'Acquisition Prospects' },
        desc: { en: 'Capture web enquiries, offer free trials, and send follow-up emails to new prospects.', es: 'Captura consultas web, ofrece pases libres de prueba y envía correos de seguimiento.', pt: 'Capture consultas do site, ofereça treinos experimentais e envie e-mails automáticos.', fr: 'Récupérez les demandes web, offrez des essais gratuits et relancez les prospects.' }
      }
    ]
  };

  const getTranslatedFeature = (title: string) => {
    return localTranslation.features_list[title]?.[language] || localTranslation.features_list[title]?.['en'] || title;
  };

  const getExtraFeatures = (modal: 'members' | 'academies') => {
    const list = modal === 'members' ? localTranslation.extra_members : localTranslation.extra_academies;
    return list.map((item: any) => ({
      title: item.title[language] || item.title['en'],
      desc: item.desc[language] || item.desc['en']
    }));
  };

  return (
    <section className="bg-slate-950 py-20 relative overflow-hidden" id="academies">
      {/* Background Ambient Accents */}
      <div className="absolute top-1/4 left-1/4 -z-0 w-[400px] h-[400px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 -z-0 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Main Columns Grid matching Design */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-16" id="two-column-features-grid">
          
          {/* Column 1: For Members */}
          <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl p-6 sm:p-10 border border-slate-800 flex flex-col h-full text-slate-100 shadow-xl relative" id="members-feature-card">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-10 h-10 bg-[#0092ff]/10 rounded-xl flex items-center justify-center text-sky-400">
                <UsersRound className="w-6 h-6" />
              </span>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight font-display">
                {localTranslation.for_members[language] || localTranslation.for_members['en']}
              </h3>
            </div>

            <div className="space-y-4 flex-1">
              {FOR_MEMBERS_FEATURES.map((feature, i) => (
                <div key={i} className="flex gap-4 items-start p-2 rounded-xl hover:bg-slate-800/30 transition-colors">
                  <div className="mt-0.5 text-cyan-400 flex-shrink-0">
                    {getIcon(feature.icon)}
                  </div>
                  <p className="text-slate-300 text-sm font-semibold leading-relaxed text-left">
                    {getTranslatedFeature(feature.title)}
                  </p>
                </div>
              ))}
            </div>

            {/* Interactive "Many other features" Button */}
            <div className="mt-8 pt-6 border-t border-slate-800">
              <button
                onClick={() => setActiveModal('members')}
                className="text-sky-400 text-sm font-bold flex items-center gap-1.5 hover:text-sky-300 transition-colors cursor-pointer focus:outline-none"
                id="members-extra-btn"
              >
                {localTranslation.extra_btn[language] || localTranslation.extra_btn['en']}
                <ChevronRight className="w-4 h-4 animate-pulse" />
              </button>
            </div>
          </div>

          {/* Column 2: For Academies */}
          <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl p-6 sm:p-10 border border-slate-800 flex flex-col h-full text-slate-100 shadow-xl" id="academies-feature-card">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-10 h-10 bg-cyan-400/10 rounded-xl flex items-center justify-center text-cyan-400">
                <ShieldCheck className="w-6 h-6" />
              </span>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight font-display">
                {localTranslation.for_academies[language] || localTranslation.for_academies['en']}
              </h3>
            </div>

            <div className="space-y-4 flex-1">
              {FOR_ACADEMIES_FEATURES.map((feature, i) => (
                <div key={i} className="flex gap-4 items-start p-2 rounded-xl hover:bg-slate-800/30 transition-colors">
                  <div className="mt-0.5 text-cyan-400 flex-shrink-0">
                    {getIcon(feature.icon)}
                  </div>
                  <p className="text-slate-300 text-sm font-semibold leading-relaxed text-left">
                    {getTranslatedFeature(feature.title)}
                  </p>
                </div>
              ))}
            </div>

            {/* Interactive "Many other features" Button */}
            <div className="mt-8 pt-6 border-t border-slate-800">
              <button
                onClick={() => setActiveModal('academies')}
                className="text-sky-400 text-sm font-bold flex items-center gap-1.5 hover:text-sky-300 transition-colors cursor-pointer focus:outline-none"
                id="academies-extra-btn"
              >
                {localTranslation.extra_btn[language] || localTranslation.extra_btn['en']}
                <ChevronRight className="w-4 h-4 animate-pulse" />
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Details Modal overlay for other features */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs" id="features-modal-overlay">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full text-white shadow-2xl relative"
              id="features-modal-content"
            >
              <button 
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-lg cursor-pointer"
                id="close-modal-btn"
              >
                <X className="w-5 h-5" />
              </button>

              <h4 className="text-xl font-black mb-1 font-display flex items-center gap-2">
                {activeModal === 'members' 
                  ? (localTranslation.modal_m_title[language] || localTranslation.modal_m_title['en'])
                  : (localTranslation.modal_a_title[language] || localTranslation.modal_a_title['en'])}
              </h4>
              <p className="text-xs text-slate-400 mb-6 font-semibold">
                {localTranslation.modal_sub[language] || localTranslation.modal_sub['en']}
              </p>

              <div className="space-y-4" id="modal-features-list">
                {getExtraFeatures(activeModal).map((feat: any, i: number) => (
                  <div key={i} className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-2xl flex gap-3.5 text-left">
                    <span className="w-8 h-8 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-400 text-xs font-black flex-shrink-0">
                      {i + 1}
                    </span>
                    <div>
                      <h5 className="font-bold text-sm text-slate-200">{feat.title}</h5>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed font-semibold">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-6 py-2.5 bg-[#0092ff] text-white text-xs font-black rounded-xl hover:bg-sky-500 cursor-pointer"
                >
                  {localTranslation.understand[language] || localTranslation.understand['en']}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
