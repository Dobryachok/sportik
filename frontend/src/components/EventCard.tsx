import { Link } from 'react-router-dom'
import type { Event, Sport, User } from '../data/types'
import { formatEventDate } from '../lib/format'
import { AvatarStack } from './AvatarStack'
import { StarRating } from './StarRating'

interface EventCardProps {
  event: Event
  sport?: Sport
  participantAvatars: string[]
  participantCount: number
  showTimeline?: boolean
  scheduleTag?: 'upcoming' | 'past'
}

export function EventCard({
  event,
  sport,
  participantAvatars,
  participantCount,
  showTimeline = true,
  scheduleTag,
}: EventCardProps) {
  const { date, day, time } = formatEventDate(event.startsAt)

  return (
    <div className="flex min-w-0 max-w-full gap-3 sm:gap-4">
      {showTimeline && (
        <div className="hidden w-[4.5rem] shrink-0 pt-3 text-center md:block">
          <p className="text-[11px] font-medium text-muted">{date}</p>
          <p className="mt-0.5 text-sm font-bold text-white">{day}</p>
          <span className="mt-2 inline-flex rounded-md bg-white/7 px-2 py-1 text-[11px] font-medium text-white/80">
            {time}
          </span>
        </div>
      )}
      <Link
        to={`/events/${event.id}`}
        className="group relative min-w-0 flex-1 overflow-hidden rounded-[1.35rem] border border-black/10 bg-white px-4 py-4 shadow-[0_14px_28px_rgba(0,0,0,0.16)] transition-colors hover:bg-neutral-50 focus-visible:outline-none sm:px-5"
      >
        <span className="absolute bottom-4 left-0 top-4 w-1 rounded-r-full bg-accent-line" />
        <div className="pl-2.5">
          <div className="mb-3 flex items-start gap-2 md:hidden">
            <span className="rounded-lg bg-black/5 px-2 py-1 text-[11px] font-medium text-black/80">
              {date} · {day} · {time}
            </span>
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {sport && (
              <span className="rounded-full border border-accent/60 px-2.5 py-1 text-[11px] font-semibold text-accent">
                {sport.name}
              </span>
            )}
            {event.eventType === 'tournament' && <span className="rounded-full border border-warning/70 px-2.5 py-1 text-[11px] font-semibold text-warning">Турнир</span>}
            {scheduleTag === 'upcoming' && <span className="rounded-full border border-accent/50 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent">Скоро</span>}
            {scheduleTag === 'past' && <span className="rounded-full border border-black/20 bg-black/5 px-2.5 py-1 text-[11px] font-semibold text-black/60">Прошло</span>}
            {event.district && (
              <span className="rounded-full border border-black/15 px-2.5 py-1 text-[11px] font-medium text-black/70">
                {event.district}
              </span>
            )}
          </div>
          <h3 className="break-words text-[1.03rem] font-bold leading-snug tracking-[-0.015em] text-black group-hover:text-black">
            {event.title}
          </h3>
          <p className="mt-1.5 break-words text-sm leading-snug text-black/70">{event.address}</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <AvatarStack urls={participantAvatars} />
              <span className="truncate text-xs text-black/70">
                {participantCount} из {event.capacity} чел.
              </span>
            </div>
            <div className="hidden items-center md:flex">
              <StarRating value={event.level} />
            </div>
            <div className="md:hidden">
              <StarRating value={event.level} />
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}

export function getParticipantAvatars(users: User[], userIds: string[]): string[] {
  return userIds
    .map((id) => users.find((u) => u.id === id)?.avatarUrl)
    .filter(Boolean) as string[]
}
