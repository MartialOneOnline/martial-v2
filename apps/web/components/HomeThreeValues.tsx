import { Compass, CalendarCheck, TrendingUp } from 'lucide-react'

const VALUES = [
  {
    icon: Compass,
    color: '#0870E2',
    bg: 'bg-sky-50',
    title: 'Discover',
    desc: 'Explore top martial arts schools, camps and events near you.',
  },
  {
    icon: CalendarCheck,
    color: '#0E3A7A',
    bg: 'bg-indigo-50',
    title: 'Book',
    desc: 'Book classes, trials, workshops and camps in just a few clicks.',
  },
  {
    icon: TrendingUp,
    color: '#7DE7EC',
    bg: 'bg-cyan-50',
    title: 'Grow',
    desc: 'Schools can manage students, bookings, income, leads and operations.',
  },
]

export default function HomeThreeValues() {
  return (
    <section className="bg-white py-16 sm:py-20 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {VALUES.map(v => (
            <div key={v.title} className="flex flex-col items-center text-center gap-4">
              <div className={`w-14 h-14 rounded-2xl ${v.bg} flex items-center justify-center`}>
                <v.icon className="w-7 h-7" style={{ color: v.color }} />
              </div>
              <h3 className="text-xl font-extrabold text-[#101828]">{v.title}</h3>
              <p className="text-[#667085] text-sm leading-relaxed max-w-xs">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
