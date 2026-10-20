import { ArrowLeft, Building2, Globe2, Mail, MapPin, Phone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchOrganization, type PublicOrganization } from '../data/api'

function eventDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export function OrganizationPublicPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [organization, setOrganization] = useState<PublicOrganization | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void fetchOrganization(id).then((result) => {
      if (!cancelled) setOrganization(result)
    }).catch((cause) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : 'Не удалось открыть страницу организации.')
    })
    return () => { cancelled = true }
  }, [id])

  if (error) return <div className="page-frame py-10 text-center"><p className="text-muted">{error}</p><Link to="/events" className="mt-4 inline-block font-semibold text-accent">Открыть события</Link></div>
  if (!organization) return <p className="py-10 text-center text-muted">Загружаем организацию…</p>

  return <div className="page-frame pb-8">
    <header className="mb-4 flex h-10 items-center"><button type="button" onClick={() => navigate(-1)} aria-label="Назад" className="flex h-10 w-10 items-center justify-center rounded-xl text-white hover:bg-white/[0.07]"><ArrowLeft size={23} /></button></header>
    <section className="rounded-[1.7rem] border border-white/[0.08] bg-card px-5 py-6 shadow-[0_12px_32px_rgba(10,64,96,0.08)]">
      <div className="flex items-start gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent"><Building2 size={29} /></div><div><h1 className="text-2xl font-bold tracking-[-0.035em] text-white">{organization.name}</h1><p className="mt-2 flex items-center gap-2 text-sm text-muted"><MapPin size={17} className="text-accent" />{organization.city}</p></div></div>
      {organization.description && <p className="mt-5 max-w-2xl whitespace-pre-line text-sm leading-6 text-muted">{organization.description}</p>}
      {(organization.email || organization.phone || organization.website) && <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4 text-sm">{organization.website && <a href={organization.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 font-semibold text-white hover:border-accent"><Globe2 size={16} className="text-accent" />Сайт</a>}{organization.email && <a href={`mailto:${organization.email}`} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 font-semibold text-white hover:border-accent"><Mail size={16} className="text-accent" />Написать</a>}{organization.phone && <a href={`tel:${organization.phone}`} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 font-semibold text-white hover:border-accent"><Phone size={16} className="text-accent" />{organization.phone}</a>}</div>}
    </section>
    <section className="mt-5"><div className="flex items-center justify-between"><h2 className="text-xl font-bold text-white">Мероприятия</h2><span className="text-sm text-muted">{organization.events.length}</span></div>{organization.events.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{organization.events.map((event) => <Link key={event.id} to={`/events/${event.id}`} className="rounded-[1.35rem] border border-white/[0.08] bg-card p-4 transition hover:border-accent/60"><p className="text-sm font-bold text-white">{event.title}</p><p className="mt-2 text-sm text-muted">{eventDate(event.startsAt)}</p><p className="mt-1 text-sm text-muted">{event.address}</p></Link>)}</div> : <div className="mt-3 rounded-[1.35rem] border border-dashed border-white/15 p-5 text-sm text-muted">Организация пока не опубликовала мероприятий.</div>}</section>
  </div>
}
