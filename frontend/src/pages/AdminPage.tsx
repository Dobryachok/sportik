import { Building2, CalendarOff, Dumbbell } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import {
  deleteSportBackground,
  fetchAdminEvents,
  fetchAdminSportCatalog,
  fetchPendingOrganizations,
  fetchPendingSports,
  moderateEvent,
  reviewOrganization,
  reviewSport,
  uploadSportBackground,
  type AdminEvent,
  type AdminSportCatalogItem,
  type PendingOrganization,
  type PendingSport,
} from '../data/api'
import { PageHeader } from '../components/PageHeader'

export function AdminPage() {
  const { currentUser, refresh } = useAppData()
  const [sports, setSports] = useState<PendingSport[]>([])
  const [organizations, setOrganizations] = useState<PendingOrganization[]>([])
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [comments, setComments] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [sportCatalog, setSportCatalog] = useState<AdminSportCatalogItem[]>([])
  const [sportBgBusy, setSportBgBusy] = useState('')

  const load = async () => {
    try {
      setError('')
      const [nextSports, nextOrganizations, nextEvents, catalog] = await Promise.all([
        fetchPendingSports(),
        fetchPendingOrganizations(),
        fetchAdminEvents(),
        fetchAdminSportCatalog(),
      ])
      setSports(nextSports)
      setOrganizations(nextOrganizations)
      setEvents(nextEvents)
      setSportCatalog(catalog)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось загрузить очередь модерации.')
    }
  }

  useEffect(() => { if (currentUser?.role === 'admin') void load() }, [currentUser?.role])

  const decideSport = async (sport: PendingSport, decision: 'approved' | 'rejected') => {
    setBusyId(sport.id)
    try { await reviewSport(sport.id, decision); setSports((items) => items.filter((item) => item.id !== sport.id)); await refresh() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось обработать заявку.') }
    finally { setBusyId('') }
  }

  const decideOrganization = async (organization: PendingOrganization, decision: 'approved' | 'rejected') => {
    setBusyId(organization.id)
    try { await reviewOrganization(organization.id, decision, comments[organization.id] || ''); setOrganizations((items) => items.filter((item) => item.id !== organization.id)); await refresh() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось обработать заявку.') }
    finally { setBusyId('') }
  }

  const hideEvent = async (event: AdminEvent) => {
    if (!window.confirm(`Снять с публикации «${event.title}»? Запись и показ в каталоге будут остановлены.`)) return
    setBusyId(event.id)
    try { await moderateEvent(event.id, 'unpublish', comments[event.id] || ''); setEvents((items) => items.filter((item) => item.id !== event.id)); await refresh() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось снять событие с публикации.') }
    finally { setBusyId('') }
  }

  if (currentUser?.role !== 'admin') return <div className="page-frame"><PageHeader title="Администрирование" back /><p className="rounded-xl bg-card p-4 text-sm text-muted">Нет доступа. Нужна роль администратора.</p><Link to="/" className="mt-4 inline-block text-sm font-semibold text-accent">На главную</Link></div>

  return <div className="page-frame pb-8">
    <PageHeader title="Администрирование" back />
    {error && <p role="alert" className="mb-4 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
    <section className="rounded-[1.35rem] border border-white/[0.08] bg-card p-4">
      <div className="flex items-baseline justify-between gap-3"><div className="flex gap-3"><Building2 className="mt-0.5 text-accent" size={21} /><div><h2 className="text-lg font-bold">Заявки организаций</h2><p className="mt-1 text-sm text-muted">После одобрения они смогут публиковать мероприятия от своего имени.</p></div></div><span className="rounded-full bg-accent/10 px-2.5 py-1 text-sm font-bold text-accent">{organizations.length}</span></div>
      <div className="mt-4 space-y-3">{organizations.map((organization) => <article key={organization.id} className="rounded-xl border border-white/10 bg-bg/50 p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-white">{organization.name}</p><p className="mt-1 text-xs text-muted">{organization.city} · Заявитель: {organization.requestedByName}</p></div><span className="text-xs text-muted">{new Date(organization.createdAt).toLocaleDateString('ru-RU')}</span></div>{organization.description && <p className="mt-3 text-sm leading-5 text-muted">{organization.description}</p>}{organization.comment && <p className="mt-3 rounded-lg bg-card px-3 py-2 text-sm text-muted">Комментарий: {organization.comment}</p>}<textarea value={comments[organization.id] || ''} onChange={(event) => setComments((items) => ({ ...items, [organization.id]: event.target.value }))} placeholder="Комментарий для заявителя (особенно при отказе)" maxLength={4000} rows={2} className="mt-3 w-full rounded-lg bg-card px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-accent" /><div className="mt-3 flex gap-2"><button type="button" disabled={busyId === organization.id} onClick={() => void decideOrganization(organization, 'rejected')} className="rounded-lg border border-warning/50 px-3 py-2 text-sm font-semibold text-warning disabled:opacity-50">Отклонить</button><button type="button" disabled={busyId === organization.id} onClick={() => void decideOrganization(organization, 'approved')} className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Одобрить</button></div></article>)}{organizations.length === 0 && <p className="rounded-xl border border-dashed border-white/15 px-4 py-6 text-center text-sm text-muted">Новых заявок организаций нет.</p>}</div>
    </section>
    <section className="mt-5 rounded-[1.35rem] border border-white/[0.08] bg-card p-4">
      <div className="flex items-baseline justify-between gap-3"><div className="flex gap-3"><CalendarOff className="mt-0.5 text-accent" size={21} /><div><h2 className="text-lg font-bold">Опубликованные события</h2><p className="mt-1 text-sm text-muted">Снятое с публикации событие исчезает из выдачи и закрывается для регистрации.</p></div></div><span className="rounded-full bg-accent/10 px-2.5 py-1 text-sm font-bold text-accent">{events.length}</span></div>
      <div className="mt-4 space-y-3">{events.map((event) => <article key={event.id} className="rounded-xl border border-white/10 bg-bg/50 p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><Link to={`/events/${event.id}`} className="font-semibold text-white hover:text-accent">{event.title}</Link><p className="mt-1 text-xs text-muted">{event.city} · {new Date(event.startsAt).toLocaleString('ru-RU')}</p><p className="mt-1 text-xs text-muted">Организатор: {event.organizationName || event.organizerName}</p></div><button type="button" disabled={busyId === event.id} onClick={() => void hideEvent(event)} className="rounded-lg border border-warning/50 px-3 py-2 text-sm font-semibold text-warning disabled:opacity-50">Снять с публикации</button></div><input value={comments[event.id] || ''} onChange={(input) => setComments((items) => ({ ...items, [event.id]: input.target.value }))} placeholder="Причина для организатора (необязательно)" maxLength={4000} className="mt-3 w-full rounded-lg bg-card px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-accent" /></article>)}{events.length === 0 && <p className="rounded-xl border border-dashed border-white/15 px-4 py-6 text-center text-sm text-muted">Опубликованных событий нет.</p>}</div>
    </section>
    <section className="mt-5 rounded-[1.35rem] border border-white/[0.08] bg-card p-4">
      <div className="flex items-baseline justify-between gap-3"><div className="flex gap-3"><Dumbbell className="mt-0.5 text-accent" size={21} /><div><h2 className="text-lg font-bold">Фоны видов спорта</h2><p className="mt-1 text-sm text-muted">Картинки для квадратных карточек на странице «События».</p></div></div><span className="rounded-full bg-accent/10 px-2.5 py-1 text-sm font-bold text-accent">{sportCatalog.length}</span></div>
      <div className="mt-4 space-y-3">{sportCatalog.map((sport) => <article key={sport.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-bg/50 p-3"><div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-card">{sport.backgroundImage ? <img src={sport.backgroundImage} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-xs text-muted">Нет</span>}</div><div className="min-w-0 flex-1"><p className="font-semibold text-white">{sport.name}</p><p className="text-xs text-muted">{sport.slug}</p></div><div className="flex flex-wrap gap-2"><label className="cursor-pointer rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-white"><input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={sportBgBusy === sport.id} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; setSportBgBusy(sport.id); void uploadSportBackground(sport.id, file).then((result) => { setSportCatalog((items) => items.map((item) => item.id === sport.id ? { ...item, backgroundImage: result.backgroundImage } : item)); void refresh() }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Не удалось загрузить фон.')).finally(() => setSportBgBusy('')) }} />{sportBgBusy === sport.id ? 'Загрузка…' : 'Загрузить'}</label>{sport.backgroundImage && <button type="button" disabled={sportBgBusy === sport.id} onClick={() => { setSportBgBusy(sport.id); void deleteSportBackground(sport.id).then(() => { setSportCatalog((items) => items.map((item) => item.id === sport.id ? { ...item, backgroundImage: null } : item)); void refresh() }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Не удалось удалить фон.')).finally(() => setSportBgBusy('')) }} className="rounded-lg border border-warning/50 px-3 py-2 text-sm font-semibold text-warning disabled:opacity-50">Удалить</button>}</div></article>)}{sportCatalog.length === 0 && <p className="rounded-xl border border-dashed border-white/15 px-4 py-6 text-center text-sm text-muted">Одобренных видов спорта пока нет.</p>}</div>
    </section>
    <section className="mt-5 rounded-[1.35rem] border border-white/[0.08] bg-card p-4">
      <div className="flex items-baseline justify-between gap-3"><div className="flex gap-3"><Dumbbell className="mt-0.5 text-accent" size={21} /><div><h2 className="text-lg font-bold">Виды спорта на модерации</h2><p className="mt-1 text-sm text-muted">Одобренные виды станут доступны при создании мероприятий.</p></div></div><span className="rounded-full bg-accent/10 px-2.5 py-1 text-sm font-bold text-accent">{sports.length}</span></div>
      <div className="mt-4 space-y-3">{sports.map((sport) => <article key={sport.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-bg/50 p-3"><div><p className="font-semibold text-white">{sport.name}</p><p className="mt-1 text-xs text-muted">Предложил: {sport.requestedByName || 'пользователь'}</p></div><div className="flex gap-2"><button type="button" disabled={busyId === sport.id} onClick={() => void decideSport(sport, 'rejected')} className="rounded-lg border border-warning/50 px-3 py-2 text-sm font-semibold text-warning disabled:opacity-50">Отклонить</button><button type="button" disabled={busyId === sport.id} onClick={() => void decideSport(sport, 'approved')} className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Одобрить</button></div></article>)}{sports.length === 0 && <p className="rounded-xl border border-dashed border-white/15 px-4 py-6 text-center text-sm text-muted">Новых заявок нет.</p>}</div>
    </section>
  </div>
}
