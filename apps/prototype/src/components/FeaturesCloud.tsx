/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, User, CreditCard, Calendar, BarChart3, ChevronRight, Laptop, Sparkles, QrCode, Bot } from 'lucide-react';
import { APP_FEATURES_TICKS } from '../types';
import { useLanguage } from '../LanguageContext';

export default function FeaturesCloud() {
  const [activeTab, setActiveTab] = useState<'leads_campaigns' | 'ai_hub' | 'qr_checkin' | 'students' | 'payments'>('leads_campaigns');
  const [aiPrompt, setAiPrompt] = useState<'drill' | 'retention' | 'grading'>('drill');
  const [qrLogs, setQrLogs] = useState<Array<{ name: string; time: string; action: string }>>([
    { name: 'Adam Smith', time: '10:15 AM', action: 'Approved (Blue Belt)' },
    { name: 'Daniel Craig', time: '10:08 AM', action: 'Approved (Black Belt)' },
  ]);
  
  const { t, language } = useLanguage();

  const handleScanQr = () => {
    const names = ['Chloe Vance', 'Beatrix Kiddo', 'Marcus Aurel', 'Bruce Lee', 'Sarah Kowal', 'David Jenkins'];
    const ranks = ['Green Belt', 'Yellow Belt', 'Black Belt', 'Red Belt', 'White Belt', 'Brown Belt'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomRank = ranks[Math.floor(Math.random() * ranks.length)];
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setQrLogs((prev) => [
      { name: randomName, time: timeStr, action: `Approved (${randomRank})` },
      ...prev.slice(0, 3)
    ]);
  };

  const mockLeads = [
    { name: 'Marcus Evans', campaign: 'Free Trial Campaign', status: 'Trial Booked', date: 'May 29', channel: 'Instagram Ads' },
    { name: 'Sophia Loren', campaign: 'Summer Special Offer', status: 'Contacted', date: 'May 28', channel: 'Facebook Form' },
    { name: 'David Smith', campaign: 'Open Doors Event', status: 'Converted Member', date: 'May 27', channel: 'Organic Web' },
    { name: 'Sarah Connor', campaign: 'Free Trial Campaign', status: 'Follow-up Sent', date: 'May 28', channel: 'WhatsApp Bot' },
  ];

  const mockLabels: Record<string, any> = {
    enterprise: { 
      en: 'Bringing technology to Martial Arts', 
      es: 'Llevando la tecnología a las Artes Marciales', 
      pt: 'Trazendo tecnologia para as Artes Marciais', 
      fr: 'Apporter la technologie aux Arts Martiaux' 
    },
    sol_title: { 
      en: 'Innovative Management Software for Martial Arts Academies and Business & Users interaction Worldwide.', 
      es: 'Software de gestión innovador para academias de artes marciales e interacción mundial de empresas y usuarios.', 
      pt: 'Software de gestão inovador para academias de artes marciais e interação global de empresas e praticantes.', 
      fr: 'Logiciel de gestion innovant pour les académies d\'arts martiaux et l\'interaction des entreprises & utilisateurs dans le monde.' 
    },
    desc_side: { 
      en: 'Empowering combat gym owners with modern billing APIs, contactless QR access control, and smart AI assistance for lesson planning & member retention.', 
      es: 'Empoderando a dueños de gimnasios de combate con APIs de pago, control de acceso QR sin contacto y asistencia de IA inteligente para planificación de clases.', 
      pt: 'Capacitando donos de academias de combate com faturamento online, controle de acesso QR e inteligência artificial para treinos e retenção.', 
      fr: 'Donnez aux gérants de dojo des outils de paiement, un contrôle d\'accès par QR code et une assistance IA pour planifier vos cours.' 
    },
    leads_campaigns: { en: 'Leads & Campaigns', es: 'Prospectos y Campañas', pt: 'Leads e Campanhas', fr: 'Prospects & Campagnes' },
    students: { en: 'Students', es: 'Alumnos', pt: 'Alunos', fr: 'Élèves' },
    payments: { en: 'Payments', es: 'Pagos', pt: 'Pagamento', fr: 'Paiements' },
    qr_checkin: { en: 'QR Code Check-ins', es: 'Registros QR', pt: 'Check-ins QR', fr: 'Scans QR' },
    ai_hub: { en: 'AI Tools', es: 'Asistente IA', pt: 'Assistência IA', fr: 'Assistant IA' },
    members_list: { en: 'Active Members List', es: 'Lista de Miembros Activos', pt: 'Lista de Alunos Ativos', fr: 'Membres Actifs' },
    active_now: { en: '4 Active Now', es: '4 Activos Ahora', pt: '4 Ativos Agora', fr: '4 Actifs' },
    recent_tx: { en: 'Recent Transactions', es: 'Transacciones Recientes', pt: 'Transações Recientes', fr: 'Transactions Récentes' },
    stripe_active: { en: 'Stripe Active', es: 'Stripe Activo', pt: 'Stripe Ativo', fr: 'Stripe Actif' },
    today_classes: { en: 'Today Classes', es: 'Clases de Hoy', pt: 'Aulas de Hoje', fr: 'Cours d\'Aujourd\'hui' },
    systems_ok: { en: 'System Operational', es: 'Sistema Operacional', pt: 'Sistema Ativo', fr: 'Système Opérationnel' },
    start_free: { en: 'Start a FREE Account', es: 'Crear una Cuenta Gratis', pt: 'Criar Conta Grátis', fr: 'Créer un Compte Gratuit' },
    ranks: {
      'Blue Belt': { en: 'Blue Belt', es: 'Cinturón Azul', pt: 'Faixa Azul', fr: 'Ceinture Bleue' },
      'Green Belt': { en: 'Green Belt', es: 'Cinturón Verde', pt: 'Faixa Verde', fr: 'Ceinture Verte' },
      'Black Belt': { en: 'Black Belt', es: 'Cinturón Negro', pt: 'Faixa Preta', fr: 'Ceinture Noire' },
      'Yellow Belt': { en: 'Yellow Belt', es: 'Cinturón Amarillo', pt: 'Faixa Amarela', fr: 'Ceinture Jaune' }
    },
    last_seen: {
      'Today': { en: 'Today', es: 'Hoy', pt: 'Hoje', fr: 'Aujourd\'hui' },
      '2 days ago': { en: '2 days ago', es: 'Hace 2 días', pt: 'Há 2 dias', fr: 'Il y a 2 jours' },
      '1 hour ago': { en: '1 hour ago', es: 'Hace 1 hora', pt: 'Há 1 hora', fr: 'Il y a 1 heure' }
    },
    classes_lbl: {
      'Kids Taekwondo Basic': { en: 'Kids Taekwondo Basic', es: 'Taekwondo Infantil Básico', pt: 'Taekwondo Infantil Básico', fr: 'Taekwondo Enfants Base' },
      'Adults BJJ Sparring': { en: 'Adults BJJ Sparring', es: 'BJJ Adultos Sparring', pt: 'BJJ Adultos Treino', fr: 'JJB Adultes Combat' },
      'Muay Thai Kickboxing': { en: 'Muay Thai Kickboxing', es: 'Kickboxing Muay Thai', pt: 'Muay Thai Kickboxing', fr: 'Kickboxing Muay Thai' }
    },
    teacher: { en: 'Teacher', es: 'Profesor', pt: 'Instrutor', fr: 'Guide' },
    check_ins: { en: 'Check-ins', es: 'Registros', pt: 'Presenças', fr: 'Inscrits' }
  };

  const aiResponses = {
    drill: {
      en: "🤖 AI Assistant: Suggested warm-ups & situational drills. Standardize on active Guard Retention warm-ups: 10 minutes of hip escapes & triangle drills, followed by 3 rounds of situational sparring with sweep goals.",
      es: "🤖 Asistente de IA: Calentamientos sugeridos y ejercicios situacionales. Ejercicios activos de retención de guardia: 10 minutos de escapes de cadera y ejercicios de triángulo, seguidos de 3 rondas de sparring situacional.",
      pt: "🤖 Assistente de IA: Aquecimentos e treinos situacionais sugeridos. Treino focado em reposição de guarda ativa: 10 minutos de saídas de quadril e drills de triângulo, seguidos por 3 rounds de rola situacional.",
      fr: "🤖 Assistant IA : Échauffements et drills recommandés. Échauffez-vous pendant 10 minutes avec sorties de hanches et drills de triangle, suivis de 3 rounds de combat à thèmes axés sur le renversement."
    },
    retention: {
      en: "🤖 AI Retention: Detected 2 students with low attendance (absent 10+ days). Automated recovery email drafted for Daniel Craig: 'Hey Daniel, we missed you on the mats! Click here to review our latest class recordings.'",
      es: "🤖 Retención IA: Detectados 2 alumnos con baja asistencia (10+ días ausentes). E-mail de reactivación redactado para Daniel Craig: '¡Hola Daniel, te extrañamos en el tatami! Clic aquí para revisar las últimas clases.'",
      pt: "🤖 Retenção IA: Identificados 2 planos inativos por mais de 10 dias. E-mail automático rascunhado para Daniel Craig: 'Sentimos sua falta nos treinos Daniel! Clique aqui para ver as novas aulas online.'",
      fr: "🤖 Rétention IA : Détecté 2 membres absents depuis plus de 10 jours. E-mail de relance automatique rédigé pour Daniel Craig : 'Bonjour Daniel, tu nous manques sur le tatami ! Visionnez nos derniers cours en un clic.'"
    },
    grading: {
      en: "🤖 AI Grading Planner: Suggested belt grading syllabus. For the upcoming Green Belt test: Validate Back-Control escapes, Double-leg takedown defense posture, and structural personal self-defense defense standing block.",
      es: "🤖 Plan de Examen IA: Programa sugerido de examen. Para el cinturón verde: Verifica salidas de control de espalda, defensas sobre derribos de dos piernas y técnicas estructurales de defensa personal de pie.",
      pt: "🤖 Exame por IA: Grade sugerida de avaliação. Para a mudança de Faixa Verde: Avalie saídas de controle de costas, postura de defesa de queda baianada e base estruturada de defesa pessoal em pé.",
      fr: "🤖 Plan de Grades IA : Évaluation de grade recommandée. Pour l'examen Ceinture Verte : Évaluez les sorties de contrôle arrière, la posture défensive sur double-leg et le bloc de self-défense debout."
    }
  };

  const mockStudents = [
    { name: 'Adam Smith', rank: 'Blue Belt', attendance: '92%', lastSeen: 'Today' },
    { name: 'Chloe Vance', rank: 'Green Belt', attendance: '88%', lastSeen: '2 days ago' },
    { name: 'Daniel Craig', rank: 'Black Belt', attendance: '98%', lastSeen: 'Today' },
    { name: 'Beatrix Kiddo', rank: 'Yellow Belt', attendance: '100%', lastSeen: '1 hour ago' },
  ];

  const mockPayments = [
    { id: '#1025', name: 'Adam Smith', amount: '£45.00', status: 'Succeeded', date: 'May 28' },
    { id: '#1024', name: 'Chloe Vance', amount: '£45.00', status: 'Succeeded', date: 'May 27' },
    { id: '#1023', name: 'Beatrix Kiddo', amount: '£60.00', status: 'Pending', date: 'May 28' },
    { id: '#1022', name: 'Marcus Aurel', amount: '£120.00', status: 'Succeeded', date: 'May 25' },
  ];

  const getRank = (r: string) => {
    return mockLabels.ranks[r]?.[language] || mockLabels.ranks[r]?.['en'] || r;
  };

  const getLastSeen = (ls: string) => {
    return mockLabels.last_seen[ls]?.[language] || mockLabels.last_seen[ls]?.['en'] || ls;
  };

  return (
    <section className="bg-slate-50 py-20 border-y border-gray-100" id="technology">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-4xl mx-auto mb-16" id="features-heading-area">
          <p className="text-sm font-black text-[#0092ff] uppercase tracking-widest mb-3">
            {mockLabels.enterprise[language] || mockLabels.enterprise['en']}
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-4.5xl font-extrabold text-slate-900 leading-tight">
            Innovative Management Software for <br className="hidden sm:inline" />
            <span className="text-[#0092ff]">Martial Arts Academies & Businesses</span>
          </h2>
          <p className="text-sm font-semibold text-slate-500 mt-3 max-w-2xl mx-auto">
            Bringing high technology to martial arts. Speed up class admittance, automate grading syllabus, and enhance user & gym interactions worldwide.
          </p>
        </div>

        {/* Core Layout: Side label + Main Columns */}
        <div className="grid lg:grid-cols-12 gap-12 items-start" id="features-main-grid">
          
          {/* Left label description / side bar */}
          <div className="lg:col-span-3 flex lg:flex-col lg:space-y-4 border-l-2 border-sky-400 pl-6 py-2" id="sidebar-label">
            <h3 className="text-base font-black text-slate-850 leading-snug uppercase tracking-tight font-display">
              {mockLabels.sol_title[language] || mockLabels.sol_title['en']}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold mt-2">
              {mockLabels.desc_side[language] || mockLabels.desc_side['en']}
            </p>
          </div>

          {/* Center Interactive App Mockup Component (tablet mockup) */}
          <div className="lg:col-span-6" id="dashboard-mockup-frame">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in" id="mockup-container">
              
              {/* Browser bar */}
              <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-400 block" />
                  <span className="w-3 h-3 rounded-full bg-amber-400 block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-400 block" />
                </div>
                <div className="text-slate-500 text-[9px] font-mono bg-white px-4 py-1 rounded-md border border-slate-200 w-[60%] text-center truncate">
                  martialapp.com/dashboard/apex-dojo-ai
                </div>
                <div className="flex gap-1.5 text-slate-400">
                  <Laptop className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Mockup App Workspace layout */}
              <div className="flex flex-col min-h-[445px] bg-white text-slate-800">
                
                {/* Active Sub Header bar */}
                <div className="bg-slate-50 border-b border-slate-200/60 p-4 flex flex-col lg:flex-row items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#0092ff] animate-pulse" />
                    <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest font-display">APEX COGNITIVE HUB</span>
                  </div>
                  
                  {/* Real dashboard toggles of AI/QR/Admin features */}
                  <div className="flex flex-wrap items-center justify-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 animate-fade-in gap-0.5">
                    <button
                      onClick={() => setActiveTab('leads_campaigns')}
                      className={`px-2 py-1 text-[9.5px] sm:text-[10.5px] font-black rounded-lg transition-all cursor-pointer ${
                        activeTab === 'leads_campaigns' ? 'bg-[#0092ff] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                      }`}
                    >
                      {mockLabels.leads_campaigns[language] || mockLabels.leads_campaigns['en']}
                    </button>
                    <button
                      onClick={() => setActiveTab('ai_hub')}
                      className={`px-2 py-1 text-[9.5px] sm:text-[10.5px] font-black rounded-lg transition-all cursor-pointer ${
                        activeTab === 'ai_hub' ? 'bg-[#0092ff] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                      }`}
                    >
                      {mockLabels.ai_hub[language] || mockLabels.ai_hub['en']}
                    </button>
                    <button
                      onClick={() => setActiveTab('qr_checkin')}
                      className={`px-2 py-1 text-[9.5px] sm:text-[10.5px] font-black rounded-lg transition-all cursor-pointer ${
                        activeTab === 'qr_checkin' ? 'bg-[#0092ff] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                      }`}
                    >
                      {mockLabels.qr_checkin[language] || mockLabels.qr_checkin['en']}
                    </button>
                    <button
                      onClick={() => setActiveTab('students')}
                      className={`px-2 py-1 text-[9.5px] sm:text-[10.5px] font-black rounded-lg transition-all cursor-pointer ${
                        activeTab === 'students' ? 'bg-[#0092ff] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                      }`}
                    >
                      {mockLabels.students[language] || mockLabels.students['en']}
                    </button>
                    <button
                      onClick={() => setActiveTab('payments')}
                      className={`px-2 py-1 text-[9.5px] sm:text-[10.5px] font-black rounded-lg transition-all cursor-pointer ${
                        activeTab === 'payments' ? 'bg-[#0092ff] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                      }`}
                    >
                      {mockLabels.payments[language] || mockLabels.payments['en']}
                    </button>
                  </div>
                </div>

                {/* Simulated Content Area (smooth transitions) */}
                <div className="p-4 flex-1">
                  <AnimatePresence mode="wait">
                    
                    {activeTab === 'leads_campaigns' && (
                      <motion.div
                        key="tab-leads-campaigns"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4 animate-fade-in font-sans text-left"
                      >
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                          <span className="text-[11px] font-black text-[#0092ff] uppercase tracking-wider flex items-center gap-1.5 font-sans">
                            <Sparkles className="w-4 h-4 text-[#0092ff]" />
                            Leads & Campaigns
                          </span>
                          <span className="bg-sky-50 text-sky-600 text-[10px] font-bold px-2 py-0.5 rounded-md border border-sky-100 font-sans">
                            Active Funnels
                          </span>
                        </div>

                        {/* Interactive Campaign counters */}
                        <div className="grid grid-cols-2 gap-2 text-left font-sans">
                          <div className="p-2 sm:p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Trial Booking Offer</span>
                            <span className="text-xs sm:text-sm font-extrabold text-slate-800">48 Captured Leads</span>
                            <span className="text-[9.5px] text-emerald-600 font-bold block mt-0.5">↑ 16.4% Conversion</span>
                          </div>
                          <div className="p-2 sm:p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Instagram Campaign</span>
                            <span className="text-xs sm:text-sm font-extrabold text-slate-800">1,240 Total Visualized</span>
                            <span className="text-[9.5px] text-blue-600 font-bold block mt-0.5">CPC $0.45 Average</span>
                          </div>
                        </div>

                        {/* Active Lead stream list */}
                        <div className="grid gap-2 text-left font-sans">
                          {mockLeads.map((ld, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200/50 hover:bg-slate-100/50 transition-colors font-sans">
                              <div className="flex items-center gap-1.5">
                                <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-700">
                                  {ld.name[0]}
                                </div>
                                <div className="text-left">
                                  <p className="text-[11px] font-black text-slate-800 leading-none">{ld.name}</p>
                                  <p className="text-[9px] text-slate-400 leading-none">{ld.channel}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`inline-block text-[9.5px] font-black px-1.5 py-0.5 rounded-md border ${
                                  ld.status === 'Converted Member' 
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                    : ld.status === 'Trial Booked' 
                                    ? 'bg-sky-50 text-sky-600 border-sky-100'
                                    : 'bg-amber-50 text-amber-600 border-amber-100'
                                }`}>
                                  {ld.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'ai_hub' && (
                      <motion.div
                        key="tab-ai-hub"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4 animate-fade-in text-left font-sans"
                      >
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                          <span className="text-[11px] font-black text-[#0092ff] uppercase tracking-wider flex items-center gap-1 text-sans">
                            <Bot className="w-4 h-4 text-[#0092ff]" />
                            AI SCHOOL ASSISTANT / AI TOOLS
                          </span>
                          <span className="bg-sky-50 text-[#0092ff] text-[10px] font-bold px-2 py-0.5 rounded-md border border-sky-100 font-sans">
                            Active Engine
                          </span>
                        </div>

                        {/* Interactive prompt generator options */}
                        <div className="space-y-3 font-sans">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-sans">Select AI Query simulation:</p>
                          <div className="flex flex-wrap gap-2 font-sans" id="ai-prompts-chips">
                            <button
                              onClick={() => setAiPrompt('drill')}
                              className={`px-3 py-1.5 text-[10.5px] font-bold rounded-lg border transition-all cursor-pointer font-sans ${
                                aiPrompt === 'drill' ? 'bg-sky-50 border-sky-300 text-[#0092ff]' : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-850 hover:bg-slate-100'
                              }`}
                            >
                              ⚙️ Generate Plan
                            </button>

                            <button
                              onClick={() => setAiPrompt('retention')}
                              className={`px-3 py-1.5 text-[10.5px] font-bold rounded-lg border transition-all cursor-pointer font-sans ${
                                aiPrompt === 'retention' ? 'bg-sky-50 border-sky-300 text-[#0092ff]' : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-850 hover:bg-slate-100'
                              }`}
                            >
                              📧 Retention Campaign
                            </button>

                            <button
                              onClick={() => setAiPrompt('grading')}
                              className={`px-3 py-1.5 text-[10.5px] font-bold rounded-lg border transition-all cursor-pointer font-sans ${
                                aiPrompt === 'grading' ? 'bg-sky-50 border-sky-300 text-[#0092ff]' : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-850 hover:bg-slate-100'
                              }`}
                            >
                              🥋 Exam Syllabus
                            </button>
                          </div>

                          {/* Dynamic AI block with response state */}
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner relative overflow-hidden font-sans">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-sky-500/5 rounded-full blur-xl pointer-events-none" />
                            <p className="text-xs text-slate-700 leading-relaxed font-semibold font-sans">
                              {aiResponses[aiPrompt][language] || aiResponses[aiPrompt]['en']}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'qr_checkin' && (
                      <motion.div
                        key="tab-qr-checkin"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4 animate-fade-in text-left font-sans"
                      >
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                          <span className="text-[11px] font-black text-[#0092ff] uppercase tracking-wider flex items-center gap-1 font-sans">
                            <QrCode className="w-4 h-4 text-[#0092ff]" />
                            QR CODE CHECK-INS
                          </span>
                          <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-100 font-sans">
                            RFID Terminal Active
                          </span>
                        </div>

                        {/* Split look: QR smartphone badge left + live scan stream logs right */}
                        <div className="grid sm:grid-cols-12 gap-4 items-center font-sans">
                          <div className="sm:col-span-4 flex flex-col items-center bg-slate-50 p-3 border border-slate-200 rounded-xl relative">
                            {/* Scanning beam */}
                            <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-emerald-500/60 shadow-md shadow-emerald-400 animate-bounce pointer-events-none" />
                            
                            {/* Minimal QR SVG */}
                            <svg className="w-16 h-16 text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M3 3h4v4H3zM17 3h4v4h-4zM3 17h4v4H3zM14 14h3v3h-3zM14 17h3v3H14zM17 14h4v3h-4z" />
                              <rect x="7" y="7" width="1" height="1" fill="currentColor" />
                              <rect x="16" y="7" width="1" height="1" fill="currentColor" />
                              <rect x="7" y="16" width="1" height="1" fill="currentColor" />
                              <path d="M10 10h4v4h-4z" strokeWidth="1" />
                            </svg>
                            <button
                              onClick={handleScanQr}
                              className="mt-2 px-3 py-1.5 bg-[#0092ff] hover:bg-[#007cd7] text-[#ffffff] text-[10px] font-black uppercase tracking-wider rounded-lg shadow-xs cursor-pointer select-none active:scale-95 transition-transform"
                            >
                              ⚡ SCAN PASS
                            </button>
                          </div>

                          <div className="sm:col-span-8 space-y-1.5">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-sans">Immediate Scan Feed:</p>
                            <div className="grid gap-1 max-h-[140px] overflow-y-auto pr-1 font-sans">
                              {qrLogs.map((log, idx) => (
                                <div key={idx} className="p-1.5 px-2.5 bg-slate-50 border border-slate-150 rounded-lg flex items-center justify-between text-[11px] hover:border-slate-300 transition-colors font-sans">
                                  <div>
                                    <span className="font-extrabold text-slate-800 font-sans">{log.name}</span>
                                    <span className="text-[9.5px] text-emerald-600 font-bold ml-2 font-sans">✓ {log.action}</span>
                                  </div>
                                  <span className="text-[9.5px] font-mono text-slate-400">{log.time}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'students' && (
                      <motion.div
                        key="tab-students"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-3 animate-fade-in font-sans"
                      >
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest text-left">
                            {mockLabels.members_list[language] || mockLabels.members_list['en']}
                          </span>
                          <span className="bg-sky-50 text-[#0092ff] text-[10px] font-bold px-2 py-0.5 rounded-md border border-sky-100 font-sans">
                            {mockLabels.active_now[language] || mockLabels.active_now['en']}
                          </span>
                        </div>
                        <div className="grid gap-1.5 text-left font-sans">
                          {mockStudents.map((st, i) => (
                            <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/50 hover:bg-slate-100/50 transition-colors font-sans">
                              <div className="flex items-center gap-2">
                                <div className="w-6.5 h-6.5 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 font-sans">
                                  {st.name[0]}
                                </div>
                                <div className="text-left font-sans">
                                  <p className="text-xs font-extrabold text-slate-850 leading-tight">{st.name}</p>
                                  <p className="text-[10px] text-slate-500 font-medium leading-none">{getRank(st.rank)}</p>
                                </div>
                              </div>
                              <div className="text-right font-sans">
                                <p className="text-xs font-bold text-slate-800 font-sans leading-tight">{st.attendance}</p>
                                <p className="text-[9px] text-emerald-600 font-bold leading-none">{getLastSeen(st.lastSeen)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'payments' && (
                      <motion.div
                        key="tab-payments"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-3 animate-fade-in font-sans"
                      >
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-sans text-left">
                            {mockLabels.recent_tx[language] || mockLabels.recent_tx['en']}
                          </span>
                          <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-100 font-sans">
                            {mockLabels.stripe_active[language] || mockLabels.stripe_active['en']}
                          </span>
                        </div>
                        <div className="grid gap-1.5 text-left font-sans">
                          {mockPayments.map((p, i) => (
                            <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/50 hover:bg-slate-100/50 transition-all font-sans">
                              <div className="text-left font-sans">
                                <p className="text-xs font-extrabold text-slate-850 leading-tight">{p.name}</p>
                                <p className="text-[9px] text-slate-455 font-mono leading-none">{p.id} / May {p.date.split(' ')[1]}</p>
                              </div>
                              <div className="text-right flex items-center gap-3 font-sans">
                                <span className="text-xs font-black text-slate-800 font-sans">{p.amount}</span>
                                <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-md border ${
                                  p.status === 'Succeeded' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                }`}>
                                  {p.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                  </AnimatePresence>
                </div>

                {/* Mockup Workspace statistics footer */}
                <div className="mt-auto bg-slate-50 p-3 border-t border-slate-250 flex items-center justify-between text-slate-500 text-[10px] font-sans">
                  <span className="font-semibold flex items-center gap-1 text-left text-slate-600">
                    <Sparkles className="w-3 h-3 text-[#0092ff] animate-pulse" />
                    {mockLabels.systems_ok[language] || mockLabels.systems_ok['en']}
                  </span>
                  <span className="font-mono text-slate-400">INTELLIGENT SDK V3.1</span>
                </div>

              </div>

            </div>
          </div>

          {/* Right Column: Checkbox Features list */}
          <div className="lg:col-span-3 flex flex-col justify-center space-y-6" id="features-tick-list">
            <div className="space-y-4">
              {APP_FEATURES_TICKS.map((tickText, i) => {
                let translatedTick = tickText;
                if (i === 0) translatedTick = t('members_academies.tick_business') || tickText;
                else if (i === 1) translatedTick = t('members_academies.tick_payments') || tickText;
                else if (i === 2) translatedTick = t('members_academies.tick_experience') || tickText;
                else if (i === 3) translatedTick = t('members_academies.tick_connection') || tickText;
                else if (i === 4) translatedTick = t('members_academies.tick_multilingual') || tickText;

                return (
                  <div key={i} className="flex gap-3 items-start group" id={`feature-tick-${i}`}>
                    <div className="flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-5 h-5 text-sky-500 group-hover:scale-110 transition-transform duration-200" />
                    </div>
                    <p className="text-slate-600 text-sm font-semibold leading-relaxed text-left">
                      {translatedTick}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Global Bottom Section CTA: Start a FREE Account */}
        <div className="text-center mt-12" id="features-bottom-action">
          <a
            href="#schools"
            className="inline-flex items-center justify-center px-10 py-4 bg-[#0092ff] text-white font-extrabold text-[15px] rounded-xl hover:bg-[#007cd7] shadow-md shadow-sky-500/10 hover:shadow-sky-500/25 transition-all text-center cursor-pointer active:scale-95 py-3.5"
            id="features-register-cta"
          >
            {mockLabels.start_free[language] || mockLabels.start_free['en']}
          </a>
        </div>

      </div>
    </section>
  );
}
