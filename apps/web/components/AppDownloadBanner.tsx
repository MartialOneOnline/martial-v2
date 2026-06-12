import Image from 'next/image'
import { Download, Users, Navigation } from 'lucide-react'

export default function AppDownloadBanner() {
  return (
    <section className="bg-white py-20 sm:py-28 relative overflow-hidden border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden grid lg:grid-cols-12 gap-8 items-center">

          {/* Left image */}
          <div className="lg:col-span-5 h-[320px] lg:h-[450px] bg-slate-900 relative overflow-hidden">
            <Image src="/app-promo.jpg" alt="Martial App — available on iOS and Android" fill className="object-cover object-top opacity-85" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#041833] via-slate-950/20 to-transparent" />
            <div className="absolute bottom-6 left-6 text-white text-left space-y-1">
              <span className="text-[9px] font-black tracking-widest bg-[#0870E2] px-2.5 py-1 rounded-md uppercase">
                Pro Grade Solution
              </span>
              <h4 className="text-lg font-extrabold tracking-tight">Synchronized Combat Systems</h4>
              <p className="text-xs text-slate-300 font-semibold">Adopted by elite trainers across Europe &amp; US.</p>
            </div>
          </div>

          {/* Right content */}
          <div className="lg:col-span-7 p-6 sm:p-10 lg:pl-4 space-y-8 text-left">
            <div>
              <span className="text-xs font-black text-[#0870E2] uppercase tracking-widest block mb-1">
                Instant App Download
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#101828] leading-tight uppercase">
                <span className="text-[#0870E2] block sm:inline">Our platform</span> is available{' '}
                <br className="hidden sm:inline" />on any app store
              </h2>
              <p className="text-[#667085] text-sm mt-3 leading-relaxed max-w-lg font-semibold">
                Innovative Management Software for Martial Arts Academies and Business &amp; User Interaction Worldwide. Get the native app now to coordinate grades and pay subscriptions on the fly.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <a href="#" className="flex items-center gap-3 bg-slate-900 text-white px-5 py-2.5 rounded-lg border border-slate-800 hover:bg-slate-950 transition-colors shadow-sm">
                <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3.25 2.1c-.13 0-.25.04-.36.12l10.95 10.95 3.32-3.32L3.6 2.2c-.1-.08-.22-.1-.35-.1zM2.5 3v18c0 .24.1.48.28.66l10.33-10.33L2.78 2.34C2.6 2.52 2.5 2.76 2.5 3zm11.23 9.66l3.33 3.33 3.54-2.03c.5-.28.8-.8.8-1.38s-.3-1.1-.8-1.38l-3.54-2.03-3.33 3.33-.03.11v.05zm-.87-.87l-10.3 10.3c.11.08.23.1.36.1l13.56-7.78-3.62-3.62z" />
                </svg>
                <div className="text-left">
                  <p className="text-[8px] font-medium text-slate-400 uppercase tracking-wider leading-none">GET IT ON</p>
                  <p className="text-xs font-semibold tracking-wide leading-tight mt-0.5">Google Play</p>
                </div>
              </a>
              <a href="#" className="flex items-center gap-3 bg-slate-900 text-white px-5 py-2.5 rounded-lg border border-slate-800 hover:bg-slate-950 transition-colors shadow-sm">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.02-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.58 2.95-1.39z" />
                </svg>
                <div className="text-left">
                  <p className="text-[8px] font-medium text-slate-400 uppercase tracking-wider leading-none">Download on the</p>
                  <p className="text-xs font-semibold tracking-wide leading-tight mt-0.5">App Store</p>
                </div>
              </a>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-100 max-w-md">
              {[
                { value: '+23.6k', label: 'Members',   icon: <Users      className="w-3 h-3 text-[#0870E2]" /> },
                { value: '1000+',  label: 'Downloads',  icon: <Download   className="w-3 h-3 text-[#0870E2]" /> },
                { value: '25',     label: 'Cities',     icon: <Navigation className="w-3 h-3 text-[#0870E2]" /> },
              ].map(s => (
                <div key={s.label} className="space-y-1">
                  <span className="text-xl sm:text-2xl font-black text-[#101828] block">{s.value}</span>
                  <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase inline-flex items-center gap-1">
                    {s.icon}{s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
