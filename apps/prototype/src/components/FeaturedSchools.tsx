/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, MapPin, ChevronRight, X, Phone, Mail, Clock, ShieldCheck, Dumbbell } from 'lucide-react';
import { FEATURED_SCHOOLS, School } from '../types';
import { useLanguage } from '../LanguageContext';

export default function FeaturedSchools() {
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const { t, language } = useLanguage();

  const localText: Record<string, any> = {
    badge: { en: 'Find a Dojo Near You', es: 'Encuentra un Dojo Cerca de Ti', pt: 'Encontre um Dojo Perto de Você', fr: 'Trouvez un Club Près de Chez Vous' },
    title: { en: 'Our Featured Schools', es: 'Nuestros Dojos Destacados', pt: 'Nossas Academias em Destaque', fr: 'Nos Clubs Recommandés' },
    explore_all: { en: 'Explore all', es: 'Explorar todo', pt: 'Explorar todos', fr: 'Explorer tout' },
    learn_more: { en: 'Learn More', es: 'Más Información', pt: 'Saiba Mais', fr: 'En savoir plus' },
    featured_academy: { en: 'Featured Academy', es: 'Academia Destacada', pt: 'Academia em Destaque', fr: 'Club Recommandé' },
    trial_booked: { en: 'Trial Session Booked!', es: '¡Sesión de Prueba Reservada!', pt: '¡Aula Experimental Reservada!', fr: 'Cours d\'essai réservé !' },
    success_desc: {
      en: 'We have successfully synchronized your booking. An email confirmation has been sent to your account.',
      es: 'Hemos sincronizado tu reserva con éxito. Se ha enviado una confirmación a tu correo.',
      pt: 'Sua aula experimental foi reservada com sucesso. Uma confirmação foi enviada para o seu e-mail.',
      fr: 'Nous avons synchronisé votre réservation avec succès. Un e-mail de confirmation a été envoyé.'
    },
    return_btn: { en: 'Return to Explore', es: 'Volver a Dojos', pt: 'Voltar para Academias', fr: 'Retour' },
    disciplines: { en: 'Syllabus & Disciplines', es: 'Programa y Disciplinas', pt: 'Programa e Disciplinas', fr: 'Programme & Disciplines' },
    book_free: { en: 'Book Free Trial Slot', es: 'Reservar Clase de Prueba', pt: 'Reservar Aula de Experiência', fr: 'Réserver un cours gratuit' },
    courses_trans: {
      'Brazilian Jiu-Jitsu': { en: 'Brazilian Jiu-Jitsu', es: 'Jiu-Jitsu Brasileño', pt: 'Jiu-Jitsu Brasileiro', fr: 'Jiu-Jitsu Brésilien' },
      'Kids Self Defence': { en: 'Kids Self Defense', es: 'Defensa Personal Infantil', pt: 'Defesa Pessoal Infantil', fr: 'Self-Défense Enfants' },
      'Muay Thai Kickboxing': { en: 'Muay Thai Kickboxing', es: 'Kickboxing Muay Thai', pt: 'Muay Thai Kickboxing', fr: 'Kickboxing Muay Thai' },
      'Traditional Taekwondo': { en: 'Traditional Taekwondo', es: 'Taekwondo Tradicional', pt: 'Taekwondo Tradicional', fr: 'Taekwondo Traditionnel' },
      'Olympic Sparring': { en: 'Olympic Sparring', es: 'Combate Olímpico', pt: 'Treino Olímpico', fr: 'Sparring Olympique' },
      'Cardio Fitness': { en: 'Cardio Fitness', es: 'Cardio Fitness', pt: 'Cardio Fitness', fr: 'Cardio Fitness' },
      'No-Gi BJJ Wrestling': { en: 'No-Gi BJJ Wrestling', es: 'Lucha No-Gi / BJJ', pt: 'No-Gi Luta Livre', fr: 'Grappling / JJB No-Gi' },
      'Adults Fundamentals': { en: 'Adults Fundamentals', es: 'Fundamentos Adultos', pt: 'Fundamentos para Adultos', fr: 'Bases Adultes' },
      'Open Sparring Slots': { en: 'Open Sparring Slots', es: 'Horario Sparring Libre', pt: 'Sparring Livre', fr: 'Créneaux Sparring Libre' },
      'Classic Western Boxing': { en: 'Classic Western Boxing', es: 'Boxeo Clásico', pt: 'Boxe Clássico', fr: 'Boxe Anglaise Classique' },
      'Kids Cardio Gloves': { en: 'Kids Cardio Gloves', es: 'Guantes de Cardio Infantil', pt: 'Luvas de Cardio Infantil', fr: 'Cardio Boxe Enfants' },
      'Youth Sparring Matches': { en: 'Youth Sparring Matches', es: 'Sparring Juvenil', pt: 'Combate para Jovens', fr: 'Combats Juniors' }
    }
  };

  const getTranslatedCourse = (course: string) => {
    return localText.courses_trans[course]?.[language] || localText.courses_trans[course]?.['en'] || course;
  };

  // Deep school details to populate modal dynamically
  const schoolDetailsExtended: Record<string, any> = {
    'school-1': {
      phone: '+44 1277 889900',
      email: 'info@apexmartialarts.co.uk',
      schedule: 'Mon - Sat: 08:00 AM - 09:30 PM',
      courses: ['Brazilian Jiu-Jitsu', 'Kids Self Defence', 'Muay Thai Kickboxing'],
      coaches: ['Master Liam Davies (5th Dan)', 'Sensei Clara Holmes (3rd Dan)']
    },
    'school-2': {
      phone: '+44 1277 554433',
      email: 'contact@valortkd.co.uk',
      schedule: 'Tue - Sun: 09:00 AM - 08:00 PM',
      courses: ['Traditional Taekwondo', 'Olympic Sparring', 'Cardio Fitness'],
      coaches: ['Grandmaster Seung Ahn (7th Dan)', 'Coach Mark Sterling']
    },
    'school-3': {
      phone: '+44 207 445522',
      email: 'hello@havenjiujitsu.com',
      schedule: 'Mon - Sun: 07:00 AM - 10:00 PM',
      courses: ['No-Gi BJJ Wrestling', 'Adults Fundamentals', 'Open Sparring Slots'],
      coaches: ['Professor Eduardo Silva', 'Coach Sarah Kowalski']
    },
    'school-4': {
      phone: '+44 161 332211',
      email: 'hq@alphaboxingmanc.com',
      schedule: 'Mon - Fri: 06:00 AM - 09:00 PM',
      courses: ['Classic Western Boxing', 'Kids Cardio Gloves', 'Youth Sparring Matches'],
      coaches: ['Coach Roy Mercer (Ex PRO)', 'Coach James Carter']
    }
  };

  return (
    <section className="bg-white py-20 border-b border-gray-100" id="schools">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header container */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12" id="schools-header-row">
          <div className="text-left">
            <span className="text-xs font-black text-sky-500 uppercase tracking-widest block mb-2">
              {localText.badge[language] || localText.badge['en']}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
              {localText.title[language] || localText.title['en']}
            </h2>
          </div>
          
          <button
            onClick={() => {
              setSelectedSchool(FEATURED_SCHOOLS[0]);
            }}
            className="px-6 py-3 border-2 border-slate-200 hover:border-[#0092ff] text-slate-700 hover:text-[#0092ff] text-[14px] font-bold rounded-xl transition-all cursor-pointer focus:outline-none flex items-center gap-2"
            id="explore-all-schools-btn"
          >
            {localText.explore_all[language] || localText.explore_all['en']}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="schools-cards-grid">
          {FEATURED_SCHOOLS.map((school, idx) => (
            <motion.div
              key={school.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -6 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-xl overflow-hidden flex flex-col h-full group"
              id={`school-card-${school.id}`}
            >
              
              {/* Gym Image Stage */}
              <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                <img
                  src={school.image}
                  alt={school.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-800 shadow-sm flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{school.rating} ({school.reviewCount}+)</span>
                </div>
              </div>

              {/* Gym Meta Details & Text */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-[#0092ff] uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {school.location}
                  </p>
                  <h3 className="font-extrabold text-slate-800 text-[15px] group-hover:text-[#0092ff] transition-colors leading-snug text-left">
                    {school.name}
                  </h3>
                  <p className="text-[12px] text-slate-500 leading-relaxed line-clamp-3 text-left font-semibold">
                    {school.description}
                  </p>
                </div>

                {/* Card CTA Footer */}
                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  <button
                    onClick={() => setSelectedSchool(school)}
                    className="text-[#0092ff] hover:text-[#007cd7] text-xs font-extrabold flex items-center gap-1 select-none focus:outline-none cursor-pointer"
                  >
                    {localText.learn_more[language] || localText.learn_more['en']}
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

            </motion.div>
          ))}
        </div>

      </div>

      {/* Interactive Modal Details Overlay */}
      <AnimatePresence>
        {selectedSchool && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs" id="school-details-overlay">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full text-slate-800 shadow-2xl relative overflow-y-auto max-h-[90vh]"
              id="school-details-modal"
            >
              <button
                onClick={() => {
                  setSelectedSchool(null);
                  setBookingSuccess(false);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100 cursor-pointer"
                id="close-school-modal"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Gym Image Banner */}
              <div className="relative aspect-3/1 w-full rounded-2xl overflow-hidden bg-slate-100 mb-6">
                <img
                  src={selectedSchool.image}
                  alt={selectedSchool.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                  <span className="text-white text-xs font-black tracking-widest uppercase bg-[#0092ff]/90 px-3 py-1 rounded-md">
                    {localText.featured_academy[language] || localText.featured_academy['en']}
                  </span>
                </div>
              </div>

              {/* Grid Header Info / Booking Confirmed Switch */}
              {bookingSuccess ? (
                <div className="text-center py-8 space-y-4" id="booking-success-message">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
                    <ShieldCheck className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-950">
                    {localText.trial_booked[language] || localText.trial_booked['en']}
                  </h3>
                  <p className="text-sm text-slate-600 max-w-md mx-auto font-semibold">
                    {localText.success_desc[language] || localText.success_desc['en']} <span className="text-[#0092ff]">{selectedSchool.name}</span>.
                  </p>
                  <div className="pt-4">
                    <button
                      onClick={() => {
                        setSelectedSchool(null);
                        setBookingSuccess(false);
                      }}
                      className="px-8 py-3 bg-[#0092ff] text-white hover:bg-[#007cd7] text-sm font-black rounded-lg shadow-md transition-all cursor-pointer"
                    >
                      {localText.return_btn[language] || localText.return_btn['en']}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid md:grid-cols-12 gap-6 items-start animate-fade-in" id="modal-content-grid">
                  
                  <div className="md:col-span-8 space-y-4 text-left">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                        {selectedSchool.name}
                      </h3>
                      <p className="text-sm font-bold text-sky-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-4 h-4" />
                        {selectedSchool.location}
                      </p>
                    </div>

                    <p className="text-sm text-slate-600 leading-relaxed font-semibold">
                      {selectedSchool.description}
                    </p>

                    {/* Highlights section inside modal */}
                    <div className="space-y-2.5 pt-2 text-left">
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 uppercase tracking-wider">
                        <Dumbbell className="w-4 h-4 text-sky-500" />
                        {localText.disciplines[language] || localText.disciplines['en']}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {schoolDetailsExtended[selectedSchool.id]?.courses.map((course: string, cIdx: number) => (
                          <span key={cIdx} className="bg-sky-50 border border-sky-100 text-sky-600 font-bold text-xs px-3 py-1 rounded-full">
                            {getTranslatedCourse(course)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-4 bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-4 text-left" id="modal-sidebar-card">
                    <div className="flex items-center gap-1 text-slate-700">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-black text-slate-800">{selectedSchool.rating}</span>
                      <span className="text-xs text-slate-400 font-semibold">(40 Ratings)</span>
                    </div>

                    <div className="space-y-2.5 text-xs text-slate-500 border-t border-slate-200/60 pt-3">
                      <div className="flex items-start gap-2">
                        <Phone className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        <span className="font-semibold">{schoolDetailsExtended[selectedSchool.id]?.phone}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Mail className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        <span className="font-semibold truncate">{schoolDetailsExtended[selectedSchool.id]?.email}</span>
                      </div>
                      <div className="flex items-start gap-2 mb-2">
                        <Clock className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        <span className="font-semibold">{schoolDetailsExtended[selectedSchool.id]?.schedule}</span>
                      </div>
                    </div>

                    {/* Instant Booking simulation inside Dojo detailed popup */}
                    <button
                      onClick={() => {
                        setBookingSuccess(true);
                      }}
                      className="w-full text-center py-2.5 bg-[#0092ff] text-white hover:bg-[#007cd7] text-xs font-black rounded-xl transition-all cursor-pointer shadow-xs"
                    >
                      {localText.book_free[language] || localText.book_free['en']}
                    </button>
                  </div>

                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
