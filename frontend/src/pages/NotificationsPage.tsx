import { useAppData } from '../app/AppDataContext'
import { NotificationCard } from '../components/NotificationCard'
import { PageHeader } from '../components/PageHeader'

export function NotificationsPage() {
  const { state, dismissNotification } = useAppData()
  const items = [...state.notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  return (
    <div className="page-frame">
      <PageHeader title="Уведомления" />
      <div className="flex flex-col gap-3">
        {items.length === 0 ? <div className="rounded-[1.35rem] border border-dashed border-white/15 px-5 py-10 text-center text-sm leading-relaxed text-muted">Здесь появятся приглашения на турниры и обновления событий.</div> : items.map((item) => <NotificationCard key={item.id} item={item} onDismiss={(id) => void dismissNotification(id)} />)}
      </div>
    </div>
  )
}
