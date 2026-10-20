import { CalendarDays } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAppData } from '../app/AppDataContext'
import { EventCard, getParticipantAvatars } from '../components/EventCard'
import { FilterChips } from '../components/FilterChips'
import { PageHeader } from '../components/PageHeader'
import { getEventParticipants } from '../data/selectors'
import { isPast } from '../lib/format'

const tabs = [
  { id: 'upcoming', label: 'Предстоящие' },
  { id: 'past', label: 'Прошедшие' },
  { id: 'favorites', label: 'Избранные' },
]

export function MyEventsPage() {
  const { state, currentUser } = useAppData()
  const [tab, setTab] = useState('upcoming')
  const userId = currentUser?.id

  const myEventIds = useMemo(() => {
    if (!userId) return new Set<string>()
    const joined = state.participations
      .filter((participation) => participation.userId === userId && participation.status !== 'rejected')
      .map((participation) => participation.eventId)
    const organized = state.events
      .filter((event) => event.organizerUserId === userId)
      .map((event) => event.id)
    return new Set([...joined, ...organized])
  }, [state, userId])

  const events = useMemo(() => {
    let list = state.events.filter((event) => event.status === 'published')
    if (tab === 'favorites') {
      list = list.filter((event) => state.favorites.includes(event.id))
    } else if (tab === 'past') {
      list = list.filter((event) => myEventIds.has(event.id) && isPast(event.startsAt))
    } else {
      list = list.filter((event) => myEventIds.has(event.id) && !isPast(event.startsAt))
    }
    return list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
  }, [state, tab, myEventIds])

  const emptyCopy = tab === 'favorites'
    ? 'Добавляйте интересные события в избранное — они появятся здесь.'
    : tab === 'past'
      ? 'Здесь появятся события, в которых вы уже участвовали.'
      : 'Вы ещё не записались ни на одно событие.'

  return (
    <div className="page-frame">
      <PageHeader title="Мои события" />
      <p className="-mt-2 mb-5 text-sm text-muted">Ваши записи, встречи и сохранённые планы</p>
      <FilterChips items={tabs} activeId={tab} onChange={setTab} variant="dark" />

      <section className="mt-7">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold tracking-[-0.025em]">
            {tab === 'favorites' ? 'Сохранённые' : tab === 'past' ? 'История событий' : 'Скоро'}
          </h2>
          {events.length > 0 && (
            <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-muted">{events.length}</span>
          )}
        </div>
        <div className="flex flex-col gap-3">
          {events.map((event) => {
            const participants = getEventParticipants(state, event.id)
            const sport = state.sports.find((item) => item.id === event.sportId)
            return (
              <EventCard
                key={event.id}
                event={event}
                sport={sport}
                participantCount={event.confirmedCount ?? participants.length}
                participantAvatars={getParticipantAvatars(state.users, participants.map((participant) => participant.userId))}
                scheduleTag={tab === 'favorites' ? (isPast(event.startsAt) ? 'past' : 'upcoming') : undefined}
              />
            )
          })}
          {events.length === 0 && (
            <div className="rounded-[1.35rem] border border-dashed border-white/15 px-6 py-10 text-center">
              <CalendarDays className="mx-auto text-accent" size={28} />
              <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted">{emptyCopy}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
