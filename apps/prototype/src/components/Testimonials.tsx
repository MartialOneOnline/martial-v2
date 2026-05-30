/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Star, Quote, Award } from 'lucide-react';
import { TESTIMONIALS } from '../types';
import { useLanguage } from '../LanguageContext';

export default function Testimonials() {
  const { language } = useLanguage();

  const labels: Record<string, Record<string, string>> = {
    badge: { en: 'Success Stories', es: 'Casos de Éxito', pt: 'Histórias de Sucesso', fr: 'Témoignages de Réussite' },
    title: { en: 'What Our Happy Users Think', es: '¿Qué Opinan Nuestros Usuarios?', pt: 'O Que Dizem Nossos Usuários?', fr: 'Ce que pensent nos utilisateurs' },
    role_instructor: { en: 'Chief Instructor', es: 'Instructor Jefe', pt: 'Instrutor Chefe', fr: 'Instructeur Chef' },
    role_owner: { en: 'Academy Owner', es: 'Dueño de Academia', pt: 'Dono de Academia', fr: 'Directeur de Club' },
    school_apex: { en: 'Apex Martial Arts Academy', es: 'Academia de Artes Marciales Apex', pt: 'Academia de Artes Marciais Apex', fr: 'Académie d\'Arts Martiaux Apex' },
    school_haven: { en: 'Haven Jiu-Jitsu Club', es: 'Club de Jiu-Jitsu Haven', pt: 'Clube de Jiu-Jitsu Haven', fr: 'Club de Jiu-Jitsu Haven' },
    school_valor: { en: 'Valor Taekwondo Centre', es: 'Centro de Taekwondo Valor', pt: 'Centro de Taekwondo Valor', fr: 'Centre de Taekwondo Valor' },
    quote_1: {
      en: 'The digital portal completely automated our student memberships, billing procedures, and notifications. We are highly satisfied.',
      es: 'El portal digital automatizó por completo nuestras membrecías de alumnos, procedimientos de facturación y notificaciones automáticas.',
      pt: 'O portal digital automatizou totalmente nossas mensalidades de alunos, procedimentos de cobrança e notificações automáticas.',
      fr: 'Le portail digital a complètement automatisé nos adhésions de club, nos procédures de facturation et nos notifications.'
    },
    quote_2: {
      en: 'Perfect online system that completely automated our combat sports business and streamlined class attendance tracking.',
      es: 'Un sistema en línea perfecto que automatizó por completo nuestro negocio de deportes de combate y simplificó el control de asistencia.',
      pt: 'Um sistema online perfeito que automatizou totalmente nossas atividades esportivas e simplificou o controle de presença.',
      fr: 'Un système en ligne parfait qui a complètement automatisé notre club de sports de combat et simplifié le suivi d\'assiduité.'
    },
    quote_3: {
      en: 'Excellent features! The messaging system and schedule tracker have been game changers for our student re-enrollment rates.',
      es: '¡Funciones excelentes! El sistema de mensajería y el calendario han cambiado las reglas del juego para nuestras tasas de renovación.',
      pt: 'Excelentes recursos! O sistema de mensagens e o calendário foram divisores de águas para as nossas taxas de rematrícula.',
      fr: 'Des fonctionnalités exceptionnelles ! Le système de messagerie et de planning ont transformé nos taux de ré-inscription.'
    }
  };

  const getTranslatedQuote = (id: string) => {
    if (id === 't-1') return labels.quote_1[language] || labels.quote_1['en'];
    if (id === 't-2') return labels.quote_2[language] || labels.quote_2['en'];
    return labels.quote_3[language] || labels.quote_3['en'];
  };

  const getTranslatedRole = (role: string) => {
    if (role === 'Chief Instructor') return labels.role_instructor[language] || labels.role_instructor['en'];
    return labels.role_owner[language] || labels.role_owner['en'];
  };

  const getTranslatedSchool = (sch: string) => {
    if (sch.includes('Apex')) return labels.school_apex[language] || labels.school_apex['en'];
    if (sch.includes('Haven')) return labels.school_haven[language] || labels.school_haven['en'];
    return labels.school_valor[language] || labels.school_valor['en'];
  };

  return (
    <section className="bg-slate-50 py-20 border-t border-gray-100 text-left" id="testimonials-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title */}
        <div className="text-center max-w-3xl mx-auto mb-16" id="testimonials-header">
          <span className="text-xs font-black text-sky-500 uppercase tracking-widest block mb-1">
            {labels.badge[language] || labels.badge['en']}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
            {labels.title[language] || labels.title['en']}
          </h2>
        </div>

        {/* Testimonials cards layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="testimonials-grid">
          {TESTIMONIALS.map((testimonial, idx) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15 }}
              whileHover={{ y: -4 }}
              className="bg-white border border-gray-100 p-6 rounded-2xl shadow-xs hover:shadow-lg flex flex-col justify-between relative overflow-hidden group"
              id={`testimonial-card-${testimonial.id}`}
            >
              
              {/* Quote icon background decoration */}
              <div className="absolute right-4 top-4 text-slate-100 group-hover:text-sky-50 transition-colors pointer-events-none">
                <Quote className="w-12 h-12 rotate-180" />
              </div>

              <div className="space-y-4 text-left">
                {/* Stars and rating */}
                <div className="flex items-center gap-1.5 bg-sky-50 py-1.5 px-3 rounded-lg w-max" id="rating-badge">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-[11px] font-black text-sky-600">4.9 (40+)</span>
                </div>

                {/* Quote content */}
                <p className="text-slate-600 text-sm leading-relaxed font-semibold italic">
                  "{getTranslatedQuote(testimonial.id)}"
                </p>
              </div>

              {/* User bottom profile card details */}
              <div className="mt-8 pt-4 border-t border-gray-100 flex items-center gap-3 text-left">
                <div className="w-10 h-10 bg-gradient-to-br from-[#0092ff] to-cyan-500 rounded-full flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0">
                  {testimonial.name[0]}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 leading-tight">
                    {testimonial.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">
                    {getTranslatedRole(testimonial.role)} • {getTranslatedSchool(testimonial.schoolName)}
                  </p>
                </div>
              </div>

            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
