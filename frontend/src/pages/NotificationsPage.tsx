import { useAppData } from '../app/AppDataContext'
import { NotificationCard } from '../components/NotificationCard'
import { PageHeader } from '../components/PageHeader'

export function NotificationsPage() {
  const { state } = useAppData()
  const items = [...state.notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader title="Уведомления" />
      <div className="flex flex-col gap-3">
        {items.map((n) => <NotificationCard key={n.id} item={n} />)}
      </div>
    </div>
  )
}
