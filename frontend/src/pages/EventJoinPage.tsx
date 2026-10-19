import { MessageCircle, Phone, Send } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import { useAppData } from '../app/AppDataContext'
import { MobileActionBar } from '../components/MobileActionBar'
import { PrimaryButton } from '../components/PrimaryButton'
import { PageHeader } from '../components/PageHeader'
import { getUserParticipation } from '../data/selectors'

export function EventJoinPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, currentUser, participate } = useAppData()
  const [payment, setPayment] = useState<'card' | 'cash'>('card')
  const event = state.events.find((e) => e.id === id)
  const organizer = event ? state.users.find((u) => u.id === event.organizerUserId) : undefined
  const myPart =
    event && currentUser
      ? getUserParticipation(state, event.id, currentUser.id)
      : undefined

  if (!event || event.status !== 'published') {
    return <p className="text-muted">Запись недоступна</p>
  }

  const handleJoin = async () => {
    if (await participate(event.id)) navigate(`/events/${event.id}`)
  }

  return (
    <div className="min-w-0 max-w-full pb-action-bar-only">
      <PageHeader title="" back />

      <div className="mb-6 flex rounded-full bg-card p-1">
        {(['card', 'cash'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setPayment(m)}
            className={`flex-1 rounded-full py-2 text-sm font-medium ${
              payment === m ? 'bg-accent text-white' : 'text-muted'
            }`}
          >
            {m === 'card' ? 'Картой' : 'Наличными'}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-card p-4">
        <img
          src={organizer?.avatarUrl}
          alt=""
          className="h-14 w-14 shrink-0 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">Организатор</p>
          <p className="break-words text-lg font-semibold">{organizer?.name}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {[MessageCircle, Phone, Send].map((Icon, i) => (
            <button
              key={i}
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-accent"
            >
              <Icon size={18} />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl bg-card px-4 py-3">
        <div>
          <p className="text-3xl font-bold text-accent">0</p>
          <p className="text-sm text-muted">чел обсуждают событие в чате</p>
        </div>
      </div>
      <Link to={`/events/${event.id}/discussion`} className="mt-3 block">
        <PrimaryButton variant="outline" fullWidth>Обсудить событие в чате</PrimaryButton>
      </Link>

      <h2 className="mt-8 mb-3 text-lg font-bold">Сопутствующие товары</h2>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide">
        {[
          { title: 'Добавить событие', price: '1000 ₽', color: 'from-sky-400/40' },
          { title: 'Чат игроков', price: '0 ₽', color: 'from-amber-400/40' },
        ].map((card) => (
          <div
            key={card.title}
            className={`min-w-[140px] shrink-0 rounded-2xl bg-gradient-to-b ${card.color} to-card p-3`}
          >
            <div className="mb-8 h-16 rounded-xl bg-white/10" />
            <p className="text-sm font-semibold">{card.title}</p>
            <p className="text-xs text-muted mt-1">{card.price}</p>
          </div>
        ))}
      </div>

      {payment === 'cash' && (
        <p className="mt-4 text-sm text-muted rounded-xl bg-card p-3">
          На месте: 89048943440, 450₽ на Сбербанк, Anna Sergeevna K.
        </p>
      )}

      <MobileActionBar>
        <PrimaryButton fullWidth onClick={handleJoin} disabled={!!myPart}>
          {myPart
            ? 'Вы уже записаны'
            : event.joinMode === 'open'
              ? 'Участвовать в событии'
              : 'Подать заявку'}
        </PrimaryButton>
      </MobileActionBar>
      <div className="hidden md:mt-8 md:block">
        <PrimaryButton fullWidth onClick={handleJoin} disabled={!!myPart}>
          {myPart
            ? 'Вы уже записаны'
            : event.joinMode === 'open'
              ? 'Участвовать в событии'
              : 'Подать заявку'}
        </PrimaryButton>
      </div>
    </div>
  )
}
