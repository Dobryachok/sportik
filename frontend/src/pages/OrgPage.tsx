import { Building2, CircleCheck, Clock3, Plus, XCircle } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { CityChooser } from '../components/CityChooser'
import { LocationPicker } from '../components/LocationPicker'
import { PageHeader } from '../components/PageHeader'
import { PrimaryButton } from '../components/PrimaryButton'
import { fetchMyOrganizations, requestOrganization, type OwnedOrganization } from '../data/api'

export function OrgPage() {
  const { city: userCity } = useAppData()
  const [organizations, setOrganizations] = useState<OwnedOrganization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [city, setCity] = useState(userCity)
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState<number | undefined>()
  const [longitude, setLongitude] = useState<number | undefined>()
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [comment, setComment] = useState('')

  const loadOrganizations = async () => {
    setLoading(true)
    try {
      setOrganizations(await fetchMyOrganizations())
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось загрузить организацию.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadOrganizations() }, [])

  const submit = async (form: FormEvent) => {
    form.preventDefault()
    if (busy || !name.trim() || !city.trim() || latitude === undefined || longitude === undefined) {
      setError('Укажите название, город и выберите точку на карте.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await requestOrganization({
        name: name.trim(), description: description.trim(), city, latitude, longitude,
        email: email.trim() || undefined, phone: phone.trim() || undefined,
        website: website.trim() || undefined, comment: comment.trim() || undefined,
      })
      setName('')
      setDescription('')
      setAddress('')
      setLatitude(undefined)
      setLongitude(undefined)
      setEmail('')
      setPhone('')
      setWebsite('')
      setComment('')
      await loadOrganizations()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось отправить заявку.')
    } finally {
      setBusy(false)
    }
  }

  const pending = organizations.find((organization) => organization.status === 'pending')
  const approved = organizations.filter((organization) => organization.status === 'approved')

  return (
    <div className="page-frame pb-8">
      <PageHeader title="Организация" back />
      <section className="rounded-[1.5rem] border border-white/[0.08] bg-card p-5 shadow-[0_12px_32px_rgba(10,64,96,0.08)]">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent"><Building2 size={23} /></div>
          <div><h1 className="text-xl font-bold text-white">Кабинет организации</h1><p className="mt-1 text-sm leading-5 text-muted">Подайте заявку один раз. После одобрения публикуйте встречи от имени организации без повторной модерации.</p></div>
        </div>
      </section>

      {loading ? <p className="py-8 text-center text-sm text-muted">Загружаем данные…</p> : <>
        {approved.map((organization) => <section key={organization.id} className="mt-4 rounded-[1.5rem] border border-accent/25 bg-card p-5">
          <div className="flex items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-sm font-bold text-accent"><CircleCheck size={17} />Одобрена</p><h2 className="mt-2 text-xl font-bold text-white">{organization.name}</h2><p className="mt-1 text-sm text-muted">{organization.city}</p></div><Building2 className="text-accent" /></div>
          {organization.description && <p className="mt-4 text-sm leading-6 text-muted">{organization.description}</p>}
          <div className="mt-5 flex flex-wrap gap-3"><Link to={`/organizations/${organization.id}`} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:border-accent">Страница организации</Link><Link to={`/create-event?organization=${encodeURIComponent(organization.id)}`} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white hover:bg-accent-hover"><Plus size={17} />Создать событие</Link></div>
        </section>)}

        {pending && <section className="mt-4 rounded-[1.5rem] border border-amber-400/25 bg-card p-5"><p className="flex items-center gap-2 text-sm font-bold text-amber-400"><Clock3 size={17} />На рассмотрении</p><h2 className="mt-2 text-xl font-bold text-white">{pending.name}</h2><p className="mt-2 text-sm leading-6 text-muted">Заявка принята. Мы отправим уведомление, когда администратор примет решение.</p>{pending.applicationComment && <p className="mt-3 rounded-xl bg-bg px-3 py-2 text-sm text-muted">Комментарий: {pending.applicationComment}</p>}</section>}

        {!pending && <section className="mt-4 rounded-[1.5rem] border border-white/[0.08] bg-card p-5">
          {organizations.some((organization) => organization.status === 'rejected') && <div className="mb-5 rounded-xl border border-rose-400/25 bg-rose-400/10 p-3"><p className="flex items-center gap-2 text-sm font-bold text-rose-300"><XCircle size={17} />Предыдущая заявка отклонена</p><p className="mt-1 text-sm text-muted">{organizations.find((organization) => organization.status === 'rejected')?.reviewComment || 'Уточните информацию и отправьте новую заявку.'}</p></div>}
          <h2 className="text-lg font-bold text-white">Заявка на регистрацию</h2><p className="mt-1 text-sm text-muted">Поля со звёздочкой обязательны для рассмотрения.</p>
          <form onSubmit={(form) => void submit(form)} className="mt-5 space-y-4">
            <label className="block text-sm text-muted">Название организации *<input required maxLength={255} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-xl bg-bg px-3 py-2.5 text-white outline-none focus:ring-1 focus:ring-accent" /></label>
            <label className="block text-sm text-muted">Описание<textarea maxLength={10000} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full rounded-xl bg-bg px-3 py-2.5 text-white outline-none focus:ring-1 focus:ring-accent" /></label>
            <div className="flex items-center justify-between rounded-xl bg-bg px-3 py-2.5 text-sm text-muted"><span>Город: <span className="text-white">{city || 'не выбран'}</span></span><CityChooser value={city} onChange={(nextCity) => { setCity(nextCity); setLatitude(undefined); setLongitude(undefined) }} label="Город организации" /></div>
            <LocationPicker required address={address} city={city} district="" onChange={(location) => { setAddress(location.address); setCity(location.city); setLatitude(location.latitude); setLongitude(location.longitude) }} />
            <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm text-muted">Почта<input type="email" maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-xl bg-bg px-3 py-2.5 text-white" /></label><label className="block text-sm text-muted">Телефон<input maxLength={50} value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 w-full rounded-xl bg-bg px-3 py-2.5 text-white" /></label></div>
            <label className="block text-sm text-muted">Сайт<input type="url" placeholder="https://example.org" maxLength={500} value={website} onChange={(event) => setWebsite(event.target.value)} className="mt-1 w-full rounded-xl bg-bg px-3 py-2.5 text-white" /></label>
            <label className="block text-sm text-muted">Комментарий для администратора<textarea maxLength={4000} rows={3} value={comment} onChange={(event) => setComment(event.target.value)} className="mt-1 w-full rounded-xl bg-bg px-3 py-2.5 text-white" /></label>
            {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
            <PrimaryButton type="submit" fullWidth disabled={busy}>{busy ? 'Отправляем…' : 'Отправить заявку'}</PrimaryButton>
          </form>
        </section>}
      </>}
    </div>
  )
}
