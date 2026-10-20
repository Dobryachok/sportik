import { Building2, ChevronRight, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Event, User } from '../data/types'

interface EventOrganizerCardProps {
  event: Event
  organizer?: User
}

export function EventOrganizerCard({ event, organizer }: EventOrganizerCardProps) {
  const orgLink = event.organizationId ? `/organizations/${event.organizationId}` : null

  return (
    <div className="rounded-[1.35rem] border border-white/[0.08] bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Организатор</p>
      <div className="mt-3 flex items-center gap-3">
        <img
          src={organizer?.avatarUrl || '/images/hero.png'}
          alt=""
          className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white/10"
        />
        <div className="min-w-0 flex-1">
          {organizer ? (
            <Link to={`/users/${organizer.id}`} className="group flex items-center gap-1">
              <span className="truncate text-base font-bold text-white group-hover:text-accent">{organizer.name}</span>
              <ChevronRight size={16} className="shrink-0 text-muted group-hover:text-accent" />
            </Link>
          ) : (
            <p className="text-base font-bold text-white">Организатор события</p>
          )}
          {organizer?.city && <p className="truncate text-xs text-muted">{organizer.city}</p>}
        </div>
      </div>
      {orgLink && (
        <Link
          to={orgLink}
          className="mt-3 flex items-center gap-2 rounded-xl border border-accent/25 bg-accent/10 px-3 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/15"
        >
          <Building2 size={17} className="shrink-0" />
          <span className="min-w-0 truncate">{event.organizationName || 'Страница организации'}</span>
          <ChevronRight size={16} className="ml-auto shrink-0" />
        </Link>
      )}
      {!orgLink && organizer && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted">
          <UserRound size={14} /> Частное мероприятие от участника платформы
        </p>
      )}
    </div>
  )
}
