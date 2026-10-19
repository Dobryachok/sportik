import { useMemo, useState } from 'react'
import { useAppData } from '../app/AppDataContext'
import { EventCard, getParticipantAvatars } from '../components/EventCard'
import { FilterChips } from '../components/FilterChips'
import { PageHeader } from '../components/PageHeader'
import { getEventParticipants } from '../data/repository'
import { isPast } from '../lib/format'

const tabs = [
  { id: 'upcoming', label: 'Предстоящие' },
  { id: 'past', label: 'Прошедшие' },
  { id: 'favorites', label: 'Избранные' },
]

export function MyEventsPage() {
  const { state, currentUser } = useAppData()
  const [tab, setTab] = useState('past')
  const userId = currentUser?.id

  const myEventIds = useMemo(() => {
    if (!userId) return new Set<string>()
    const joined = state.participations
      .filter((p) => p.userId === userId && p.status !== 'rejected')
      .map((p) => p.eventId)
    const organized = state.events
      .filter((e) => e.organizerUserId === userId)
      .map((e) => e.id)
    return new Set([...joined, ...organized])
  }, [state, userId])

  const events = useMemo(() => {
    let list = state.events.filter((e) => e.status === 'published')
    if (tab === 'favorites') {
      list = list.filter((e) => state.favorites.includes(e.id))
    } else if (tab === 'past') {
      list = list.filter((e) => myEventIds.has(e.id) && isPast(e.startsAt))
    } else {
      list = list.filter((e) => myEventIds.has(e.id) && !isPast(e.startsAt))
    }
    return list.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())
  }, [state, tab, myEventIds])

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader title="Мои события" />
      <FilterChips items={tabs} activeId={tab} onChange={setTab} variant="dark" />
      <div className="mt-6 flex flex-col gap-4">
        {events.map((event) => {
          const parts = getEventParticipants(state, event.id)
          const sport = state.sports.find((s) => s.id === event.sportId)
          return (
            <EventCard
              key={event.id}
              event={event}
              sport={sport}
              participantCount={parts.length}
              participantAvatars={getParticipantAvatars(
                state.users,
                parts.map((p) => p.userId),
              )}
            />
          )
        })}
        {events.length === 0 && (
          <p className="py-12 text-center text-muted">Здесь пока пусто</p>
        )}
      </div>
    </div>
  )
}
