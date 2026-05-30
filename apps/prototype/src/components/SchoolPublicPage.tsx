/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronDown,
  ChevronRight, 
  MapPin, 
  Phone, 
  Globe, 
  Mail, 
  Instagram, 
  Facebook, 
  Wifi, 
  ShoppingBag, 
  Sofa, 
  Droplet, 
  Dumbbell, 
  Bike, 
  Search, 
  CalendarDays,
  ExternalLink,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface SchoolPublicPageProps {
  schoolId: string;
  onBackToExplore: () => void;
}

export default function SchoolPublicPage({ schoolId, onBackToExplore }: SchoolPublicPageProps) {
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);
  const [searchWhat, setSearchWhat] = useState('');
  const [searchWhere, setSearchWhere] = useState('');
  const { language } = useLanguage();
  
  // Modal booking and pricing controls
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [selectedClassSlot, setSelectedClassSlot] = useState<{time: string, name: string} | null>(null);
  const [billingPlan, setBillingPlan] = useState<'single' | 'monthly' | 'pack'>('monthly');
  const [bookingName, setBookingName] = useState('');
  const [bookingEmail, setBookingEmail] = useState('notifications@martialapp.com');
  const [bookingPhone, setBookingPhone] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState<'SP' | 'UK' | 'US' | 'FR'>('SP');
  const [e164Phone, setE164Phone] = useState('');
  const [bookingCompleted, setBookingCompleted] = useState(false);

  // Phone validation & formatting helpers
  const countryConfigs = {
    SP: { min: 9, max: 9, formatPlaceholder: '612 345 678', prefix: '+34' },
    UK: { min: 10, max: 10, formatPlaceholder: '7700 900123', prefix: '+44' },
    US: { min: 10, max: 10, formatPlaceholder: '(555) 123-4567', prefix: '+1' },
    FR: { min: 9, max: 9, formatPlaceholder: '6 12 34 56 78', prefix: '+33' }
  };

  const currentCountryConfig = countryConfigs[selectedCountryCode];

  const getDigitsOnly = (val: string, country: 'SP' | 'UK' | 'US' | 'FR') => {
    let clean = val.replace(/\D/g, '');
    if ((country === 'UK' || country === 'FR') && clean.startsWith('0')) {
      clean = clean.substring(1);
    }
    return clean;
  };

  const formatPhoneNumber = (digits: string, countryCode: 'SP' | 'UK' | 'US' | 'FR'): string => {
    let clean = digits.replace(/\D/g, '');
    if ((countryCode === 'UK' || countryCode === 'FR') && clean.startsWith('0')) {
      clean = clean.substring(1);
    }

    if (countryCode === 'SP') {
      const part1 = clean.substring(0, 3);
      const part2 = clean.substring(3, 6);
      const part3 = clean.substring(6, 9);
      if (clean.length > 6) return `${part1} ${part2} ${part3}`;
      if (clean.length > 3) return `${part1} ${part2}`;
      return part1;
    }
    
    if (countryCode === 'UK') {
      const part1 = clean.substring(0, 4);
      const part2 = clean.substring(4, 7);
      const part3 = clean.substring(7, 10);
      if (clean.length > 7) return `${part1} ${part2} ${part3}`;
      if (clean.length > 4) return `${part1} ${part2}`;
      return part1;
    }
    
    if (countryCode === 'US') {
      const part1 = clean.substring(0, 3);
      const part2 = clean.substring(3, 6);
      const part3 = clean.substring(6, 10);
      if (clean.length > 6) return `(${part1}) ${part2}-${part3}`;
      if (clean.length > 3) return `(${part1}) ${part2}`;
      if (clean.length > 0) return `(${part1}`;
      return '';
    }
    
    if (countryCode === 'FR') {
      const part1 = clean.substring(0, 1);
      const part2 = clean.substring(1, 3);
      const part3 = clean.substring(3, 5);
      const part4 = clean.substring(5, 7);
      const part5 = clean.substring(7, 9);
      
      let formatted = part1;
      if (clean.length > 1) formatted += ` ${part2}`;
      if (clean.length > 3) formatted += ` ${part3}`;
      if (clean.length > 5) formatted += ` ${part4}`;
      if (clean.length > 7) formatted += ` ${part5}`;
      return formatted;
    }
    
    return clean;
  };

  const isPhoneValid = () => {
    const cleanDigits = getDigitsOnly(bookingPhone, selectedCountryCode);
    return cleanDigits.length === currentCountryConfig.min;
  };

  const getE164Phone = (formatted: string, prefix: string, country: 'SP' | 'UK' | 'US' | 'FR'): string => {
    const clean = getDigitsOnly(formatted, country);
    return `${prefix}${clean}`;
  };

  // Unsplash martial arts premium slider images
  const carouselImages = [
    'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1583473848882-f9a5bb7ff2ee?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&q=80&w=1200'
  ];

  const nextSlide = () => {
    setCarouselIndex((prev) => (prev + 1) % carouselImages.length);
  };

  const prevSlide = () => {
    setCarouselIndex((prev) => (prev - 1 + carouselImages.length) % carouselImages.length);
  };

  // Day list generator around May 28, 2026
  const getDayLabel = (offset: number) => {
    const d = new Date('2026-05-28');
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString(language === 'es' ? 'es-ES' : language === 'pt' ? 'pt-BR' : language === 'fr' ? 'fr-FR' : 'en-US', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  };

  // Schedule data variation based on day offsets
  const scheduleSlots = [
    { time: '10:00 AM', duration: '90 min', topic: 'NOGI', coach: 'Monti' },
    { time: '07:00 PM', duration: '90 min', topic: 'Jiu Jitsu Todos', coach: 'Roger Gracie Team' },
    { time: '08:30 PM', duration: '60 min', topic: 'Jiu Jitsu Iniciación', coach: 'Coach Alex' }
  ];

  const facilities = [
    { name: 'Wi-Fi', icon: <Wifi className="w-6 h-6 text-sky-500" /> },
    { name: 'Lockers', icon: <svg className="w-6 h-6 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="12" x2="21" y2="12" /><circle cx="7" cy="7" r="1.5" /><circle cx="7" cy="17" r="1.5" /></svg> },
    { name: 'Lounge', icon: <Sofa className="w-6 h-6 text-sky-500" /> },
    { name: 'Showers', icon: <svg className="w-6 h-6 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 103 12c0 2.21.896 4.21 2.344 5.656L12 21l6.656-3.344A8.002 8.002 0 0021 12z" /><path d="M7 4a5 5 0 0 1 10 0v2H7V4z" /></svg> },
    { name: 'Store', icon: <ShoppingBag className="w-6 h-6 text-sky-500" /> },
    { name: 'Tatami', icon: <svg className="w-6 h-6 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /></svg> },
    { name: 'Water', icon: <Droplet className="w-6 h-6 text-sky-500" /> },
    { name: 'Fit Room', icon: <Dumbbell className="w-6 h-6 text-sky-500" /> },
    { name: 'Bike Parking', icon: <Bike className="w-6 h-6 text-sky-500" /> }
  ];

  const dict: Record<string, Record<string, string>> = {
    back: {
      en: "Back to explore",
      es: "Volver a explorar",
      pt: "Voltar para o mapa",
      fr: "Retour à l'exploration"
    },
    what: {
      en: "What ?",
      es: "¿Qué disciplina?",
      pt: "Qual disciplina?",
      fr: "Quelle activité ?"
    },
    where: {
      en: "Where ?",
      es: "¿Donde?",
      pt: "Onde?",
      fr: "Où ?"
    },
    search: {
      en: "Search",
      es: "Buscar",
      pt: "Buscar",
      fr: "Rechercher"
    },
    desc: {
      en: "Roger Gracie Malaga is a premium martial arts academy situated in Malaga, Spain. Proud official affiliate of the Roger Gracie Academy. It comprises master-grade instruction, safety-audited tatami mat sheets, distinct locker bays, functional zones, and continuous progress certification programs recognized worldwide. Our dojo represents mutual respect, sportsmanship, and tactical development.",
      es: "Roger Gracie Malaga es una escuela de Jiu Jitsu de alto nivel dispuesta en Málaga. Filial oficial de Roger Gracie Academy. Ofrece instrucción experta de clase mundial, tatamis con amortiguación auditada, vestuarios dedicados, zonas recreativas y un currículo de cinturones tradicional con validación internacional.",
      pt: "A Roger Gracie Malaga é uma academia de ponta de Jiu Jitsu em Málaga, Espanha. Orgulhosa afiliada oficial da Roger Gracie Academy. Conta com professores campeões, tatames profissionais higienizados, espaço lounge funcional, e exames de graduação consagrados internacionalmente.",
      fr: "Roger Gracie Malaga est un club de Jiu Jitsu d'élite situé à Malaga. Affilié officiel de la Roger Gracie Academy, notre dojo propose un apprentissage de haut niveau, des équipements haut de gamme, des vestiaires modernes et un programme de passage de grades mondialement réputé."
    },
    interactive_sch: {
      en: "Interactive Schedule",
      es: "Horario Interactivo",
      pt: "Horários de Treinos",
      fr: "Planning Interactif"
    },
    explore_slots: {
      en: "Explore available dojo classes slots & rates",
      es: "Explora los horarios de las clases y tarifas",
      pt: "Consulte as vagas e treinos disponíveis hoje",
      fr: "Consultez les créneaux de cours et tarifs"
    },
    see_pricing: {
      en: "SEE PRICING",
      es: "VER PRECIOS",
      pt: "VER PLANOS",
      fr: "VOIR TARIFS"
    },
    activities: {
      en: "Activities",
      es: "Actividades",
      pt: "Atividades",
      fr: "Activités"
    },
    facilities: {
      en: "Facilities",
      es: "Instalaciones",
      pt: "Instalações",
      fr: "Équipements"
    },
    locator: {
      en: "Dojo Locator",
      es: "Localizador de Dojo",
      pt: "Onde treinar",
      fr: "Localisateur de Dojo"
    },
    open_maps: {
      en: "Open in Maps",
      es: "Abrir en Maps",
      pt: "Abrir no Google Maps",
      fr: "Ouvrir dans Maps"
    },
    editorial_headline: {
      en: "Martial Magazine",
      es: "Revista De Combate",
      pt: "Informativo Budo",
      fr: "Magazine du Club"
    },
    editorial_p: {
      en: "Inside look on standard combat loops. Pick up your physical copy in Málaga's reception.",
      es: "Análisis técnico y las últimas noticias. Recoge tu copia física gratis en recepción.",
      pt: "Análises técnicas das lutas clássicas. Retire seu exemplar impresso em nossa recepção.",
      fr: "Analyses de combat et actualités. Demandez votre exemplaire physique à l'accueil."
    },
    slot_reservation: {
      en: "Dojo Slot Reservation",
      es: "Reserva de Plaza Dojo",
      pt: "Reserva de Vaga no Tatame",
      fr: "Réservation de Séance"
    },
    book_class: {
      en: "Book",
      es: "Reservar",
      pt: "Reservar",
      fr: "Réserver"
    },
    completed_title: {
      en: "Class Booked Successfully!",
      es: "¡Clase Reservada con Éxito!",
      pt: "Reserva Confirmada com Sucesso!",
      fr: "Réservation de Cours Validée !"
    },
    completed_p: {
      en: "We have successfully synchronized your lesson. A voucher code with QR validation has been registered under your account:",
      es: "Hemos programado tu clase correctamente. Se ha enviado un boleto con código QR de verificación a tu correo:",
      pt: "Agendamento sincronizado com sucesso. O seu convite digital com QR Code foi enviado para:",
      fr: "Votre cours a bien été réservé. Un e-mail de confirmation avec QR Code de validation a été envoyé à l'adresse suivante :"
    },
    dismiss: {
      en: "Dismiss",
      es: "Entendido / Cerrar",
      pt: "Fechar",
      fr: "Fermer"
    },
    select_membership: {
      en: "Select Membership / Slot Type",
      es: "Selecciona el Tipo de Membresía / Pase",
      pt: "Selecione o Tipo de Entrada",
      fr: "Sélectionnez votre formule d'accès"
    },
    single_title: {
      en: "Single Class Drop-in",
      es: "Clase de Prueba Individual",
      pt: "Aula Avulsa Experimental",
      fr: "Séance d'essai unitaire"
    },
    single_desc: {
      en: "Valid for one single lesson slot today",
      es: "Válida únicamente para una clase hoy",
      pt: "Válido para participar de um treino hoje",
      fr: "Valable pour un cours unique ce jour"
    },
    monthly_title: {
      en: "Unlimited Monthly Membership",
      es: "Membresía Ilimitada Mensual",
      pt: "Mensalidade Livre Ilimitada",
      fr: "Abonnement Mensuel Illimité"
    },
    monthly_desc: {
      en: "Best Value • No sign-up contract fee",
      es: "Mejor Opción • Sin tarifas de inscripción",
      pt: "Melhor Custo • Sem taxa de fidelidade",
      fr: "Idéal • Sans frais d'inscription additionnels"
    },
    pack_title: {
      en: "10-Class Pack Bundle",
      es: "Bono de 10 Clases Multisesión",
      pt: "Pacote Promocional de 10 Aulas",
      fr: "Carnet de 10 Cours"
    },
    pack_desc: {
      en: "Valid over 12 months for any regular slots",
      es: "Válido durante 12 meses para cualquier sesión",
      pt: "Válido por 12 meses para quaisquer treinos",
      fr: "Valable 12 mois sur toutes les séances"
    },
    your_name: {
      en: "Your Full Name",
      es: "Tu Nombre Completo",
      pt: "Seu Nome Completo",
      fr: "Nom Complet"
    },
    your_email: {
      en: "Your Email Address",
      es: "Tu Dirección de Correo",
      pt: "Seu Endereço de E-mail",
      fr: "Adresse E-mail"
    },
    auth_pay: {
      en: "Authorize Payment & Book Now",
      es: "Autorizar Pago y Reservar Ahora",
      pt: "Autorizar Pagamento e Agendar",
      fr: "Autoriser le Paiement"
    },
    secure_banking: {
      en: "Secure end-to-end sandbox banking protocols.",
      es: "Protocolos seguros bancarios de simulación de extremo a extremo.",
      pt: "Protocolos bancários simulados em ambiente seguro.",
      fr: "Protocoles de paiement sécurisés (environnement d'essai)."
    }
  };

  const getTranslatedFacility = (facility: string) => {
    const facilityDict: Record<string, Record<string, string>> = {
      'Wi-Fi': { en: 'Wi-Fi', es: 'Wi-Fi gratis', pt: 'Wi-Fi Grátis', fr: 'Wi-Fi' },
      'Lockers': { en: 'Lockers', es: 'Taquillas', pt: 'Armários', fr: 'Vestiaires' },
      'Lounge': { en: 'Lounge', es: 'Zona Social', pt: 'Espaço Lounge', fr: 'Espace Détente' },
      'Showers': { en: 'Showers', es: 'Duchas', pt: 'Chuveiros', fr: 'Douches' },
      'Store': { en: 'Store', es: 'Tienda Oficial', pt: 'Loja Oficial', fr: 'Boutique' },
      'Tatami': { en: 'Tatami', es: 'Área Tatami', pt: 'Área de Tatame', fr: 'Tatamis' },
      'Water': { en: 'Water', es: 'Agua Filtrada', pt: 'Bebedouro', fr: 'Fontaine Eau' },
      'Fit Room': { en: 'Fit Room', es: 'Área de Pesos', pt: 'Sala de Musculação', fr: 'Plateau Muscu' },
      'Bike Parking': { en: 'Bike Parking', es: 'Bicicletero', pt: 'Bicicletário', fr: 'Range Vélos' }
    };
    return facilityDict[facility]?.[language] || facility;
  };

  return (
    <div className="bg-white min-h-screen pb-16" id="school-public-profile">
      
      {/* Search Header Bar (aligned inside profile page layout) */}
      <div className="bg-slate-50 border-b border-slate-100 py-4 shadow-2xs" id="profile-subsearch-bar">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center gap-4 justify-between">
          
          <button
            onClick={onBackToExplore}
            className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase hover:text-[#0092ff] tracking-wider transition-colors py-2 px-3 bg-white rounded-lg border border-slate-100 shadow-3xs cursor-pointer focus:outline-none"
            id="back-list-btn"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{dict.back[language]}</span>
          </button>

          {/* Sub Search inputs matching what/where look */}
          <div className="flex-1 flex flex-col sm:flex-row items-center gap-2 max-w-2xl w-full" id="inner-subsearch-block">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={searchWhat}
                onChange={(e) => setSearchWhat(e.target.value)}
                placeholder={dict.what[language]}
                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#0092ff]"
              />
            </div>

            <div className="relative flex-1 w-full">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={searchWhere}
                onChange={(e) => setSearchWhere(e.target.value)}
                placeholder={dict.where[language]}
                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#0092ff]"
              />
            </div>

            <button
               onClick={onBackToExplore}
               className="px-6 py-2.5 bg-[#0092ff] text-white hover:bg-[#007cd7] text-xs font-black uppercase tracking-wider rounded-lg shadow-sm cursor-pointer w-full sm:w-auto"
            >
              {dict.search[language]}
            </button>
          </div>

        </div>
      </div>

      {/* Main Double Grid Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" id="profile-grid">
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column Component (Dojo Main Profile - 8/12 widths) */}
          <div className="lg:col-span-8 space-y-10" id="profile-left-lane">
            
            {/* 1. Immersive Photo Carousel Shield */}
            <div className="relative h-[320px] sm:h-[420px] bg-slate-900 rounded-3xl overflow-hidden shadow-lg group" id="dojo-photo-carousel">
              <img
                src={carouselImages[carouselIndex]}
                alt="Gym combat sessions training"
                className="w-full h-full object-cover opacity-95 transition-all duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent pointer-events-none" />

              {/* Navigation Arrows */}
              <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 border border-white/35 text-white flex items-center justify-center cursor-pointer transition-colors"
                id="carousel-prev"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 border border-white/35 text-white flex items-center justify-center cursor-pointer transition-colors"
                id="carousel-next"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Sliders Bottom indicators dot bars */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                {carouselImages.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      carouselIndex === idx ? 'w-6 bg-[#0092ff]' : 'w-1.5 bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* 2. Headings & Long Overview description text */}
            <div className="space-y-4 text-left font-sans" id="profile-headings">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight uppercase font-display">
                Roger Gracie Malaga
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed font-semibold">
                {dict.desc[language]}
              </p>
            </div>

            {/* 3. Fully functional schedule selector interface */}
            <div className="border border-slate-100 rounded-2xl bg-slate-50/50 p-5 space-y-6 text-left font-sans" id="schedule-planner">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="schedule-planner-hdr">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase font-display flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-sky-500" />
                    {dict.interactive_sch[language]}
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">{dict.explore_slots[language]}</p>
                </div>

                {/* Day Pagers */}
                <div className="flex items-center bg-white rounded-lg p-1 border border-slate-100 gap-1" id="schedule-pager">
                  <button
                    onClick={() => setSelectedDayOffset((prev) => prev - 1)}
                    className="p-1.5 rounded-md hover:bg-slate-50 text-slate-600 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-black uppercase text-slate-800 tracking-wider px-2 min-w-[170px] text-center">
                    {getDayLabel(selectedDayOffset)}
                  </span>
                  <button
                    onClick={() => setSelectedDayOffset((prev) => prev + 1)}
                    className="p-1.5 rounded-md hover:bg-slate-50 text-slate-600 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Class Booking slots lists */}
              <div className="space-y-3" id="schedule-slots-pane">
                {scheduleSlots.map((slot, index) => (
                  <div
                    key={index}
                    className="p-4 bg-white border border-slate-100 rounded-xl flex items-center justify-between gap-4 shadow-3xs hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {/* Clock Block */}
                      <div className="bg-sky-50 px-3 py-2 rounded-lg text-center min-w-[76px]">
                        <span className="block text-xs font-black text-sky-600 leading-none">{slot.time}</span>
                        <span className="text-[10px] text-slate-400 font-bold block mt-1">{slot.duration}</span>
                      </div>
                      
                      {/* Course / Coach details */}
                      <div>
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{slot.topic}</h4>
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wide">Coach: {slot.coach}</span>
                      </div>
                    </div>

                    {/* See rates CTA button */}
                    <button
                      onClick={() => {
                        setSelectedClassSlot({ time: slot.time, name: slot.topic });
                        setShowPricingModal(true);
                      }}
                      className="px-5 py-2.5 bg-[#0092ff] hover:bg-[#007cd7] text-white text-[11px] font-black uppercase tracking-wider rounded-lg shadow-2xs transition-all cursor-pointer select-none"
                    >
                      {dict.see_pricing[language]}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Activities badging grids section */}
            <div className="text-left space-y-4 font-sans" id="activities-panel">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider border-b border-gray-100 pb-2">
                {dict.activities[language]}
              </h3>
              
              <div className="grid grid-cols-2 gap-4 max-w-md" id="activities-cards">
                {/* Jiu-jitsu */}
                <div className="p-4 bg-gradient-to-br from-slate-50 via-white to-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3.5 shadow-3xs hover:shadow-xs transition-shadow">
                  <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center font-black text-xs text-[#0092ff]">
                    🥋
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 leading-tight">JIU JITSU</h4>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Grappling Gi</span>
                  </div>
                </div>

                {/* Grappling */}
                <div className="p-4 bg-gradient-to-br from-slate-50 via-white to-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3.5 shadow-3xs hover:shadow-xs transition-shadow">
                  <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center font-black text-xs text-[#0092ff]">
                    🤼
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 leading-tight">GRAPPLING</h4>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sub No-Gi</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Facilities Section Grid of badges */}
            <div className="text-left space-y-5 font-sans" id="facilities-panel">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider border-b border-gray-100 pb-2 font-display">
                {dict.facilities[language]}
              </h3>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3" id="facilities-badge-grid">
                {facilities.map((fac) => (
                  <div
                    key={fac.name}
                    className="p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl flex flex-col items-center justify-center text-center gap-2 hover:bg-white hover:border-slate-200 hover:shadow-3xs transition-all cursor-pointer"
                  >
                    <div className="bg-sky-50/50 p-2 rounded-lg">
                      {fac.icon}
                    </div>
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-wide">
                      {getTranslatedFacility(fac.name)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column Component (Sidebar Details) */}
          <div className="lg:col-span-4 space-y-8 font-sans" id="profile-right-lane">
            
            {/* 1. Map simulator Card */}
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-3xl space-y-4 shadow-sm" id="map-simulation-card">
              
              <div className="flex items-center justify-between" id="map-simulation-hdr">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{dict.locator[language]}</span>
                <a
                  href="https://maps.google.com/?q=Calle+Polifemo+3+Malaga+Spain"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-black text-sky-500 hover:underline uppercase"
                  id="abrir-maps-link"
                >
                  <span>{dict.open_maps[language]}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Physical map visual */}
              <div className="h-44 bg-slate-200 rounded-2xl overflow-hidden relative border border-slate-150" id="micro-map-body">
                <img
                  src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=600"
                  alt="City maps layout"
                  className="w-full h-full object-cover opacity-60 filter saturate-150 grayscale"
                  referrerPolicy="no-referrer"
                />
                
                {/* Red pin point */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full bg-rose-500 border-2 border-white animate-bounce shadow-md" />
                  <div className="bg-slate-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded-sm mt-1 whitespace-nowrap shadow-lg">
                    Malaga Dojo
                  </div>
                </div>

                <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-xs shadow-md rounded-lg py-1 px-2.5 text-[8.5px] font-bold text-slate-600 block">
                  📍 Calle Polifemo 3, Malaga
                </div>
              </div>

              {/* Address Credentials list */}
              <div className="space-y-3.5 text-xs text-slate-600 font-semibold border-t border-slate-200/50 pt-4 text-left" id="sidebar-address-meta">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4.5 h-4.5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <span>Calle Polifemo, 3, Málaga, España</span>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-4.5 h-4.5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <span>+34665988898</span>
                </div>

                <div className="flex items-start gap-3">
                  <Globe className="w-4.5 h-4.5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <a href="http://rogergraciemalaga.com/" target="_blank" rel="noreferrer" className="hover:text-[#0092ff] truncate">
                    rogergraciemalaga.com
                  </a>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-4.5 h-4.5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <span className="truncate">rogergraciemalaga@gmail.com</span>
                </div>
              </div>
            </div>

            {/* 2. Martial Magazine editorial banner block */}
            <div className="relative rounded-3xl overflow-hidden shadow-md bg-[#dedede]" id="martial-magazine-sidebar">
              <img
                src="https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&q=80&w=600"
                alt="Fighter flexing wrist wraps cover art"
                className="w-full h-56 object-cover object-top filter grayscale contrast-125 saturate-50"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/45 to-transparent" />
              
              <div className="absolute inset-0 flex flex-col justify-end p-5 text-left space-y-1.5 text-white">
                <span className="text-[8.5px] font-black tracking-widest text-[#0092ff] uppercase bg-[#0092ff]/10 border border-[#0092ff]/30 w-max px-2.5 py-1 rounded-sm">
                  Dojo Editorial
                </span>
                <h4 className="text-lg font-black tracking-wider uppercase font-display leading-tight">
                  {dict.editorial_headline[language]}
                </h4>
                <p className="text-[10px] text-slate-300 font-semibold leading-relaxed">
                  {dict.editorial_p[language]}
                </p>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* 4. SEE PRICING / BOOK CLASS MODAL FORM TRIGGER SYSTEM */}
      <AnimatePresence>
        {showPricingModal && selectedClassSlot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs font-sans" id="rates-scheduler-modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl overflow-hidden w-full max-w-lg shadow-2xl relative border border-slate-100 p-6 text-left"
              id="rates-scheduler-modal-body"
            >
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5" id="modal-subhdr">
                <div>
                  <span className="text-[10px] uppercase font-black text-sky-500 tracking-widest block">{dict.slot_reservation[language]}</span>
                  <h3 className="text-base font-black text-slate-900 mt-1 uppercase font-display leading-tight">
                    {dict.book_class[language]} &lsquo;{selectedClassSlot.name}&rsquo; ({selectedClassSlot.time})
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowPricingModal(false);
                    setBookingCompleted(false);
                  }}
                  className="text-slate-400 hover:text-slate-900 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Switch Content on booking completed */}
              {bookingCompleted ? (
                <div className="py-8 text-center space-y-4" id="booking-completed-pane">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500 border-2 border-emerald-100 shadow-sm">
                    <ShieldCheck className="w-10 h-10" />
                  </div>
                  <h4 className="text-lg font-black text-slate-900 leading-tight uppercase font-display">{dict.completed_title[language]}</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto font-semibold leading-relaxed">
                    {dict.completed_p[language]} <span className="text-[#0092ff] font-extrabold">{selectedClassSlot.name}</span>.<br />
                    <span className="font-mono text-[10px] font-black text-slate-700 bg-slate-50 border border-slate-100 py-0.5 px-2 rounded-sm inline-block mt-2">📧 {bookingEmail}</span>
                    {e164Phone && (
                      <span className="font-mono text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 py-0.5 px-2 rounded-sm inline-block mt-1 ml-2">📞 {e164Phone}</span>
                    )}
                  </p>
                  
                  <div className="pt-4">
                    <button
                      onClick={() => {
                        setShowPricingModal(false);
                        setBookingCompleted(false);
                      }}
                      className="px-6 py-2.5 bg-[#0092ff] text-white hover:bg-[#007cd7] text-xs font-black uppercase tracking-wider rounded-lg shadow-sm cursor-pointer"
                    >
                      {dict.dismiss[language]}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5" id="booking-form-pane">
                  
                  {/* Select Pricing Plan Row */}
                  <div className="space-y-2.5" id="plans-picker">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-display">{dict.select_membership[language]}</p>
                    
                    <div className="grid grid-cols-1 gap-2" id="plans-picker-grid">
                      
                      {/* Plan: Single Session */}
                      <label
                        onClick={() => setBillingPlan('single')}
                        className={`p-3.5 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                          billingPlan === 'single' ? 'bg-sky-50/50 border-[#0092ff]' : 'border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex gap-3 items-center">
                          <input type="radio" checked={billingPlan === 'single'} readOnly className="text-blue-500 w-4 h-4" />
                          <div>
                            <span className="block text-xs font-black text-slate-800 uppercase tracking-tight">{dict.single_title[language]}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{dict.single_desc[language]}</span>
                          </div>
                        </div>
                        <span className="text-sm font-black text-[#0092ff]">€15</span>
                      </label>

                      {/* Plan: Unlimited Monthly */}
                      <label
                        onClick={() => setBillingPlan('monthly')}
                        className={`p-3.5 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                          billingPlan === 'monthly' ? 'bg-sky-50/50 border-[#0092ff]' : 'border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex gap-3 items-center">
                          <input type="radio" checked={billingPlan === 'monthly'} readOnly className="text-blue-500 w-4 h-4" />
                          <div>
                            <span className="block text-xs font-black text-slate-800 uppercase tracking-tight">{dict.monthly_title[language]}</span>
                            <span className="text-[10px] text-[#0092ff] font-extrabold">{dict.monthly_desc[language]}</span>
                          </div>
                        </div>
                        <span className="text-sm font-black text-[#0092ff]">€75/mo</span>
                      </label>

                      {/* Plan: 10 Class Pack */}
                      <label
                        onClick={() => setBillingPlan('pack')}
                        className={`p-3.5 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                          billingPlan === 'pack' ? 'bg-sky-50/50 border-[#0092ff]' : 'border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex gap-3 items-center">
                          <input type="radio" checked={billingPlan === 'pack'} readOnly className="text-blue-500 w-4 h-4" />
                          <div>
                            <span className="block text-xs font-black text-slate-800 uppercase tracking-tight">{dict.pack_title[language]}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{dict.pack_desc[language]}</span>
                          </div>
                        </div>
                        <span className="text-sm font-black text-[#0092ff]">€120</span>
                      </label>

                    </div>
                  </div>

                  {/* Input Credentials */}
                  <div className="space-y-3.5 font-sans" id="booking-credentials-form">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">{dict.your_name[language]}</label>
                      <input
                        type="text"
                        value={bookingName}
                        onChange={(e) => setBookingName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-xs text-slate-800 font-bold placeholder-slate-400 focus:outline-none focus:border-[#0092ff]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">{dict.your_email[language]}</label>
                      <input
                        type="email"
                        value={bookingEmail}
                        onChange={(e) => setBookingEmail(e.target.value)}
                        placeholder="notifications@martialapp.com"
                        className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-xs text-slate-800 font-bold placeholder-slate-400 focus:outline-none focus:border-[#0092ff]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                        {language === 'es' ? 'Teléfono de Contacto' : language === 'pt' ? 'Celular / WhatsApp' : language === 'fr' ? 'Numéro de Téléphone' : 'Phone Number'}
                      </label>
                      
                      <div className="flex gap-2">
                        {/* Custom Dropdown wrapper */}
                        <div className="relative shrink-0">
                          <select
                            value={selectedCountryCode}
                            onChange={(e) => {
                              const newCountry = e.target.value as 'SP' | 'UK' | 'US' | 'FR';
                              setSelectedCountryCode(newCountry);
                              setBookingPhone('');
                              setE164Phone('');
                            }}
                            className="bg-slate-50 border border-slate-100 rounded-lg py-2.5 pl-3 pr-8 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#0092ff] appearance-none cursor-pointer h-full"
                          >
                            <option value="SP">🇪🇸 SP (+34)</option>
                            <option value="UK">🇬🇧 UK (+44)</option>
                            <option value="US">🇺🇸 US (+1)</option>
                            <option value="FR">🇫🇷 FR (+33)</option>
                          </select>
                          <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-slate-400">
                            <ChevronDown className="w-3.5 h-3.5" />
                          </div>
                        </div>

                        {/* Interactive formatted Telephone Input */}
                        <div className="flex-grow relative">
                          <input
                            type="tel"
                            value={bookingPhone}
                            onChange={(e) => {
                              const inputVal = e.target.value;
                              const digitsOnly = getDigitsOnly(inputVal, selectedCountryCode);
                              
                              if (digitsOnly.length <= currentCountryConfig.max) {
                                const formatted = formatPhoneNumber(inputVal, selectedCountryCode);
                                setBookingPhone(formatted);
                                
                                const e164 = getE164Phone(formatted, currentCountryConfig.prefix, selectedCountryCode);
                                setE164Phone(e164);
                              }
                            }}
                            placeholder={currentCountryConfig.formatPlaceholder}
                            className={`w-full bg-slate-50 border rounded-lg p-2.5 pr-10 text-xs text-slate-800 font-bold placeholder-slate-400 focus:outline-none transition-colors ${
                              bookingPhone && !isPhoneValid() 
                                ? 'border-amber-400 focus:border-amber-500 bg-amber-50/5' 
                                : isPhoneValid()
                                ? 'border-emerald-400 focus:border-emerald-500 bg-emerald-50/5'
                                : 'border-slate-100 focus:border-[#0092ff]'
                            }`}
                            required
                          />

                          {/* Instant checklist state visual feedback */}
                          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                            {isPhoneValid() ? (
                              <Check className="w-4 h-4 text-emerald-500 font-bold" />
                            ) : bookingPhone ? (
                              <span className="text-[10px] text-amber-500 font-bold">
                                {getDigitsOnly(bookingPhone, selectedCountryCode).length}/{currentCountryConfig.min}
                              </span>
                            ) : null}
                          </div>
                        </div>

                      </div>

                      {/* Error instruction messages if they are currently typing but not finished */}
                      {bookingPhone && !isPhoneValid() && (
                        <p className="text-[10.5px] text-amber-500 font-semibold mt-1">
                          {language === 'es' ? `Por favor, introduce exactamente ${currentCountryConfig.min} dígitos` :
                           language === 'pt' ? `Digite exatamente ${currentCountryConfig.min} dígitos` :
                           language === 'fr' ? `Veuillez saisir exactement ${currentCountryConfig.min} chiffres` :
                           `Please enter exactly ${currentCountryConfig.min} digits`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Submit CTA button */}
                  <button
                    onClick={() => {
                      if (!bookingName || !isPhoneValid()) {
                        return;
                      }
                      setBookingCompleted(true);
                    }}
                    disabled={!bookingName || !isPhoneValid()}
                    className="w-full text-center py-3 bg-[#0092ff] text-white hover:bg-[#007cd7] text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md select-none mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {dict.auth_pay[language]}
                  </button>
                  
                  <div className="flex items-center justify-center gap-1.5 text-[10.5px] text-slate-400 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 font-sans" />
                    <span>{dict.secure_banking[language]}</span>
                  </div>

                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
