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
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0870E2]/20 flex items-center justify-center">
                <span className="text-[#0870E2] text-lg">👤</span>
              </div>
              <h3 className="text-xl font-extrabold text-white uppercase tracking-wide">For Members</h3>
            </div>
            <ul className="space-y-4">
              {FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-300 group">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 group-hover:bg-[#0870E2]/20 flex items-center justify-center shrink-0 transition-colors">
                    <f.icon className="w-4 h-4 text-[#0870E2]" />
                  </div>
                  <span className="text-sm font-semibold leading-relaxed pt-1">{f.text}</span>
                </li>
              ))}
            </ul>
            <button className="text-xs font-black text-[#0870E2] hover:text-sky-300 transition-colors cursor-pointer">
              + Many other great features!
            </button>
          </div>

          {/* For Academies */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <span className="text-cyan-400 text-lg">🏫</span>
              </div>
              <h3 className="text-xl font-extrabold text-white uppercase tracking-wide">For Academies</h3>
            </div>
            <ul className="space-y-4">
              {FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-300 group">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 group-hover:bg-cyan-500/20 flex items-center justify-center shrink-0 transition-colors">
                    <f.icon className="w-4 h-4 text-cyan-400" />
                  </div>
                  <span className="text-sm font-semibold leading-relaxed pt-1">{f.text}</span>
                </li>
              ))}
            </ul>
            <button className="text-xs font-black text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer">
              + Many other great features!
            </button>
          </div>

        </div>
      </div>
    </section>
  )
}
