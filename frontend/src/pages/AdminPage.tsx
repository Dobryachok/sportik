import { Link } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { PageHeader } from '../components/PageHeader'

export function AdminPage() {
  const { currentUser } = useAppData()

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-w-0 max-w-full md:max-w-lg">
        <PageHeader title="Администрирование" back />
        <p className="rounded-xl bg-card p-4 text-sm text-muted">Нет доступа. Нужна роль администратора.</p>
        <Link to="/" className="mt-4 inline-block text-accent text-sm">На главную</Link>
      </div>
    )
  }

  return (
    <div className="min-w-0 max-w-full md:max-w-lg">
      <PageHeader title="Администрирование" back />
      <div className="rounded-2xl bg-card p-5">
        <h2 className="text-lg font-semibold">Фаза 2</h2>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Здесь будет поиск организаций и мероприятий, допуск сообществ, снятие событий с
          публикации и просмотр обсуждений — по требованиям кейса Столото.
        </p>
        <ul className="mt-4 list-disc pl-5 text-sm text-muted space-y-1">
          <li>Одобрение / отклонение заявок организаций</li>
          <li>Модерация мероприятий</li>
          <li>Связь с серверным API</li>
        </ul>
        <Link to="/" className="mt-4 inline-block text-accent text-sm">На главную</Link>
      </div>
    </div>
  )
}
