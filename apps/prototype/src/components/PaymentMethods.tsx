/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Landmark } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

export default function PaymentMethods() {
  const { language } = useLanguage();

  const dict: Record<string, Record<string, string>> = {
    title: {
      en: "Various Payment Methods",
      es: "Múltiples Métodos de Pago",
      pt: "Vários Métodos de Pagamento",
      fr: "Divers Moyens de Paiement"
    },
    subtitle: {
      en: "Fully Integrated Secure Checkout Pipelines",
      es: "Pasarelas de Pago Seguras Totalmente Integradas",
      pt: "Canais de Pagamento Inteiramente Seguros e Integrados",
      fr: "Système de Paiement Intégrés et Sécurisés"
    },
    direct_debit: {
      en: "Direct Debit",
      es: "Débito Directo",
      pt: "Débito Direto",
      fr: "Prélèvement"
    }
  };

  const paymentPartners = [
    {
      name: 'Stripe',
      logo: (
        <span className="text-xl font-black italic tracking-tight text-[#635bff] flex items-center gap-1 font-display">
          stripe
        </span>
      )
    },
    {
      name: 'PayPal',
      logo: (
        <span className="text-xl font-black italic tracking-tighter flex items-center gap-0.5">
          <span className="text-[#003087]">Pay</span>
          <span className="text-[#0079c1]">Pal</span>
        </span>
      )
    },
    {
      name: 'GOCARDLESS',
      logo: (
        <span className="text-[12px] font-black tracking-[0.2em] text-[#0c2440] uppercase">
          gocardless
        </span>
      )
    },
    {
      name: 'Direct Debit',
      logo: (
        <span className="flex items-center gap-1 text-[11px] font-black tracking-wider text-slate-800 uppercase border-2 border-slate-800 p-1 rounded-sm">
          <Landmark className="w-3.5 h-3.5" />
          <span>{dict.direct_debit[language] || dict.direct_debit.en}</span>
        </span>
      )
    },
    {
      name: 'VISA',
      logo: (
        <span className="text-xl font-black tracking-tight text-[#1a1f71] italic">
          VISA
        </span>
      )
    },
    {
      name: 'mastercard',
      logo: (
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-2">
            <span className="w-5 h-5 bg-[#eb001b] rounded-full opacity-90 block" />
            <span className="w-5 h-5 bg-[#ff5f00] rounded-full opacity-90 block" />
          </div>
          <span className="text-xs font-black text-slate-700 tracking-tight lowercase">
            mastercard
          </span>
        </div>
      )
    }
  ];

  return (
    <section className="bg-white py-14 sm:py-16 border-y border-gray-100" id="payment-methods-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Heading */}
        <div className="max-w-2xl mx-auto mb-10" id="payment-header">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight uppercase font-display">
            {dict.title[language]}
          </h2>
          <p className="text-xs text-slate-400 font-bold tracking-wider mt-2 uppercase">
            {dict.subtitle[language]}
          </p>
        </div>

        {/* Partners Banner Strip */}
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14" id="partners-logos-strip">
          {paymentPartners.map((partner, idx) => (
            <motion.div
              key={partner.name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.08 }}
              whileHover={{ scale: 1.05 }}
              className="px-6 py-3 bg-slate-50 border border-slate-100/80 rounded-xl flex items-center justify-center min-w-[120px] shadow-2xs hover:shadow-sm"
              id={`payment-partner-${partner.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {partner.logo}
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
