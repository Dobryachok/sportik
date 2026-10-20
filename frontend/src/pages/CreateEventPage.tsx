import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { CityChooser } from '../components/CityChooser'
import { LocationPicker } from '../components/LocationPicker'
import { PageHeader } from '../components/PageHeader'
import { PrimaryButton } from '../components/PrimaryButton'
import { StarPicker } from '../components/StarRating'
import { fetchMyOrganizations, requestSport, type OwnedOrganization } from '../data/api'
import type { Event, JoinMode } from '../data/types'

const eventTypes: Array<{ value: NonNullable<Event['eventType']>; label: string }> = [
  { value: 'game', label: 'Игра' },
  { value: 'training', label: 'Тренировка' },
  { value: 'tournament', label: 'Турнир' },
]

export function CreateEventPage() {
  const { state, city, addNewEvent, refresh } = useAppData()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedSport = state.sports.find((sport) => sport.id === searchParams.get('sport') || sport.slug === searchParams.get('sport'))
  const [sportChoice, setSportChoice] = useState(requestedSport?.id ?? state.sports[0]?.id ?? '')
  const [sportRequestName, setSportRequestName] = useState('')
  const [sportRequestStatus, setSportRequestStatus] = useState('')
  const [sportRequestBusy, setSportRequestBusy] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [locationCity, setLocationCity] = useState(city)
  const [district, setDistrict] = useState('')
  const [latitude, setLatitude] = useState<number | undefined>()
  const [longitude, setLongitude] = useState<number | undefined>()
  const [eventType, setEventType] = useState<NonNullable<Event['eventType']>>(searchParams.get('type') === 'tournament' ? 'tournament' : 'game')
  const [startsAt, setStartsAt] = useState(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}T19:00`
  })
  const [capacity, setCapacity] = useState(12)
  const [joinMode, setJoinMode] = useState<JoinMode>('open')
  const [level, setLevel] = useState(2)
  const [ownedOrganizations, setOwnedOrganizations] = useState<OwnedOrganization[]>([])
  const [organizationId, setOrganizationId] = useState(searchParams.get('organization') ?? '')
  const [addressError, setAddressError] = useState('')

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    let cancelled = false
    void fetchMyOrganizations()
      .then((items) => {
        if (cancelled) return
        const approved = items.filter((item) => item.status === 'approved' && item.role === 'owner')
        setOwnedOrganizations(approved)
        if (organizationId && !approved.some((item) => item.id === organizationId)) setOrganizationId('')
      })
      .catch(() => { if (!cancelled) setOwnedOrganizations([]) })
    return () => { cancelled = true }
  }, [])

  const chooseCity = (nextCity: string) => {
    setLocationCity(nextCity)
    setLatitude(undefined)
    setLongitude(undefined)
  }

  const submitSportRequest = async () => {
    const name = sportRequestName.trim()
    if (!name || sportRequestBusy) return
    setSportRequestBusy(true)
    setSportRequestStatus('')
    try {
      await requestSport(name)
      setSportRequestName('')
      await refresh()
      setSportRequestStatus('Заявка отправлена администратору. После одобрения вид спорта появится в списке — обновите страницу, если его нет.')
    } catch (cause) {
      setSportRequestStatus(cause instanceof Error ? cause.message : 'Не удалось отправить заявку.')
    } finally {
      setSportRequestBusy(false)
    }
  }

  const submit = async (form: FormEvent) => {
    form.preventDefault()
    const sportName = state.sports.find((sport) => sport.id === sportChoice)?.name ?? ''
    if (!title.trim() || !sportName.trim() || !address.trim() || !locationCity.trim()) return
    if (latitude == null || longitude == null) {
      setAddressError('Выберите существующий адрес из подсказок.')
      return
    }
    setAddressError('')
    const created = await addNewEvent({
      title, description, address, district: district || undefined, city: locationCity,
      startsAt: new Date(startsAt).toISOString(), capacity, joinMode, level, sportName,
      eventType, latitude, longitude, organizationId: organizationId || undefined,
    })
    if (created) navigate(eventType === 'tournament' ? '/tournaments' : '/events')
  }

  return (
    <div className="page-frame">
      <PageHeader title={eventType === 'tournament' ? 'Новый турнир' : 'Новое событие'} back />
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm">
          <span className="text-muted">Формат</span>
          <select value={eventType} onChange={(event) => setEventType(event.target.value as NonNullable<Event['eventType']>)} className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base outline-none focus:ring-1 focus:ring-accent">
            {eventTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        {eventType === 'tournament' && <p className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-white/90">Спортсмены с опытом в этой специализации получат приглашение.</p>}
        {ownedOrganizations.length > 0 && <label className="block text-sm">
          <span className="text-muted">Публикует</span>
          <select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base outline-none focus:ring-1 focus:ring-accent">
            <option value="">От своего имени</option>
            {ownedOrganizations.map((organization) => <option key={organization.id} value={organization.id}>От имени «{organization.name}»</option>)}
          </select>
          <span className="mt-1 block text-xs text-muted">События одобренной организации публикуются сразу.</span>
        </label>}
        <label className="block text-sm">
          <span className="text-muted">Название</span>
          <input required value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base outline-none focus:ring-1 focus:ring-accent" />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Описание</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base outline-none focus:ring-1 focus:ring-accent" />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Вид спорта</span>
          <select required value={sportChoice} onChange={(event) => setSportChoice(event.target.value)} className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base">
            {!sportChoice && <option value="" disabled>Выберите вид спорта</option>}
            {state.sports.map((sport) => <option key={sport.id} value={sport.id}>{sport.name}</option>)}
          </select>
        </label>
        <section className="rounded-xl border border-white/10 bg-card p-3">
          <p className="text-sm font-semibold text-white">Нет нужного вида спорта?</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">Предложите его администратору. Создать мероприятие с ним можно будет после одобрения.</p>
          <div className="mt-3 flex gap-2">
            <input value={sportRequestName} onChange={(event) => setSportRequestName(event.target.value)} maxLength={100} placeholder="Например, бадминтон" className="min-w-0 flex-1 rounded-lg bg-bg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent" />
            <button type="button" disabled={!sportRequestName.trim() || sportRequestBusy} onClick={() => void submitSportRequest()} className="shrink-0 rounded-lg border border-accent px-3 text-sm font-semibold text-accent disabled:opacity-60">{sportRequestBusy ? '…' : 'Предложить'}</button>
          </div>
          {sportRequestStatus && <p role="status" className="mt-2 text-xs text-muted">{sportRequestStatus}</p>}
        </section>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-card px-3 py-2 text-sm text-muted">
          <span>Город события: <span className="text-white">{locationCity || 'не выбран'}</span></span>
          <CityChooser value={locationCity} onChange={chooseCity} label="Город события" />
        </div>
        <LocationPicker
          required
          address={address}
          city={locationCity}
          district={district}
          latitude={latitude}
          longitude={longitude}
          onChange={(location) => {
            setAddressError('')
            setAddress(location.address)
            setLocationCity(location.city)
            setDistrict(location.district)
            setLatitude(location.latitude)
            setLongitude(location.longitude)
          }}
        />
        {addressError && <p role="alert" className="text-sm text-warning">{addressError}</p>}
        <label className="block text-sm text-muted">Район
          <input value={district} onChange={(event) => setDistrict(event.target.value)} placeholder="Заполнится после выбора адреса" className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-white outline-none focus:ring-1 focus:ring-accent" />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Дата и время</span>
          <input required type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base" />
        </label>
        <label className="block text-sm"><span className="text-muted">Мест</span><input required type="number" min={1} value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base" /></label>
        <label className="block text-sm">
          <span className="text-muted">Уровень</span>
          <span className="mt-2 block"><StarPicker value={level} onChange={setLevel} /></span>
          <span className="mt-1 block text-xs text-muted">Выберите от 0,5 до 5 звёзд с шагом 0,5.</span>
        </label>
        <label className="block text-sm"><span className="text-muted">Режим записи</span>
          <select value={joinMode} onChange={(event) => setJoinMode(event.target.value as JoinMode)} className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base"><option value="open">Свободное присоединение</option><option value="application">По заявке</option></select>
        </label>
        <PrimaryButton type="submit" fullWidth>{eventType === 'tournament' ? 'Опубликовать турнир' : 'Опубликовать'}</PrimaryButton>
      </form>
    </div>
  )
}
