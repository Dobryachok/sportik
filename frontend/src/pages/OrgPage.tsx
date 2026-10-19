import { Link } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { PageHeader } from '../components/PageHeader'

export function OrgPage() {
  const { state } = useAppData()
  const pending = state.organizations.find((o) => o.status === 'pending')
  const approved = state.organizations.find((o) => o.status === 'approved')

  return (
    <div className="min-w-0 max-w-full md:max-w-lg">
      <PageHeader title="Организация" back />
      <div className="rounded-2xl bg-card p-5 space-y-4">
        <p className="text-sm text-muted">
          Контур сообщества в MVP показан демо-данными. Полный сценарий допуска — в фазе 2.
        </p>
        {approved && (
          <div>
            <h3 className="font-semibold text-accent">{approved.name}</h3>
            <p className="text-sm text-muted mt-1">{approved.description}</p>
            <p className="text-xs mt-2">Статус: допущена</p>
          </div>
        )}
        {pending && (
          <div className="border-t border-white/10 pt-4">
            <h3 className="font-semibold">{pending.name}</h3>
            <p className="text-sm text-muted mt-1">{pending.description}</p>
            <p className="text-xs mt-2 text-amber-400">Статус: ожидает решения админа</p>
          </div>
        )}
        <Link to="/create-event" className="text-accent text-sm">Создать событие (как пользователь)</Link>
      </div>
    </div>
  )
}
