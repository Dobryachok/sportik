import { MapPin, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { DateStrip } from '../components/DateStrip'
import { EventCard, getParticipantAvatars } from '../components/EventCard'
import { FilterChips } from '../components/FilterChips'
import { PageHeader } from '../components/PageHeader'
import { getEventParticipants, getPublishedEvents } from '../data/repository'
import { sameDay } from '../lib/format'

function buildWeek(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

export function EventsCatalogPage() {
  const { state } = useAppData()
  const [district, setDistrict] = useState('left')
  const [selected, setSelected] = useState(new Date('2026-10-19'))

  const days = useMemo(() => buildWeek(new Date('2026-10-19')), [])

  const events = useMemo(() => {
    return getPublishedEvents(state)
      .filter((e) => e.sportId === 'sp-vb' || e.eventType === 'game')
      .filter((e) => {
        if (district === 'left') return e.district?.includes('левый') ?? true
        return e.district?.includes('правый') ?? false
      })
      .filter((e) => sameDay(new Date(e.startsAt), selected))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
  }, [state, district, selected])

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader title="События" back />

      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <button type="button" className="flex items-center gap-2 text-muted">
          <SlidersHorizontal size={18} />
          Фильтр
        </button>
        <button type="button" className="rounded-full bg-card px-3 py-1.5">
          Игры ▾
        </button>
        <MapPin size={20} className="text-accent" />
      </div>

      <FilterChips
        items={[
          { id: 'left', label: 'левый берег' },
          { id: 'right', label: 'Правый берег' },
        ]}
        activeId={district}
        onChange={setDistrict}
        variant="dark"
      />

      <div className="mt-4">
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
              participantCount={parts.length}
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
