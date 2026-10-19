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
}

export function EventCard({
  event,
  sport,
  participantAvatars,
  participantCount,
  showTimeline = true,
}: EventCardProps) {
  const { date, day, time } = formatEventDate(event.startsAt)
  const price = event.discountedPrice ?? event.price

  return (
    <div className="flex min-w-0 max-w-full gap-3">
      {showTimeline && (
        <div className="hidden w-16 shrink-0 pt-2 text-center text-xs text-muted md:block">
          <div>{date}</div>
          <div className="font-medium text-white">{day}</div>
          <div>{time}</div>
        </div>
      )}
      <Link
        to={`/events/${event.id}`}
        className="relative min-w-0 flex-1 overflow-hidden rounded-2xl bg-card p-4 transition hover:bg-card-elevated"
      >
        <span className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-accent-line" />
        <p className="mb-2 pl-2 text-xs text-muted md:hidden">
          {date} · {day} · {time}
        </p>
        <div className="mb-2 flex flex-wrap gap-2 pl-2">
          {sport && (
            <span className="rounded-full border border-accent/50 px-2 py-0.5 text-xs text-accent">
              {sport.name}
            </span>
          )}
          {event.district && (
            <span className="rounded-full border border-accent/50 px-2 py-0.5 text-xs text-accent">
              {event.district}
            </span>
          )}
        </div>
        <h3 className="mb-1 break-words pl-2 text-base font-semibold capitalize leading-snug">{event.title}</h3>
        <p className="mb-3 break-words pl-2 text-sm text-muted">{event.address}</p>
        <div className="mb-3 flex items-center gap-2 pl-2">
          <AvatarStack urls={participantAvatars} />
          <span className="text-sm text-muted">
            {participantCount} из {event.capacity} чел.
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-y-1 pl-2">
          <div className="flex items-baseline gap-2">
            {event.discountedPrice != null && (
              <span className="text-sm text-muted line-through decoration-warning">
                {event.price} ₽
              </span>
            )}
            <span className={`text-lg font-bold ${event.discountedPrice != null ? 'text-warning' : ''}`}>
              {price} ₽
            </span>
          </div>
          <StarRating value={event.rating} />
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
