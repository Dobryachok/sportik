import { MessageCircle } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { MobileActionBar } from '../components/MobileActionBar'
import { PrimaryButton } from '../components/PrimaryButton'
import { PageHeader } from '../components/PageHeader'
import { getUserParticipation } from '../data/selectors'

export function EventJoinPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, currentUser, participate } = useAppData()
  const event = state.events.find((item) => item.id === id)
  const organizer = event ? state.users.find((item) => item.id === event.organizerUserId) : undefined
  const myPart = event && currentUser ? getUserParticipation(state, event.id, currentUser.id) : undefined

  if (!event || event.status !== 'published') return <p className="text-muted">Запись недоступна</p>

  const handleJoin = async () => {
    if (await participate(event.id)) navigate(`/events/${event.id}`)
  }
  const action = <PrimaryButton fullWidth onClick={handleJoin} disabled={!!myPart}>
    {myPart ? 'Вы уже записаны' : event.joinMode === 'open' ? 'Участвовать в событии' : 'Подать заявку'}
  </PrimaryButton>

  return (
    <div className="min-w-0 max-w-full pb-action-bar-only">
      <PageHeader title="Запись на событие" back />
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-card p-4">
        <img src={organizer?.avatarUrl || '/images/hero.png'} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">Организатор</p>
          <p className="break-words text-lg font-semibold">{organizer?.name || 'Организатор события'}</p>
        </div>
      </div>
      <div className="mt-4 rounded-2xl bg-card px-4 py-3">
        <p className="text-3xl font-bold text-accent">{event.confirmedCount ?? 0}</p>
        <p className="text-sm text-muted">участников подтвердили участие</p>
      </div>
      <Link to={`/events/${event.id}/discussion`} className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-accent">
        <MessageCircle size={18} /> Обсудить событие в чате
      </Link>
      <MobileActionBar>{action}</MobileActionBar>
      <div className="hidden md:mt-8 md:block">{action}</div>
    </div>
  )
}
