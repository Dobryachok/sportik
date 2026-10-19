import { MapPin, Pencil, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { PrimaryButton } from '../components/PrimaryButton'

export function ProfilePage() {
  const navigate = useNavigate()
  const { state, currentUser, isAuthenticated, logout, resetData } = useAppData()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="mx-auto min-w-0 max-w-full md:max-w-lg text-center py-12">
        <h1 className="text-xl font-bold">Профиль</h1>
        <p className="mt-2 text-sm text-muted">Войдите, чтобы видеть свой профиль и записи</p>
        <div className="mt-6 flex flex-col gap-3">
          <Link to="/login">
            <PrimaryButton fullWidth>Войти</PrimaryButton>
          </Link>
          <Link to="/register">
            <PrimaryButton variant="outline" fullWidth>Регистрация</PrimaryButton>
          </Link>
        </div>
      </div>
    )
  }

  const stats = currentUser.stats ?? { events: 0, subscriptions: 0, followers: 0 }

  return (
    <div className="mx-auto min-w-0 max-w-full md:max-w-lg">
      <div className="relative mb-6 text-center">
        <img
          src={currentUser.avatarUrl}
          alt=""
          className="mx-auto h-28 w-28 rounded-full object-cover"
        />
        <h1 className="mt-3 flex items-center justify-center gap-2 text-xl font-bold">
          {currentUser.name}
          {currentUser.age != null && `, ${currentUser.age}`}
          <Pencil size={14} className="text-muted" />
        </h1>
        <p className="mt-1 flex items-center justify-center gap-1 text-sm text-muted">
          <MapPin size={14} />
          {currentUser.city}
        </p>
        <button
          type="button"
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm"
        >
          <Plus size={16} />
          Установить статус
        </button>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-2 text-center">
        {[
          { v: stats.events, l: 'событий' },
          { v: stats.subscriptions, l: 'подписок' },
          { v: stats.followers, l: 'подписчиков' },
        ].map((s) => (
          <div key={s.l}>
            <p className="text-2xl font-bold text-accent">{s.v}</p>
            <p className="text-sm text-muted">{s.l}</p>
          </div>
        ))}
      </div>

      <section className="mb-6">
        <h2 className="mb-3 font-bold">Команды</h2>
        <PrimaryButton variant="outline" fullWidth>Создать команду</PrimaryButton>
      </section>

      <section className="mb-6">
        <PrimaryButton variant="outline" fullWidth onClick={handleLogout}>
          Выйти из аккаунта
        </PrimaryButton>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 font-bold">Дополнительная информация</h2>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-xl bg-card px-4 py-3 text-left"
        >
          <span>Семейное положение</span>
          <span className="text-muted">Не выбрано ›</span>
        </button>
      </section>

      <div className="space-y-2 text-sm text-muted">
        <p>Роль: {currentUser.role}</p>
        <p>Город в приложении: {state.city}</p>
        {currentUser.role === 'admin' && (
          <Link to="/admin" className="block text-accent">Администрирование</Link>
        )}
        <Link to="/org" className="block text-accent">Организация (фаза 2)</Link>
        <button type="button" onClick={resetData} className="text-warning">
          Сбросить демо-данные
        </button>
      </div>
    </div>
  )
}
