import Link from 'next/link'
import Image from 'next/image'
import { Megaphone, Gauge, MessageSquare, Calendar, MapPin, Receipt, Music4 } from 'lucide-react'

const FEATURES = [
  { icon: Megaphone,      text: 'Send promotional messages to customers & members of your club' },
  { icon: Gauge,          text: 'Tracking member progress & attendance' },
  { icon: MessageSquare,  text: 'Communicate directly with members' },
  { icon: Calendar,       text: 'Set class schedules and events' },
  { icon: MapPin,         text: 'Show addresses & directions' },
  { icon: Receipt,        text: 'Bill membership fees' },
  { icon: Music4,         text: 'Links to news, music, podcast & other' },
]

export default function MembersAndAcademies() {
  return (
    <section className="bg-slate-900 py-20 sm:py-28 border-t border-slate-800" id="features">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-12">

          {/* For Members */}
          <div className="relative overflow-hidden rounded-3xl p-8 sm:p-10 space-y-6 min-h-[560px] flex flex-col">
            <Image src="/for-members.png" alt="" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0E3A7A]/85 via-[#0a2d5e]/80 to-[#041833]/95" />

            <div className="relative flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0870E2]/30 backdrop-blur-sm flex items-center justify-center">
                <span className="text-[#7DE7EC] text-lg">👤</span>
              </div>
              <h3 className="text-xl font-extrabold text-white uppercase tracking-wide">For Members</h3>
            </div>
            <ul className="relative space-y-4">
              {FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-3 text-white/90 group">
                  <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm group-hover:bg-[#0870E2]/40 flex items-center justify-center shrink-0 transition-colors">
                    <f.icon className="w-4 h-4 text-[#7DE7EC]" />
                  </div>
                  <span className="text-sm font-semibold leading-relaxed pt-1">{f.text}</span>
                </li>
              ))}
            </ul>
            <button className="relative text-left text-xs font-black text-[#7DE7EC] hover:text-white transition-colors cursor-pointer">
              + Many other great features!
            </button>
          </div>

          {/* For Academies */}
          <div className="relative overflow-hidden rounded-3xl p-8 sm:p-10 space-y-6 min-h-[560px] flex flex-col">
            <Image src="/for-academies.png" alt="" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0E3A7A]/85 via-[#0a2d5e]/80 to-[#041833]/95" />

            <div className="relative flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/30 backdrop-blur-sm flex items-center justify-center">
                <span className="text-cyan-300 text-lg">🏫</span>
              </div>
              <h3 className="text-xl font-extrabold text-white uppercase tracking-wide">For Academies</h3>
            </div>
            <ul className="relative space-y-4">
              {FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-3 text-white/90 group">
                  <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm group-hover:bg-cyan-500/40 flex items-center justify-center shrink-0 transition-colors">
                    <f.icon className="w-4 h-4 text-cyan-300" />
                  </div>
                  <span className="text-sm font-semibold leading-relaxed pt-1">{f.text}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className="relative inline-block text-xs font-black text-cyan-300 hover:text-white transition-colors"
            >
              Register your school →
            </Link>
          </div>

        </div>
      </div>
    </section>
  )
}
