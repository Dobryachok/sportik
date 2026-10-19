import { ArrowLeft, Link2, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchUser } from '../data/api'
import type { User } from '../data/types'

export function PublicProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void fetchUser(id)
      .then((result) => { if (!cancelled) setUser(result) })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Не удалось открыть профиль.') })
    return () => { cancelled = true }
  }, [id])

  if (error) return <div className="mx-auto max-w-xl py-10 text-center"><p className="text-muted">{error}</p><Link to="/events" className="mt-4 inline-block font-semibold text-accent">Открыть события</Link></div>
  if (!user) return <p className="py-10 text-center text-muted">Загружаем профиль…</p>
  const stats = user.stats ?? { events: 0, subscriptions: 0, followers: 0 }

  return (
    <div className="mx-auto max-w-xl pb-8">
      <header className="mb-4 flex h-10 items-center"><button type="button" onClick={() => navigate(-1)} aria-label="Назад" className="flex h-10 w-10 items-center justify-center rounded-xl text-white hover:bg-white/[0.07]"><ArrowLeft size={25} /></button></header>
      <section className="px-1 pb-8 text-center">
        <img src={user.avatarUrl || '/images/hero.png'} alt={`Аватар ${user.name}`} className="mx-auto h-32 w-32 rounded-full border-[3px] border-white/70 object-cover shadow-[0_14px_28px_rgba(0,0,0,0.35)]" />
        <h1 className="mt-5 text-[1.7rem] font-bold tracking-[-0.04em] text-white">{user.name}</h1>
        <p className="mt-3 flex items-center justify-center gap-2 text-lg text-muted"><MapPin size={20} className="text-white/75" />{user.city || 'Город не указан'}</p>
        <div className="mt-8 grid grid-cols-3 divide-x divide-white/10">
          <div><p className="text-2xl font-bold text-accent">{stats.events}</p><p className="mt-1 text-sm text-muted">событий</p></div>
          <div><p className="text-2xl font-bold text-accent">{stats.subscriptions}</p><p className="mt-1 text-sm text-muted">подписок</p></div>
          <div><p className="text-2xl font-bold text-accent">{stats.followers}</p><p className="mt-1 text-sm text-muted">подписчиков</p></div>
        </div>
      </section>
      {user.bio && <section className="border-t-8 border-black/30 px-1 py-7"><h2 className="text-xl font-bold">О себе</h2><p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted">{user.bio}</p></section>}
      <section className="border-t-8 border-black/30 px-1 py-7"><h2 className="text-xl font-bold">Социальные сети</h2>
        {user.socialLinks?.length ? <div className="mt-4 flex flex-wrap gap-2">{user.socialLinks.map((item) => <a key={`${item.platform}:${item.url}`} href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-card px-3 py-2 text-sm font-semibold text-white hover:border-accent"><Link2 size={15} className="text-accent" />{item.label || item.platform}</a>)}</div> : <p className="mt-2 text-sm text-muted">Пользователь пока не добавил ссылки.</p>}
      </section>
    </div>
  )
}
