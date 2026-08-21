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
    <section className="bg-slate-900 border-t border-slate-800" id="features">
      <div className="grid lg:grid-cols-2">

        {/* For Members */}
        <div className="relative overflow-hidden py-20 sm:py-28 px-8 sm:px-14 lg:px-16 min-h-[640px] flex flex-col">
          <Image src="/for-members.png" alt="" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0E3A7A]/55 via-[#0a2d5e]/45 to-[#041833]/85" />

          <div className="relative flex items-center gap-4 mb-10">
            <span className="w-px h-8 bg-[#7DE7EC] -rotate-[20deg]" />
            <h3 className="text-3xl sm:text-4xl font-bold text-white">For Members</h3>
          </div>
          <ul className="relative space-y-5">
            {FEATURES.map((f, i) => (
              <li key={i} className="flex items-center gap-4 text-white/90">
                <f.icon className="w-5 h-5 text-white/70 shrink-0" strokeWidth={1.75} />
                <span className="text-[15px] leading-relaxed">{f.text}</span>
              </li>
            ))}
          </ul>
          <button className="relative text-left mt-10 text-sm font-medium text-[#7DE7EC] hover:text-white transition-colors cursor-pointer">
            + Many other great features!
          </button>
        </div>

        {/* For Academies */}
        <div className="relative overflow-hidden py-20 sm:py-28 px-8 sm:px-14 lg:px-16 min-h-[640px] flex flex-col">
          <Image src="/for-academies.png" alt="" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0E3A7A]/55 via-[#0a2d5e]/45 to-[#041833]/85" />

          <div className="relative flex items-center gap-4 mb-10">
            <span className="w-px h-8 bg-[#7DE7EC] -rotate-[20deg]" />
            <h3 className="text-3xl sm:text-4xl font-bold text-white">For Academies</h3>
          </div>
          <ul className="relative space-y-5">
            {FEATURES.map((f, i) => (
              <li key={i} className="flex items-center gap-4 text-white/90">
                <f.icon className="w-5 h-5 text-white/70 shrink-0" strokeWidth={1.75} />
                <span className="text-[15px] leading-relaxed">{f.text}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/register"
            className="relative inline-block mt-10 text-sm font-medium text-[#7DE7EC] hover:text-white transition-colors"
          >
            Register your school →
          </Link>
        </div>

      </div>
    </section>
  )
}
