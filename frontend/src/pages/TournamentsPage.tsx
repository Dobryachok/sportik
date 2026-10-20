import { Plus, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { CityChooser } from '../components/CityChooser'
import { EventCard, getParticipantAvatars } from '../components/EventCard'
import { PageHeader } from '../components/PageHeader'
import { getEventParticipants, getPublishedEvents } from '../data/selectors'

export function TournamentsPage() {
  const { state } = useAppData()
  const tournaments = getPublishedEvents(state)
    .filter((event) => event.eventType === 'tournament')
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime())

  return (
    <div className="page-frame">
      <PageHeader title="Турниры" back right={<CityChooser />} />
      <section className="mb-7 rounded-[1.35rem] border border-warning/25 bg-gradient-to-br from-warning/15 to-transparent px-5 py-5">
        <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning text-bg"><Trophy size={22} /></div><div><h1 className="text-xl font-bold text-white">Соревнуйтесь в своём виде спорта</h1><p className="mt-1 text-sm leading-5 text-muted">При публикации турнира спортсмены с опытом в этой специализации получают приглашение.</p></div></div>
      </section>
      <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-xl font-bold">Ближайшие турниры</h2><span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-muted">{tournaments.length}</span></div>
      <div className="grid grid-cols-1 gap-4 min-[720px]:grid-cols-2">
        {tournaments.length === 0 ? <div className="rounded-[1.35rem] border border-dashed border-white/15 px-5 py-10 text-center text-sm leading-relaxed text-muted">В этом городе пока нет турниров. Создайте первый.</div> : tournaments.map((event) => {
          const participants = getEventParticipants(state, event.id)
          return <EventCard key={event.id} event={event} sport={state.sports.find((sport) => sport.id === event.sportId)} participantCount={event.confirmedCount ?? participants.length} participantAvatars={getParticipantAvatars(state.users, participants.map((participant) => participant.userId))} />
        })}
      </div>
      <Link to="/create-event?type=tournament" className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(0,174,239,0.22)] transition-colors hover:bg-accent-hover"><Plus size={18} /> Создать турнир</Link>
    </div>
  )
}
