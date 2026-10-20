import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { CityChooser } from '../components/CityChooser'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { DateStrip } from '../components/DateStrip'
import { EventCalendarPicker, eventDateKey } from '../components/EventCalendarPicker'
import { EventCard, getParticipantAvatars } from '../components/EventCard'
import { FilterChips } from '../components/FilterChips'
import { PageHeader } from '../components/PageHeader'
import { getEventParticipants, getPublishedEvents, getUserParticipation } from '../data/selectors'
import { sameDay } from '../lib/format'
import type { Event } from '../data/types'

function buildWeek(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}

function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return start
}

function matchesCatalogFilters(
  event: Event,
  sportId: string,
  eventType: Event['eventType'] | undefined,
  district: string,
): boolean {
  if (sportId && event.sportId !== sportId) return false
  if (eventType && event.eventType !== eventType) return false
  if (district === 'left') return event.district?.toLowerCase().includes('левый') ?? false
  if (district === 'right') return event.district?.toLowerCase().includes('правый') ?? false
  return true
}

export function EventsCatalogPage() {
  const { state, refresh, currentUser } = useAppData()
  const [searchParams] = useSearchParams()
  const requestedSportId = searchParams.get('sport') ?? ''
  const requestedType = searchParams.get('type') as Event['eventType'] | null
  const sport = state.sports.find((item) => item.id === requestedSportId)
  const type = requestedType === 'game' || requestedType === 'training' || requestedType === 'tournament' ? requestedType : undefined
  const [district, setDistrict] = useState('all')
  const [selected, setSelected] = useState(() => new Date())
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [calendarOpen, setCalendarOpen] = useState(false)

  useEffect(() => {
    void refresh()
  }, [refresh])

  const days = useMemo(() => buildWeek(weekStart), [weekStart])
  const markedDays = useMemo(() => {
    const keys = new Set<string>()
    getPublishedEvents(state)
      .filter((event) => matchesCatalogFilters(event, requestedSportId, type, district))
      .forEach((event) => keys.add(eventDateKey(event.startsAt)))
    return keys
  }, [state, requestedSportId, type, district])
  const moveWeek = (delta: number) => {
    const next = new Date(weekStart)
    next.setDate(next.getDate() + delta * 7)
    setWeekStart(next)
    setSelected(next)
  }

  const pickDate = (date: Date) => {
    setSelected(date)
    setWeekStart(startOfWeek(date))
  }

  const events = useMemo(
    () =>
      getPublishedEvents(state)
        .filter((event) => matchesCatalogFilters(event, requestedSportId, type, district))
        .filter((event) => sameDay(new Date(event.startsAt), selected))
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [state, requestedSportId, type, district, selected],
  )
  const contextTitle = [sport?.name, type === 'game' ? 'игры' : type === 'training' ? 'тренировки' : type === 'tournament' ? 'турниры' : 'мероприятия'].filter(Boolean).join(' · ')
  const createTo = `${type === 'tournament' ? '/create-event?type=tournament' : '/create-event'}${requestedSportId ? `${type === 'tournament' ? '&' : '?'}sport=${encodeURIComponent(requestedSportId)}` : ''}`

  return (
    <div className="page-frame">
      <PageHeader title={sport ? sport.name : 'События'} back right={<CityChooser />} />
      <p className="-mt-2 mb-5 text-sm text-muted">{contextTitle ? `${contextTitle}: выберите дату и район` : 'Выберите дату и район, чтобы найти игру'}</p>

      <FilterChips
        items={[
          { id: 'all', label: 'Все районы' },
          { id: 'left', label: 'Левый берег' },
          { id: 'right', label: 'Правый берег' },
        ]}
        activeId={district}
        onChange={setDistrict}
        variant="dark"
      />

      <section className="mt-5 rounded-[1.35rem] border border-white/[0.08] bg-card px-3 py-3 sm:px-4">
        <div className="mb-3 flex items-center justify-between gap-2 px-1">
          <button type="button" onClick={() => moveWeek(-1)} className="flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-muted transition-colors hover:bg-white/[0.06] hover:text-white">
            <ChevronLeft size={17} /> Неделя назад
          </button>
          <button
            type="button"
            onClick={() => setCalendarOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
          >
            <CalendarDays size={17} /> Календарь
          </button>
          <button type="button" onClick={() => moveWeek(1)} className="flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/10">
            Вперёд <ChevronRight size={17} />
          </button>
        </div>
        <DateStrip days={days} selected={selected} markedDays={markedDays} onSelect={pickDate} />
      </section>
      <EventCalendarPicker
        open={calendarOpen}
        selected={selected}
        markedDays={markedDays}
        onClose={() => setCalendarOpen(false)}
        onSelect={pickDate}
      />

      <section className="mt-7">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold tracking-[-0.025em]">На выбранную дату</h2>
          <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-muted">{events.length}</span>
        </div>
        <div className="grid grid-cols-1 gap-4 min-[720px]:grid-cols-2">
          {events.length === 0 && <div className="rounded-[1.35rem] border border-dashed border-white/15 px-5 py-10 text-center text-sm leading-relaxed text-muted">На выбранную дату мероприятий нет. Попробуйте другой день или район.</div>}
          {events.map((event) => {
            const participants = getEventParticipants(state, event.id)
            const eventSport = state.sports.find((item) => item.id === event.sportId)
            return (
              <EventCard
                key={event.id}
                event={event}
                sport={eventSport}
                participantCount={event.confirmedCount ?? participants.length}
                participantAvatars={getParticipantAvatars(state.users, participants.map((participant) => participant.userId))}
                participationStatus={currentUser ? getUserParticipation(state, event.id, currentUser.id)?.status : undefined}
              />
            )
          })}
        </div>
      </section>

      <Link to={createTo} className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-dashed border-accent/55 text-sm font-bold text-accent transition-colors hover:bg-accent/10">
        <Plus size={18} /> {type === 'tournament' ? 'Создать турнир' : 'Добавить мероприятие'}
      </Link>
    </div>
  )
}
