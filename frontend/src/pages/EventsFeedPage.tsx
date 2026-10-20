import { ArrowUpRight, Plus, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { CityChooser } from '../components/CityChooser'
import { ThemeToggle } from '../components/ThemeToggle'

const sportTones = [
  'from-[#d8f3ff] to-[#f7fcff]',
  'from-[#e8f7d9] to-[#fbfff7]',
  'from-[#fff0cf] to-[#fffcf5]',
  'from-[#eee6ff] to-[#fcfaff]',
]

export function EventsFeedPage() {
  const { state, city, currentUser } = useAppData()

  return (
    <div className="page-frame pb-3">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[2rem] font-bold leading-none tracking-[-0.045em] text-white sm:text-4xl">События</h1>
        </div>
        <div className="flex items-center gap-2"><CityChooser /><span className="md:hidden"><ThemeToggle compact /></span></div>
      </header>

      {!city && (
        <div className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3.5 text-sm leading-relaxed text-white">
          Выберите город — покажем доступные виды спорта и мероприятия.
        </div>
      )}

      {currentUser && !currentUser.startCompleted && (
        <Link to="/tamagotchi" className="mt-5 flex items-center gap-3 rounded-2xl border border-accent/20 bg-card p-4 shadow-[0_8px_24px_rgba(9,104,157,0.08)] transition-colors hover:border-accent/45">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent"><Sparkles size={21} /></span>
          <span className="min-w-0 flex-1"><span className="block font-bold text-white">Ваш первый выход на площадку</span><span className="mt-0.5 block text-sm text-muted">Три шага до первой встречи</span></span>
          <ArrowUpRight size={19} className="shrink-0 text-accent" />
        </Link>
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
          <div className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2">
            {state.sports.map((sport, index) => (
              <Link
                key={sport.id}
                to={`/sport/${sport.slug}`}
                style={{ aspectRatio: '1 / 1' }}
                className={`group relative overflow-hidden rounded-[1.45rem] border border-white/[0.08] bg-gradient-to-br p-6 sm:p-8 ${
                  sport.backgroundImage ? 'sport-tile-photo' : sportTones[index % sportTones.length]
                }`}
              >
                {sport.backgroundImage && (
                  <>
                    <img src={sport.backgroundImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    <span className="absolute inset-0 bg-black/40" aria-hidden />
                  </>
                )}
                <div className="relative flex h-full flex-col justify-between">
                  <span
                    className={`sport-tile-title text-xl font-bold leading-tight sm:text-2xl ${
                      sport.backgroundImage ? 'text-white' : 'text-black'
                    }`}
                  >
                    {sport.name}
                  </span>
                  <span
                    className={`sport-tile-meta text-sm sm:text-base ${
                      sport.backgroundImage ? 'text-white/90' : 'text-black/65'
                    }`}
                  >
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
