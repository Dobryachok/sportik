import { Link, useParams } from 'react-router-dom'
import { CirclePlus, Trophy } from 'lucide-react'
import { useAppData } from '../app/AppDataContext'
import { CityChooser } from '../components/CityChooser'
import { PageHeader } from '../components/PageHeader'
import { getPublishedEvents } from '../data/selectors'

export function SportHubPage() {
  const { slug } = useParams()
  const { state } = useAppData()
  const sport = state.sports.find((item) => item.slug === slug)
  const published = getPublishedEvents(state).filter((event) => event.sportId === sport?.id)
  const games = published.filter((event) => event.eventType === 'game')
  const trainings = published.filter((event) => event.eventType === 'training')
  const tournaments = published.filter((event) => event.eventType === 'tournament')
  const title = sport?.name ?? 'Спорт'
  const sportQuery = sport ? `sport=${encodeURIComponent(sport.id)}` : ''
  const createTo = sport ? `/create-event?${sportQuery}` : '/create-event'

  const actionCards = [
    { icon: CirclePlus, label: 'Добавить событие', color: 'text-amber-400', to: createTo },
    { icon: Trophy, label: 'Создать турнир', color: 'text-warning', to: sport ? `/create-event?${sportQuery}&type=tournament` : '/create-event?type=tournament' },
  ]
  const categories = [
    { id: 'game', label: 'Игры', count: games.length, icon: '🏐' },
    { id: 'training', label: 'Тренировки с тренером', count: trainings.length, icon: '📣' },
    { id: 'tournament', label: 'Турниры', count: tournaments.length, icon: '🏆' },
  ]

  return (
    <div className="page-frame">
      <PageHeader title={title} back right={<CityChooser />} />

      <div className="grid grid-cols-2 gap-3">
        {actionCards.map((card) => {
          const Icon = card.icon
          return (
            <Link key={card.label} to={card.to} className="flex min-w-0 flex-col items-center gap-2 rounded-2xl bg-white p-4 text-black">
              <Icon className={card.color} size={28} />
              <span className="text-center text-xs font-medium leading-tight">{card.label}</span>
            </Link>
          )
        })}
      </div>

      <div className="mt-8 flex min-w-0 items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">Мероприятия</h2>
        <Link to={sport ? `/events?${sportQuery}` : '/events'} className="shrink-0 text-sm text-accent">Смотреть все ›</Link>
      </div>

      <ul className="mt-4 divide-y divide-white/10 rounded-2xl bg-card">
        {categories.map((row) => (
          <li key={row.id}>
            <Link to={sport ? `/events?${sportQuery}&type=${row.id}` : `/events?type=${row.id}`} className="flex min-w-0 items-center gap-3 px-4 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg">{row.icon}</span>
              <span className="min-w-0 flex-1 break-words font-medium">{row.label}</span>
              <span className="shrink-0 rounded-full bg-accent/20 px-3 py-1 text-sm text-accent">{row.count}</span>
              <span className="shrink-0 text-muted">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
