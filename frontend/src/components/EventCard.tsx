import { Link } from 'react-router-dom'
import type { Event, ParticipationStatus, Sport, User } from '../data/types'
import { formatEventDate, isPast } from '../lib/format'
import { AvatarStack } from './AvatarStack'
import { StarRating } from './StarRating'

interface EventCardProps {
  event: Event
  sport?: Sport
  participantAvatars: string[]
  participantCount: number
  showTimeline?: boolean
  scheduleTag?: 'upcoming' | 'past'
  participationStatus?: ParticipationStatus
}

export function EventCard({
  event,
  sport,
  participantAvatars,
  participantCount,
  showTimeline = true,
  scheduleTag,
  participationStatus,
}: EventCardProps) {
  const { date, day, time } = formatEventDate(event.startsAt)
  const resolvedScheduleTag = scheduleTag ?? (isPast(event.startsAt) ? 'past' : undefined)
  const coverImage = event.imageUrl?.trim() || ''

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
        className={`group relative min-w-0 flex-1 overflow-hidden rounded-[1.45rem] border border-black/10 shadow-[0_14px_28px_rgba(0,0,0,0.16)] transition-colors focus-visible:outline-none ${
          coverImage ? 'event-card-photo min-h-[11.5rem]' : 'bg-white px-4 py-4 hover:bg-neutral-50 sm:px-5'
        }`}
      >
        {coverImage ? (
          <>
            <img src={coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/25" aria-hidden />
          </>
        ) : (
          <span className="absolute bottom-4 left-0 top-4 w-1 rounded-r-full bg-accent-line" />
        )}
        <div className={coverImage ? 'relative flex h-full min-h-[11.5rem] flex-col justify-end p-5 sm:p-6' : 'pl-2.5'}>
          <div className="mb-3 flex items-start gap-2 md:hidden">
            <span
              className={`rounded-lg px-2 py-1 text-[11px] font-medium ${
                coverImage ? 'bg-black/35 text-white' : 'bg-black/5 text-black/80'
              }`}
            >
              {date} · {day} · {time}
            </span>
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {sport && (
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  coverImage ? 'border border-white/40 text-white' : 'border border-accent/60 text-accent'
                }`}
              >
                {sport.name}
              </span>
            )}
            {event.eventType === 'tournament' && (
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${coverImage ? 'border-warning/70 text-warning' : 'border-warning/70 text-warning'}`}>
                Турнир
              </span>
            )}
            {resolvedScheduleTag === 'upcoming' && (
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${coverImage ? 'border-white/40 text-white' : 'border-accent/50 bg-accent/10 text-accent'}`}>
                Скоро
              </span>
            )}
            {resolvedScheduleTag === 'past' && (
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${coverImage ? 'border-white/30 text-white/80' : 'border-black/20 bg-black/5 text-black/60'}`}>
                Прошло
              </span>
            )}
            {participationStatus === 'waitlist' && (
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${coverImage ? 'border-warning/70 text-warning' : 'border-warning/70 bg-warning/10 text-warning'}`}>
                Резерв
              </span>
            )}
            {event.district && (
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                  coverImage ? 'border-white/30 text-white/90' : 'border-black/15 text-black/70'
                }`}
              >
                {event.district}
              </span>
            )}
          </div>
          <h3
            className={`event-card-title break-words text-lg font-bold leading-snug tracking-[-0.015em] sm:text-xl ${
              coverImage ? 'text-white' : 'text-black group-hover:text-black'
            }`}
          >
            {event.title}
          </h3>
          <p className={`event-card-meta mt-1.5 break-words text-sm leading-snug ${coverImage ? 'text-white/90' : 'text-black/70'}`}>
            {event.address}
          </p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <AvatarStack urls={participantAvatars} />
              <span className={`event-card-meta truncate text-xs ${coverImage ? 'text-white/85' : 'text-black/70'}`}>
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
