import { ArrowUpRight, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { CityChooser } from '../components/CityChooser'

const sportTones = [
  'from-[#164152] to-[#1c2930]',
  'from-[#3a2e19] to-[#25231e]',
  'from-[#202f48] to-[#21252b]',
  'from-[#423228] to-[#27272a]',
]

export function EventsFeedPage() {
  const { state, city } = useAppData()

  return (
    <div className="mx-auto min-w-0 max-w-full pb-3 md:max-w-5xl">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-medium text-muted">Найдите свою игру</p>
          <h1 className="text-[2rem] font-bold leading-none tracking-[-0.045em] text-white sm:text-4xl">События</h1>
        </div>
        <CityChooser />
      </header>

      {!city && (
        <div className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3.5 text-sm leading-relaxed text-white">
          Выберите город — покажем доступные виды спорта и мероприятия.
        </div>
      )}

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-[-0.025em]">Мероприятия</h2>
            <p className="mt-1 text-sm text-muted">Выберите вид спорта</p>
          </div>
          <Link to="/events" className="flex shrink-0 items-center gap-1 text-sm font-semibold text-accent">
            Все <ArrowUpRight size={16} />
          </Link>
        </div>
        {state.sports.length ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {state.sports.map((sport, index) => (
              <Link
                key={sport.id}
                to={`/sport/${sport.slug}`}
                className={`group relative min-h-32 overflow-hidden rounded-[1.3rem] border border-white/[0.08] bg-gradient-to-br p-4 ${sportTones[index % sportTones.length]}`}
              >
                <span className="absolute -right-3 -top-8 text-[6.75rem] font-bold leading-none text-white/[0.055]" aria-hidden>
                  {sport.name.slice(0, 1)}
                </span>
                <div className="relative flex h-full flex-col justify-between">
                  <span className="text-base font-bold leading-tight text-white">{sport.name}</span>
                  <span className="text-sm text-white/65">
                    {sport.eventCount ?? state.events.filter((event) => event.sportId === sport.id).length} мероприятий
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.3rem] border border-white/[0.08] bg-card p-5 text-sm leading-relaxed text-muted">
            В этом городе пока нет мероприятий. Создайте первое.
          </div>
        )}
      </section>

      <Link
        to="/create-event"
        className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-dashed border-accent/55 text-sm font-bold text-accent transition-colors hover:bg-accent/10"
      >
        <Plus size={18} /> Добавить мероприятие
      </Link>
    </div>
  )
}
