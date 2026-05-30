/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Users, Building2, Shield } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

export default function PartnersSection() {
  const { language } = useLanguage();

  const dict: Record<string, Record<string, string>> = {
    badge: {
      en: "Our Global Ecosystem",
      es: "Nuestro Ecosistema Global",
      pt: "Nosso Ecossistema Global",
      fr: "Notre Écosystème Global"
    },
    title_p1: {
      en: "More Than Mere Business Associates,",
      es: "Más que meros socios comerciales,",
      pt: "Mais do que parceiros comerciais,",
      fr: "Plus que de simples partenaires d'affaires,"
    },
    title_p2: {
      en: "Genuine Companions On This Journey",
      es: "Verdaderos Compañeros de Viaje",
      pt: "Verdadeiros Companheiros de Jornada",
      fr: "De Véritables Compagnons de Route"
    },
    desc: {
      en: "Martial App empowers academy owners with a simple user experience that frees up time for them to teach, retain current memberships, and find new students. Together, we are building a synchronized network of global dojos supporting the evolution of martial arts.",
      es: "Martial App brinda a los dueños de dojo una experiencia sencilla que les libera tiempo para enseñar, retener miembros y captar alumnos nuevos. Juntos construimos una red sincronizada de dojos.",
      pt: "O Martial App capacita donos de dojo com uma experiência simples que libera tempo para focar no tatame, reter alunos e captar matrículas. Juntos, criamos a maior rede de artes marciais.",
      fr: "Martial App apporte une grande simplicité aux gérants pour libérer du temps pour enseigner, fidéliser les adhérents et recruter. Ensemble, développons le réseau connecté des dojos."
    },
    members: {
      en: "Active Members",
      es: "Miembros Activos",
      pt: "Membros Ativos",
      fr: "Membres Actifs"
    },
    academies: {
      en: "Academies",
      es: "Academias",
      pt: "Academias",
      fr: "Académies"
    },
    martial_arts: {
      en: "Martial Arts",
      es: "Disciplinas",
      pt: "Disciplinas",
      fr: "Disciplines"
    }
  };

  const logoItems = [
    { id: 1, name: 'Roger Gracie Malaga', logo: '/logos/roger-gracie-malaga.png' },
    { id: 2, name: 'Gracie Barra', logo: '/logos/gracie-barra.png' },
    { id: 3, name: 'Alliance', logo: '/logos/alliance.png' },
    { id: 4, name: 'Atos', logo: '/logos/atos.png' },
    { id: 5, name: 'Checkmat', logo: '/logos/checkmat.png' },
    { id: 6, name: 'Carlson Gracie', logo: '/logos/carlson-gracie.png' },
    { id: 7, name: 'Nova União', logo: '/logos/nova-uniao.png' },
    { id: 8, name: 'Five Elements', logo: '/logos/five-elements.png' },
    { id: 9, name: '10th Planet', logo: '/logos/ten-planet.png' }
  ];

  return (
    <section className="bg-slate-50/50 py-20 relative overflow-hidden" id="learning">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center" id="partners-grid bg-transparent">
          
          <div className="lg:col-span-7 space-y-8 text-left" id="partners-text-container">
            <div>
              <span className="text-xs font-black text-sky-500 uppercase tracking-widest block mb-2">
                {dict.badge[language]}
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-4.5xl font-extrabold text-slate-900 leading-tight uppercase font-display">
                {dict.title_p1[language]} <br />
                <span className="text-[#0092ff]">{dict.title_p2[language]}</span>
              </h2>
            </div>

            <p className="text-slate-600 text-[14px] leading-relaxed max-w-xl font-semibold">
              {dict.desc[language]}
            </p>

            <div className="grid grid-cols-3 gap-4 xl:gap-6 pt-4 max-w-lg" id="partners-stats-row">
              <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-center">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">+23.6k</span>
                <span className="text-[10px] sm:text-xs text-slate-400 font-bold mt-1 inline-flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-sky-500" />
                  {dict.members[language]}
                </span>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-center">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">340</span>
                <span className="text-[10px] sm:text-xs text-slate-400 font-bold mt-1 inline-flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-sky-500" />
                  {dict.academies[language]}
                </span>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-center">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">25</span>
                <span className="text-[10px] sm:text-xs text-slate-400 font-bold mt-1 inline-flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-sky-500" />
                  {dict.martial_arts[language]}
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center lg:justify-end" id="partners-logos-container">
            <div className="grid grid-cols-3 gap-6 max-w-[360px]" id="partners-circle-badges">
              {logoItems.map((item) => (
                <motion.div
                  key={item.id}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-white flex items-center justify-center shadow-md border-4 border-white cursor-pointer"
                  whileHover={{ scale: 1.1, rotate: 8 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 12 }}
                  id={`partner-logo-${item.id}`}
                >
                  <img
                    src={item.logo}
                    alt={item.name}
                    className="w-full h-full object-contain p-3"
                  />
                </motion.div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}