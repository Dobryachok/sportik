import { CalendarDays } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Event } from '../data/types'
import { fetchEvent } from '../data/api'
import { useAppData } from '../app/AppDataContext'
import { EventCard, getParticipantAvatars } from '../components/EventCard'
import { FilterChips } from '../components/FilterChips'
import { PageHeader } from '../components/PageHeader'
import { getEventParticipants, getUserParticipation } from '../data/selectors'
import { isPast } from '../lib/format'

const tabs = [
  { id: 'upcoming', label: 'Предстоящие' },
  { id: 'past', label: 'Прошедшие' },
  { id: 'favorites', label: 'Избранные' },
]

export function MyEventsPage() {
  const { state, currentUser } = useAppData()
  const [tab, setTab] = useState('upcoming')
  const [extraEvents, setExtraEvents] = useState<Record<string, Event>>({})
  const favoriteLoadAttempted = useRef(new Set<string>())
  const userId = currentUser?.id
  const favoriteIds = state.favorites ?? []
  const favoriteIdsKey = favoriteIds.join(',')

  useEffect(() => {
    favoriteLoadAttempted.current = new Set()
  }, [favoriteIdsKey])

  useEffect(() => {
    if (tab !== 'favorites' || !userId) {
      setExtraEvents({})
      return
    }
    const known = new Set(state.events.map((event) => event.id))
    const missing = favoriteIds.filter((id) => !known.has(id) && !favoriteLoadAttempted.current.has(id))
    if (!missing.length) return
    for (const id of missing) favoriteLoadAttempted.current.add(id)
    let cancelled = false
    void Promise.all(
      missing.map(async (id) => {
        try {
          return await fetchEvent(id)
        } catch {
          return null
        }
      }),
    ).then((loaded) => {
      if (cancelled) return
      const next: Record<string, Event> = {}
      for (const event of loaded) {
        if (event?.id) next[event.id] = event
      }
      if (Object.keys(next).length) {
        setExtraEvents((prev) => ({ ...prev, ...next }))
      }
    })
    return () => {
      cancelled = true
    }
  }, [tab, userId, favoriteIdsKey, state.events, favoriteIds])

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
    const publishedById = new Map(
      [...state.events, ...Object.values(extraEvents)]
        .filter((event) => event.status === 'published')
        .map((event) => [event.id, event]),
    )
    let list = [...publishedById.values()]
    if (tab === 'favorites') {
      list = favoriteIds
        .map((id) => publishedById.get(id))
        .filter((event): event is NonNullable<typeof event> => Boolean(event))
    } else if (tab === 'past') {
      list = list.filter((event) => myEventIds.has(event.id) && isPast(event.startsAt))
    } else {
      list = list.filter((event) => myEventIds.has(event.id) && !isPast(event.startsAt))
    }
    if (tab === 'favorites') return list
    return list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
  }, [state, tab, myEventIds, favoriteIds, extraEvents])

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
        <div className="grid grid-cols-1 gap-4 min-[720px]:grid-cols-2">
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
                participationStatus={userId ? getUserParticipation(state, event.id, userId)?.status : undefined}
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
