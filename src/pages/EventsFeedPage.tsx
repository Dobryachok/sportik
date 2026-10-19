import { ChevronDown, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useAppData } from '../app/AppDataContext'
import { FilterChips } from '../components/FilterChips'

const feedFilters = [
  { id: 'today', label: 'Сегодня' },
  { id: 'tomorrow', label: 'Завтра' },
  { id: 'week', label: 'Текущая неделя' },
  { id: 'next', label: 'Следующая неделя' },
  { id: 'weekend', label: 'Выходные' },
  { id: 'fav', label: 'Избранные' },
  { id: 'friends', label: 'События друзей' },
  { id: 'mine', label: 'Мои события' },
]

const categoryTabs = [
  { id: 'all', label: 'Все' },
  { id: 'promo', label: 'Спецпредложения' },
  { id: 'subs', label: 'Мои подписки' },
  { id: 'team', label: 'Командные…' },
]

export function EventsFeedPage() {
  const { state } = useAppData()
  const [filter, setFilter] = useState('today')
  const [cat, setCat] = useState('all')

  const volleyball = state.sports.find((s) => s.slug === 'volleyball')
  const promos = state.sports.find((s) => s.slug === 'football')

  return (
    <div className="min-w-0 max-w-full">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">События</h1>
        <button
          type="button"
          className="flex shrink-0 items-center gap-1 text-sm text-accent"
          aria-label="Город"
        >
          <MapPin size={18} />
          {state.city}
          <ChevronDown size={16} />
        </button>
      </div>

      <FilterChips items={feedFilters} activeId={filter} onChange={setFilter} />

      <section className="mt-6">
        <h2 className="mb-3 text-xl font-bold">Категории</h2>
        <FilterChips items={categoryTabs} activeId={cat} onChange={setCat} variant="dark" />
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
          <Link
            to="/events"
            className="rounded-2xl bg-card p-3 transition hover:bg-card-elevated"
          >
            <div className="mb-3 flex h-24 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500/30 to-orange-500/20 text-3xl">
              🎁
            </div>
            <div className="font-semibold">Акции</div>
            <div className="text-sm text-muted">8 событий</div>
          </Link>
          <Link
            to="/sport/volleyball"
            className="rounded-2xl bg-card p-3 transition hover:bg-card-elevated"
          >
            <div className="mb-3 flex h-24 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/30 to-blue-600/20 text-3xl">
              🏐
            </div>
            <div className="font-semibold">Волейбол</div>
            <div className="text-sm text-muted">{volleyball?.eventCount ?? 0} событий</div>
          </Link>
          <Link
            to="/events"
            className="rounded-2xl bg-card p-3 transition hover:bg-card-elevated"
          >
            <div className="mb-3 flex h-24 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-3xl">
              ⚽
            </div>
            <div className="font-semibold">Футбол</div>
            <div className="text-sm text-muted">{promos?.eventCount ?? 0} событий</div>
          </Link>
        </div>
      </section>

      <div className="mt-6">
        <Link to="/events" className="text-accent text-sm font-medium">
          Смотреть каталог игр →
        </Link>
      </div>
    </div>
  )
}
