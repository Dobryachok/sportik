import { ArrowLeft, Link2, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchUser, toggleUserFollow } from '../data/api'
import { useAppData } from '../app/AppDataContext'
import { genderLabel } from '../data/interestCatalog'
import type { User } from '../data/types'

export function PublicProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAppData()
  const [following, setFollowing] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void fetchUser(id)
      .then((result) => { if (!cancelled) { setUser(result); setFollowing(Boolean(result.viewerFollows)) } })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Не удалось открыть профиль.') })
    return () => { cancelled = true }
  }, [id])

  if (error) return <div className="page-frame py-10 text-center"><p className="text-muted">{error}</p><Link to="/events" className="mt-4 inline-block font-semibold text-accent">Открыть события</Link></div>
  if (!user) return <p className="py-10 text-center text-muted">Загружаем профиль…</p>
  const stats = user.stats ?? { events: 0, subscriptions: 0, followers: 0 }
  const canFollow = Boolean(currentUser && currentUser.id !== user.id)
  const additionalDetails = [
    user.gender ? ['Пол', genderLabel(user.gender)] : null,
    user.age !== undefined ? ['Возраст', `${user.age} лет`] : null,
    user.maritalStatus ? ['Семейное положение', user.maritalStatus] : null,
    user.hasCar !== undefined && user.hasCar !== null ? ['Автомобиль', user.hasCar ? 'Есть' : 'Нет'] : null,
    user.workSchedule ? ['График', user.workSchedule] : null,
  ].filter((item): item is [string, string] => Boolean(item))
  const toggleFollow = async () => {
    if (!canFollow || followBusy) return
    setFollowBusy(true)
    try {
      const result = await toggleUserFollow(user.id)
      setFollowing(result.active)
      setUser((current) => {
        if (!current) return current
        const currentStats = current.stats ?? { events: 0, subscriptions: 0, followers: 0 }
        return {
          ...current,
          stats: { ...currentStats, followers: Math.max(0, currentStats.followers + (result.active ? 1 : -1)) },
        }
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось изменить подписку.')
    } finally {
      setFollowBusy(false)
    }
  }

  return (
    <div className="page-frame pb-8">
      <header className="mb-4 flex h-10 items-center"><button type="button" onClick={() => navigate(-1)} aria-label="Назад" className="flex h-10 w-10 items-center justify-center rounded-xl text-white hover:bg-white/[0.07]"><ArrowLeft size={23} /></button></header>
      <section className="rounded-[1.7rem] border border-white/[0.08] bg-card px-4 pb-5 pt-6 text-center shadow-[0_12px_32px_rgba(10,64,96,0.08)] sm:px-7">
        <img src={user.avatarUrl || '/images/hero.png'} alt={`Аватар ${user.name}`} className="mx-auto h-28 w-28 rounded-full border-[3px] border-white/70 object-cover shadow-[0_10px_24px_rgba(10,47,67,0.22)]" />
        <h1 className="mt-4 text-[1.7rem] font-bold tracking-[-0.04em] text-white">{user.name}</h1>
        <p className="mt-2 flex items-center justify-center gap-2 text-base text-muted"><MapPin size={19} className="text-white/75" />{user.city || 'Город не указан'}</p>
        {canFollow && <button type="button" disabled={followBusy} onClick={() => void toggleFollow()} className={`mt-5 min-h-11 rounded-xl px-5 text-sm font-bold transition-colors disabled:opacity-60 ${following ? 'border border-accent text-accent hover:bg-accent/10' : 'bg-accent text-white hover:bg-accent-hover'}`}>
          {followBusy ? 'Сохраняем…' : following ? 'Вы подписаны' : 'Подписаться'}
        </button>}
        <div className="mt-6 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-5">
          <div><p className="text-2xl font-bold text-accent">{stats.events}</p><p className="mt-1 text-sm text-muted">событий</p></div>
          <div><p className="text-2xl font-bold text-accent">{stats.subscriptions}</p><p className="mt-1 text-sm text-muted">подписок</p></div>
          <div><p className="text-2xl font-bold text-accent">{stats.followers}</p><p className="mt-1 text-sm text-muted">подписчиков</p></div>
        </div>
      </section>
      {user.interests && user.interests.length > 0 && (
        <section className="mt-5 rounded-[1.7rem] border border-white/[0.08] bg-card p-4 sm:p-5">
          <h2 className="text-lg font-bold">Интересы</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {user.interests.map((tag) => (
              <span key={tag} className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">{tag}</span>
            ))}
          </div>
        </section>
      )}
      {user.bio && <section className="mt-5 rounded-[1.7rem] border border-white/[0.08] bg-card p-4 sm:p-5"><h2 className="text-lg font-bold">О себе</h2><p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted">{user.bio}</p></section>}
      {additionalDetails.length > 0 && <section className="mt-5 rounded-[1.7rem] border border-white/[0.08] bg-card p-4 sm:p-5"><h2 className="text-lg font-bold">Дополнительная информация</h2><dl className="mt-3 divide-y divide-white/10">{additionalDetails.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="text-muted">{label}</dt><dd className="text-right font-semibold text-white">{value}</dd></div>)}</dl></section>}
      <section className="mt-5 rounded-[1.7rem] border border-white/[0.08] bg-card p-4 sm:p-5"><h2 className="text-lg font-bold">Социальные сети</h2>
        {user.socialLinks?.length ? <div className="mt-4 flex flex-wrap gap-2">{user.socialLinks.map((item) => <a key={`${item.platform}:${item.url}`} href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-card px-3 py-2 text-sm font-semibold text-white hover:border-accent"><Link2 size={15} className="text-accent" />{item.label || item.platform}</a>)}</div> : <p className="mt-2 text-sm text-muted">Пользователь пока не добавил ссылки.</p>}
      </section>
    </div>
  )
}
