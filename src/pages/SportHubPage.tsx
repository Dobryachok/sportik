import { Link, useParams } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { PageHeader } from '../components/PageHeader'
import { getPublishedEvents } from '../data/repository'
import { MessageCircle, ShieldAlert, Volleyball } from 'lucide-react'

export function SportHubPage() {
  const { slug } = useParams()
  const { state } = useAppData()
  const sport = state.sports.find((s) => s.slug === slug)
  const published = getPublishedEvents(state).filter((e) => e.sportId === sport?.id)
  const games = published.filter((e) => e.eventType !== 'training')
  const trainings = published.filter((e) => e.eventType === 'training')

  const title = sport?.name ?? 'Спорт'
  const discussionTo = published[0]?.id
    ? `/events/${published[0].id}/discussion`
    : '/events'

  const actionCards = [
    { icon: MessageCircle, label: 'Чат', shortLabel: 'Чат', color: 'text-emerald-400', to: discussionTo },
    { icon: Volleyball, label: 'Добавить событие', shortLabel: 'Добавить', color: 'text-amber-400', to: '/create-event' },
    { icon: ShieldAlert, label: 'Убрать пропуски', shortLabel: 'Пропуски', color: 'text-sky-400', to: '/profile' },
  ]

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader title={title} back />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {actionCards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.label}
              to={card.to}
              className="flex min-w-0 flex-col items-center gap-2 rounded-2xl bg-white p-4 text-black"
            >
              <Icon className={card.color} size={28} />
              <span className="text-center text-xs font-medium leading-tight sm:hidden">{card.shortLabel}</span>
              <span className="hidden text-center text-xs font-medium leading-tight sm:block">{card.label}</span>
            </Link>
          )
        })}
      </div>

      <div className="mt-8 flex min-w-0 items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">События</h2>
        <Link to="/events" className="shrink-0 text-sm text-accent">Смотреть все ›</Link>
      </div>

      <ul className="mt-4 divide-y divide-white/10 rounded-2xl bg-card">
        {[
          { label: 'Игры', count: games.length, icon: '🏐' },
          { label: 'Тренировки с тренером', count: trainings.length, icon: '📣' },
        ].map((row) => (
          <li key={row.label}>
            <Link
              to="/events"
              className="flex min-w-0 items-center gap-3 px-4 py-4"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg">
                {row.icon}
              </span>
              <span className="min-w-0 flex-1 break-words font-medium">{row.label}</span>
              <span className="shrink-0 rounded-full bg-accent/20 px-3 py-1 text-sm text-accent">
                {row.count}
              </span>
              <span className="shrink-0 text-muted">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
