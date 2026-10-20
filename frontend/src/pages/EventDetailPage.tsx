import {
  ArrowLeft,
  CalendarPlus,
  Heart,
  Info,
  MapPin,
  Route,
  Share2,
} from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { fetchEvent, fetchEventParticipants, moderateEvent } from '../data/api'
import { useAppData } from '../app/AppDataContext'
import { EventJoinPanel } from '../components/EventJoinPanel'
import { EventAttendancePanel } from '../components/EventAttendancePanel'
import { EventPlayerRatingsPanel } from '../components/EventPlayerRatingsPanel'
import { EventOrganizerCard } from '../components/EventOrganizerCard'
import { MobileActionBar } from '../components/MobileActionBar'
import { PrimaryButton } from '../components/PrimaryButton'
import { StarRating } from '../components/StarRating'
import {
  getEventParticipants,
  getUserParticipation,
} from '../data/selectors'
import { formatEventDate, isPast } from '../lib/format'
import type { User } from '../data/types'

export function EventDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { state, currentUser, like, review, favorite, leave, refresh, setCity } = useAppData()
  const event = state.events.find((item) => item.id === id)
  const [lookup, setLookup] = useState<'loading' | 'missing'>('loading')
  const [participantProfiles, setParticipantProfiles] = useState<User[]>([])
  const [moderationError, setModerationError] = useState('')
  const [joinOpen, setJoinOpen] = useState(false)
  const requestedId = useRef<string | null>(null)

  useEffect(() => {
    if (!id || event || requestedId.current === id) return
    requestedId.current = id
    setLookup('loading')
    void fetchEvent(id)
      .then(async (item) => {
        if (!item.city || !(await setCity(item.city, false))) setLookup('missing')
      })
      .catch(() => setLookup('missing'))
  }, [id, event, setCity])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void fetchEventParticipants(id).then((users) => { if (!cancelled) setParticipantProfiles(users) }).catch(() => { if (!cancelled) setParticipantProfiles([]) })
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    const navState = location.state as { openJoin?: boolean } | null
    if (navState?.openJoin) {
      setJoinOpen(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location, navigate])

  const sport = event ? state.sports.find((item) => item.id === event.sportId) : undefined
  const organizer = event ? state.users.find((user) => user.id === event.organizerUserId) : undefined

  if (!event) {
    return <p className="pt-4 text-muted">{lookup === 'loading' ? 'Загружаем событие…' : 'Событие не найдено'}</p>
  }

  const unpublished = event.status !== 'published'
  const participants = getEventParticipants(state, event.id)
  const myPart = currentUser ? getUserParticipation(state, event.id, currentUser.id) : undefined
  const isOrganizer = currentUser != null && event.organizerUserId === currentUser.id
  const pending = state.participations.filter((item) => item.eventId === event.id && item.status === 'pending')
  const liked = state.likedEvents.includes(event.id)
  const { date, time } = formatEventDate(event.startsAt)
  const mapHref = event.latitude != null && event.longitude != null
    ? `https://yandex.ru/maps/?pt=${event.longitude},${event.latitude}&z=16&l=map`
    : `https://yandex.ru/maps/?text=${encodeURIComponent([event.city, event.address].filter(Boolean).join(', '))}`
  const eventPast = isPast(event.startsAt)
  const canRatePlayers = Boolean(
    currentUser && eventPast && (isOrganizer || myPart?.status === 'confirmed'),
  )
  const canJoin = !unpublished && !eventPast && (!myPart || myPart.status === 'rejected' || myPart.status === 'cancelled')
  const showMobileCta =
    (!eventPast && (canJoin || myPart?.status === 'pending' || myPart?.status === 'waitlist'))
    || (eventPast && myPart?.status === 'waitlist')
  const leaveConfirmedEvent = async () => {
    if (!window.confirm('Покинуть это мероприятие?')) return
    await leave(event.id)
  }
  const unpublishByAdmin = async () => {
    if (!window.confirm('Снять событие с публикации? Пользователи больше не смогут записываться.')) return
    try {
      setModerationError('')
      await moderateEvent(event.id, 'unpublish')
      await refresh()
    } catch (cause) {
      setModerationError(cause instanceof Error ? cause.message : 'Не удалось снять событие с публикации.')
    }
  }

  const openJoin = () => {
    if (eventPast) return
    if (!currentUser) {
      navigate('/login', { state: { from: `/events/${event.id}` } })
      return
    }
    setJoinOpen(true)
  }

  return (
    <div className="page-frame pb-action-bar-only">
      <div>
        <div className="event-hero-surface relative min-h-72 overflow-hidden rounded-[1.55rem] border border-white/[0.09] bg-card shadow-[0_18px_38px_rgba(0,0,0,0.2)] md:min-h-[24rem]">
          <img
            src={event.imageUrl ?? '/images/hero.png'}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f11] via-[#0d0f11]/32 to-black/15" />
          <div className="absolute left-3 right-3 top-3 flex items-center justify-between">
            <Link
              to="/events"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-black/30 text-white backdrop-blur-md"
              aria-label="Назад к списку"
            >
              <ArrowLeft size={19} />
            </Link>
            <div className="flex gap-2">
              <a href={mapHref} target="_blank" rel="noreferrer" className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-black/30 text-white backdrop-blur-md" aria-label="Открыть в Яндекс Картах">
                <Route size={17} />
              </a>
              {[CalendarPlus, Share2].map((Icon, index) => (
                <button key={index} type="button" className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-black/30 text-white backdrop-blur-md" aria-label="Действие с событием">
                  <Icon size={17} />
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  currentUser ? void like(event.id) : navigate('/login', { state: { from: `/events/${event.id}` } })
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-black/30 text-white backdrop-blur-md"
                aria-label={liked ? 'Убрать отметку «нравится»' : 'Отметить «нравится»'}
              >
                <Heart size={18} className={liked ? 'fill-warning text-warning' : ''} />
              </button>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {sport && <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-white">{sport.name}</span>}
              {eventPast && (
                <span className="rounded-full border border-white/35 bg-black/25 px-3 py-1 text-xs font-semibold text-white/90">
                  Прошло
                </span>
              )}
              <span className="rounded-full border border-white/30 bg-black/20 px-3 py-1 text-xs font-semibold text-white/90">
                {date}
              </span>
            </div>
            <div className="flex items-end justify-between gap-4">
              <h1 className="max-w-[18ch] break-words text-[1.8rem] font-bold leading-[1.04] tracking-[-0.045em] text-white md:text-4xl">
                {event.title}
              </h1>
              <span className="shrink-0 rounded-xl bg-accent-line px-3 py-2 text-sm font-bold text-[#1d1a10]">{time}</span>
            </div>
          </div>
        </div>

        {event.gallery && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {event.gallery.map((src, index) => (
              <img key={index} src={src} alt="" className="h-20 w-28 shrink-0 rounded-xl object-cover" />
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 space-y-4">
        <EventOrganizerCard event={event} organizer={organizer} />

        <div className="rounded-[1.35rem] border border-white/[0.08] bg-card p-4">
          <p className="text-xs font-semibold text-muted">Место встречи</p>
          <p className="mt-1 flex items-start gap-2 text-sm font-semibold leading-snug text-white">
            <MapPin size={17} className="mt-0.5 shrink-0 text-accent" />
            <span>{event.address}</span>
          </p>
        </div>

        {unpublished && (
          <p className="mt-4 rounded-xl border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-warning">
            Мероприятие снято с публикации
          </p>
        )}
        {eventPast && !unpublished && (
          <p className="mt-4 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-muted">
            Событие уже прошло — запись недоступна.
          </p>
        )}
        {moderationError && <p role="alert" className="mt-3 text-sm text-rose-300">{moderationError}</p>}

        <section className="mt-7">
          <h2 className="text-xl font-bold tracking-[-0.025em]">О событии</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-white/85">{event.description}</p>
          <button type="button" className="mt-3 text-sm font-semibold text-accent">Показать всё</button>
        </section>

        <div className="mt-6 divide-y divide-white/[0.08] overflow-hidden rounded-[1.35rem] border border-white/[0.08] bg-card">
          <div className="flex items-center justify-between gap-4 px-4 py-3.5">
            <span className="text-sm text-muted">Уровень</span>
            <div className="flex items-center gap-2">
              <StarRating value={event.level} max={5} />
              <Info size={16} className="text-accent" />
            </div>
          </div>
          {event.minAge && (
            <div className="flex items-center justify-between gap-4 px-4 py-3.5">
              <span className="text-sm text-muted">Возраст</span>
              <span className="text-sm font-semibold">{event.minAge}+</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-4 px-4 py-3.5">
            <span className="text-sm text-muted">Запись</span>
            <span className="text-sm font-semibold">{event.joinMode === 'open' ? 'Свободная' : 'По заявке'}</span>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3.5">
            <span className="text-sm text-muted">Участники</span>
            <span className="text-sm font-semibold">{event.confirmedCount ?? participants.length} / {event.capacity}</span>
          </div>
        </div>

        {myPart && (
          <p className="mt-4 rounded-xl border border-accent/25 bg-accent/10 px-3 py-2 text-sm text-accent">
            Ваш статус: {myPart.status === 'confirmed' ? 'подтверждено' : myPart.status === 'pending' ? 'ожидает решения' : myPart.status === 'waitlist' ? 'в резерве' : myPart.status === 'cancelled' ? 'вы покинули событие' : 'отклонено'}
            {eventPast && myPart.status === 'confirmed' && myPart.attended === true && ' · посещение подтверждено организатором'}
            {eventPast && myPart.status === 'confirmed' && myPart.attended === false && ' · отмечено отсутствие'}
          </p>
        )}

        {isOrganizer && (
          <EventAttendancePanel eventId={event.id} startsAt={event.startsAt} onSaved={() => void refresh()} />
        )}

        {isOrganizer && pending.length > 0 && (
          <div className="mt-4 rounded-[1.35rem] border border-white/[0.08] bg-card p-4">
            <h3 className="mb-3 font-bold">Заявки</h3>
            <ul className="space-y-3">
              {pending.map((participation) => {
                const user = state.users.find((item) => item.id === participation.userId)
                return (
                  <li key={participation.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-white">{user?.name}</span>
                    <div className="flex gap-3">
                      <button type="button" className="font-semibold text-accent" onClick={() => review(participation.id, 'confirmed')}>
                        Принять
                      </button>
                      <button type="button" className="font-semibold text-warning" onClick={() => review(participation.id, 'rejected')}>
                        Отклонить
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <div className="mt-7 flex flex-col gap-3 md:mt-8">
          {isOrganizer && (
            <Link to={`/events/${event.id}/edit`}>
              <PrimaryButton variant="outline" fullWidth>Редактировать событие</PrimaryButton>
            </Link>
          )}
          <Link to={`/events/${event.id}/discussion`}>
            <PrimaryButton variant="outline" fullWidth>Обсудить в чате</PrimaryButton>
          </Link>
          {canJoin && (
            <PrimaryButton fullWidth className="hidden md:flex" onClick={openJoin}>
              {event.joinMode === 'open' ? 'Зарегистрироваться' : 'Подать заявку'}
            </PrimaryButton>
          )}
          {eventPast && !canJoin && !myPart?.status && (
            <PrimaryButton fullWidth disabled className="hidden md:flex">Мероприятие прошло</PrimaryButton>
          )}
          {!eventPast && myPart?.status === 'pending' && (
            <PrimaryButton fullWidth disabled className="hidden md:flex">Заявка отправлена</PrimaryButton>
          )}
          {myPart?.status === 'waitlist' && (
            <PrimaryButton fullWidth disabled className="hidden md:flex">Вы в резерве</PrimaryButton>
          )}
          {!eventPast && myPart && (myPart.status === 'confirmed' || myPart.status === 'pending' || myPart.status === 'waitlist') && (
            <PrimaryButton variant="outline" fullWidth onClick={() => void leaveConfirmedEvent()}>Покинуть событие</PrimaryButton>
          )}
          {currentUser?.role === 'admin' && !unpublished && <PrimaryButton variant="outline" fullWidth onClick={() => void unpublishByAdmin()}>Снять с публикации</PrimaryButton>}
          <button
            type="button"
            onClick={() => currentUser ? void favorite(event.id) : navigate('/login', { state: { from: `/events/${event.id}` } })}
            className="py-1 text-center text-sm font-semibold text-muted transition-colors hover:text-white"
          >
            {state.favorites.includes(event.id) ? 'В избранном' : 'В избранное'}
          </button>
        </div>

        {canRatePlayers && (
          <EventPlayerRatingsPanel
            eventId={event.id}
            startsAt={event.startsAt}
            joinMode={event.joinMode}
          />
        )}

        {participantProfiles.length > 0 && !canRatePlayers && (
          <section className="mt-6"><h2 className="text-xl font-bold tracking-[-0.025em]">Участники</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">
            {participantProfiles.map((participant) => <Link key={participant.id} to={`/users/${participant.id}`} className="flex min-w-0 items-center gap-3 rounded-xl border border-white/[0.08] bg-card p-3 transition-colors hover:border-accent/50"><img src={participant.avatarUrl || '/images/hero.png'} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" /><span className="min-w-0"><span className="block truncate font-semibold text-white">{participant.name}</span><span className="block truncate text-xs text-muted">{participant.city || 'Город не указан'}</span></span></Link>)}
          </div></section>
        )}
      </div>

      {showMobileCta && (
        <MobileActionBar>
          {canJoin ? (
            <PrimaryButton fullWidth onClick={openJoin}>
              {event.joinMode === 'open' ? 'Зарегистрироваться' : 'Подать заявку'}
            </PrimaryButton>
          ) : myPart?.status === 'waitlist' ? (
            <PrimaryButton fullWidth disabled>Вы в резерве</PrimaryButton>
          ) : eventPast ? (
            <PrimaryButton fullWidth disabled>Мероприятие прошло</PrimaryButton>
          ) : (
            <PrimaryButton fullWidth disabled>Заявка отправлена</PrimaryButton>
          )}
        </MobileActionBar>
      )}

      {joinOpen && <EventJoinPanel event={event} onClose={() => setJoinOpen(false)} onJoined={() => void refresh()} />}
    </div>
  )
}
