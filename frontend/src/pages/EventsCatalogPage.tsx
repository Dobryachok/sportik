import { CityChooser } from '../components/CityChooser'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { DateStrip } from '../components/DateStrip'
import { EventCard, getParticipantAvatars } from '../components/EventCard'
import { FilterChips } from '../components/FilterChips'
import { PageHeader } from '../components/PageHeader'
import { getEventParticipants, getPublishedEvents } from '../data/selectors'
import { sameDay } from '../lib/format'

function buildWeek(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return start
}

export function EventsCatalogPage() {
  const { state } = useAppData()
  const [district, setDistrict] = useState('all')
  const [selected, setSelected] = useState(() => new Date())
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))

  const days = useMemo(() => buildWeek(weekStart), [weekStart])
  const moveWeek = (delta: number) => {
    const next = new Date(weekStart)
    next.setDate(next.getDate() + delta * 7)
    setWeekStart(next)
    setSelected(next)
  }

  const events = useMemo(() => {
    return getPublishedEvents(state)
      .filter((e) => {
        if (district === 'all') return true
        if (district === 'left') return e.district?.includes('левый') ?? false
        return e.district?.includes('правый') ?? false
      })
      .filter((e) => sameDay(new Date(e.startsAt), selected))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
  }, [state, district, selected])

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader title="События" back />
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-sm text-muted">Город</span>
        <CityChooser />
      </div>

      <FilterChips
        items={[
          { id: 'all', label: 'Все районы' },
          { id: 'left', label: 'левый берег' },
          { id: 'right', label: 'Правый берег' },
        ]}
        activeId={district}
        onChange={setDistrict}
        variant="dark"
      />

      <div className="mt-4">
        <div className="mb-2 flex justify-between text-sm text-accent">
          <button type="button" onClick={() => moveWeek(-1)}>← Предыдущая неделя</button>
          <button type="button" onClick={() => moveWeek(1)}>Следующая неделя →</button>
        </div>
        <DateStrip days={days} selected={selected} onSelect={setSelected} />
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {events.length === 0 && (
          <p className="text-center text-muted py-8">На выбранную дату событий нет</p>
        )}
        {events.map((event) => {
          const parts = getEventParticipants(state, event.id)
          const sport = state.sports.find((s) => s.id === event.sportId)
          return (
            <EventCard
              key={event.id}
              event={event}
              sport={sport}
              participantCount={event.confirmedCount ?? parts.length}
              participantAvatars={getParticipantAvatars(
                state.users,
                parts.map((p) => p.userId),
              )}
            />
          )
        })}
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        <Link to="/create-event" className="text-accent">Добавить событие</Link>
      </p>
    </div>
  )
}
