import {
  CalendarPlus,
  Heart,
  Info,
  MapPin,
  Route,
  Share2,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { MobileActionBar } from '../components/MobileActionBar'
import { PrimaryButton } from '../components/PrimaryButton'
import { StarRating } from '../components/StarRating'
import {
  getEventParticipants,
  getUserParticipation,
} from '../data/repository'
import { formatEventDate } from '../lib/format'

export function EventDetailPage() {
  const { id } = useParams()
  const { state, currentUser, isAuthenticated, like, review, favorite } = useAppData()
  const event = state.events.find((e) => e.id === id)
  const sport = event ? state.sports.find((s) => s.id === event.sportId) : undefined
  const organizer = event ? state.users.find((u) => u.id === event.organizerUserId) : undefined

  if (!event) {
    return <p className="text-muted">Событие не найдено</p>
  }

  const unpublished = event.status !== 'published'
  const parts = getEventParticipants(state, event.id)
  const myPart = currentUser
    ? getUserParticipation(state, event.id, currentUser.id)
    : undefined
  const isOrganizer = currentUser != null && event.organizerUserId === currentUser.id
  const pending = state.participations.filter(
    (p) => p.eventId === event.id && p.status === 'pending',
  )
  const liked = state.likedEvents.includes(event.id)
  const { date, time } = formatEventDate(event.startsAt)

  const showMobileCta =
    isAuthenticated && !unpublished && (!myPart || myPart.status === 'pending')

  return (
    <div className="min-w-0 max-w-full pb-action-bar-only md:grid md:grid-cols-2 md:gap-8 md:items-start">
      <div>
        <div className="relative mb-4 overflow-hidden rounded-2xl md:sticky md:top-6">
          <img
            src={event.imageUrl ?? '/images/hero.png'}
            alt=""
            className="h-48 w-full object-cover md:h-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <Link
            to="/events"
            className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur"
          >
            ←
          </Link>
          <div className="absolute bottom-4 left-4 right-4 space-y-3">
            <div className="min-w-0">
              <p className="text-sm text-white/80">{date}</p>
              <span className="mt-1 inline-block rounded-md bg-warning px-2 py-0.5 text-sm font-semibold">
                {time}
              </span>
              <h1 className="mt-2 break-words text-xl font-bold capitalize leading-tight sm:text-2xl">
                {event.title}
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              {[Route, CalendarPlus, Share2].map((Icon, i) => (
                <button
                  key={i}
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-black/30 sm:h-9 sm:w-9"
                >
                  <Icon size={15} />
                </button>
              ))}
              <button
                type="button"
                onClick={() => like(event.id)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-black/30 sm:h-9 sm:w-9"
              >
                <Heart size={16} className={liked ? 'fill-warning text-warning' : ''} />
              </button>
            </div>
          </div>
        </div>

        {event.gallery && (
          <div className="mb-4 flex gap-2 md:mb-0">
            {event.gallery.map((src, i) => (
              <img key={i} src={src} alt="" className="h-20 w-28 rounded-xl object-cover" />
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-sm text-muted">
          {sport?.name} Кто Куда {event.city}
        </p>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted">
          <MapPin size={14} className="text-accent" />
          {event.address}
        </p>

        {unpublished && (
          <p className="mt-4 rounded-xl border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-warning">
            Мероприятие снято с публикации
          </p>
        )}

        <section className="mt-6">
          <h2 className="text-lg font-bold">О событии</h2>
          <p className="mt-2 break-words text-sm leading-relaxed text-white/90 whitespace-pre-line">
            {event.description}
          </p>
          <button type="button" className="mt-2 text-sm text-accent">Показать всё</button>
        </section>

        <div className="mt-6 divide-y divide-white/10 rounded-2xl bg-card">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-muted">Уровень</span>
            <div className="flex items-center gap-2">
              <StarRating value={event.level} max={5} />
              <Info size={16} className="text-accent" />
            </div>
          </div>
          {event.minAge && (
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-muted">Ограничения</span>
              <span>{event.minAge}+</span>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-muted">Запись</span>
            <span>{event.joinMode === 'open' ? 'Свободная' : 'По заявке'}</span>
          </div>
        </div>

        {myPart && (
          <p className="mt-4 text-sm text-accent">
            Ваш статус:{' '}
            {myPart.status === 'confirmed'
              ? 'Подтверждено'
              : myPart.status === 'pending'
                ? 'Ожидает решения'
                : 'Отклонено'}
          </p>
        )}

        {isOrganizer && pending.length > 0 && (
          <div className="mt-4 rounded-2xl bg-card p-4">
            <h3 className="font-semibold mb-2">Заявки</h3>
            <ul className="space-y-2">
              {pending.map((p) => {
                const u = state.users.find((x) => x.id === p.userId)
                return (
                  <li key={p.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-sm">
                    <span>{u?.name}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-accent"
                        onClick={() => review(p.id, 'confirmed')}
                      >
                        Принять
                      </button>
                      <button
                        type="button"
                        className="text-warning"
                        onClick={() => review(p.id, 'rejected')}
                      >
                        Отклонить
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {isOrganizer && (
          <p className="mt-2 text-sm text-muted">
            Участников: {parts.length} / {event.capacity}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 md:static md:mt-8">
          <Link to={`/events/${event.id}/discussion`}>
            <PrimaryButton variant="outline" fullWidth>
              Обсудить в чате
            </PrimaryButton>
          </Link>
          {!unpublished && !myPart && isAuthenticated && (
            <Link to={`/events/${event.id}/join`} className="hidden md:block">
              <PrimaryButton fullWidth>
                {event.joinMode === 'open' ? 'Участвовать в событии' : 'Подать заявку'}
              </PrimaryButton>
            </Link>
          )}
          {!unpublished && !isAuthenticated && (
            <Link to="/login" state={{ from: `/events/${event.id}/join` }} className="hidden md:block">
              <PrimaryButton fullWidth>Войти, чтобы участвовать</PrimaryButton>
            </Link>
          )}
          {!unpublished && myPart?.status === 'pending' && (
            <PrimaryButton fullWidth disabled className="hidden md:flex">
              Заявка отправлена
            </PrimaryButton>
          )}
          <button
            type="button"
            onClick={() => favorite(event.id)}
            className="text-center text-sm text-muted"
          >
            {state.favorites.includes(event.id) ? 'В избранном' : 'В избранное'}
          </button>
        </div>

        {organizer && (
          <p className="mt-4 text-sm text-muted">
            Организатор: <span className="text-white">{organizer.name}</span>
          </p>
        )}
      </div>

      {showMobileCta && (
        <MobileActionBar>
          {!myPart ? (
            <Link to={`/events/${event.id}/join`}>
              <PrimaryButton fullWidth>
                {event.joinMode === 'open' ? 'Участвовать в событии' : 'Подать заявку'}
              </PrimaryButton>
            </Link>
          ) : (
            <PrimaryButton fullWidth disabled>Заявка отправлена</PrimaryButton>
          )}
        </MobileActionBar>
      )}
      {!isAuthenticated && !unpublished && !myPart && (
        <MobileActionBar>
          <Link to="/login" state={{ from: `/events/${event.id}/join` }}>
            <PrimaryButton fullWidth>Войти, чтобы участвовать</PrimaryButton>
          </Link>
        </MobileActionBar>
      )}
    </div>
  )
}
