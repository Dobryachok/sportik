import { MessageCircle, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { PrimaryButton } from './PrimaryButton'
import { getUserParticipation } from '../data/selectors'
import type { Event } from '../data/types'

interface EventJoinPanelProps {
  event: Event
  onClose: () => void
  onJoined?: () => void
}

export function EventJoinPanel({ event, onClose, onJoined }: EventJoinPanelProps) {
  const { state, currentUser, participate } = useAppData()
  const organizer = state.users.find((item) => item.id === event.organizerUserId)
  const myPart = currentUser ? getUserParticipation(state, event.id, currentUser.id) : undefined

  const seatsLeft = Math.max(0, event.capacity - (event.confirmedCount ?? 0))
  const joinLabel = myPart
    ? myPart.status === 'waitlist'
      ? 'Вы в резерве'
      : myPart.status === 'pending'
        ? 'Заявка отправлена'
        : 'Вы уже записаны'
    : seatsLeft === 0
      ? 'Встать в резерв'
      : event.joinMode === 'open'
        ? 'Участвовать в событии'
        : 'Подать заявку'

  const handleJoin = async () => {
    if (await participate(event.id)) {
      onJoined?.()
      onClose()
    }
  }

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h2 id="join-event-title" className="text-lg font-bold text-white md:text-xl">Запись на событие</h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white"
          aria-label="Закрыть"
        >
          <X size={18} />
        </button>
      </div>
      <p className="mt-1 text-sm font-semibold text-white/90">{event.title}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.08] bg-card p-4">
        <img src={organizer?.avatarUrl || '/images/hero.png'} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">Организатор</p>
          <p className="break-words text-lg font-semibold text-white">{organizer?.name || 'Организатор события'}</p>
        </div>
      </div>
      <div className="mt-4 rounded-2xl bg-card px-4 py-3">
        <p className="text-3xl font-bold text-accent">{event.confirmedCount ?? 0}</p>
        <p className="text-sm text-muted">
          {seatsLeft > 0 ? `свободно мест: ${seatsLeft} из ${event.capacity}` : 'все места заняты — доступен резерв'}
        </p>
      </div>
      <Link
        to={`/events/${event.id}/discussion`}
        onClick={onClose}
        className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-accent"
      >
        <MessageCircle size={18} /> Обсудить событие в чате
      </Link>
      <div className="mt-6">
        <PrimaryButton fullWidth onClick={() => void handleJoin()} disabled={Boolean(myPart && myPart.status !== 'cancelled' && myPart.status !== 'rejected')}>
          {joinLabel}
        </PrimaryButton>
      </div>
    </>
  )

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center md:p-4" role="dialog" aria-modal="true" aria-labelledby="join-event-title">
      <button type="button" className="absolute inset-0 bg-black/55 md:bg-black/60" aria-label="Закрыть" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-t-[1.35rem] border border-white/[0.1] bg-bg px-5 pb-6 pt-5 shadow-2xl md:rounded-[1.35rem] md:pb-5" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}>
        {body}
      </div>
    </div>
  )
}
