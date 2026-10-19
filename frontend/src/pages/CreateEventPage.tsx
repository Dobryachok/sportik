import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { CityChooser } from '../components/CityChooser'
import { LocationPicker } from '../components/LocationPicker'
import { PageHeader } from '../components/PageHeader'
import { PrimaryButton } from '../components/PrimaryButton'
import type { Event, JoinMode } from '../data/types'

const eventTypes: Array<{ value: NonNullable<Event['eventType']>; label: string }> = [
  { value: 'game', label: 'Игра' },
  { value: 'training', label: 'Тренировка' },
  { value: 'tournament', label: 'Турнир' },
]

export function CreateEventPage() {
  const { state, city, addNewEvent } = useAppData()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [sportChoice, setSportChoice] = useState(state.sports[0]?.id ?? 'custom')
  const [customSport, setCustomSport] = useState('')
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
  const [price, setPrice] = useState(400)
  const [capacity, setCapacity] = useState(12)
  const [joinMode, setJoinMode] = useState<JoinMode>('open')
  const [level, setLevel] = useState(2)

  const submit = async (form: React.FormEvent) => {
    form.preventDefault()
    const sportName = sportChoice === 'custom' ? customSport : state.sports.find((sport) => sport.id === sportChoice)?.name ?? customSport
    if (!title.trim() || !sportName.trim() || !address.trim() || !locationCity.trim()) return
    const created = await addNewEvent({
      title, description, address, district: district || undefined, city: locationCity,
      startsAt: new Date(startsAt).toISOString(), price, capacity, joinMode, level, sportName,
      eventType, latitude, longitude,
    })
    if (created) navigate(eventType === 'tournament' ? '/tournaments' : '/events')
  }

  return (
    <div className="min-w-0 max-w-full md:max-w-xl">
      <PageHeader title={eventType === 'tournament' ? 'Новый турнир' : 'Новое событие'} back />
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm">
          <span className="text-muted">Формат</span>
          <select value={eventType} onChange={(event) => setEventType(event.target.value as NonNullable<Event['eventType']>)} className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base outline-none focus:ring-1 focus:ring-accent">
            {eventTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        {eventType === 'tournament' && <p className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-white/90">Спортсмены с опытом в этой специализации получат приглашение.</p>}
        <label className="block text-sm">
          <span className="text-muted">Название</span>
          <input required value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base outline-none focus:ring-1 focus:ring-accent" />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Описание</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base outline-none focus:ring-1 focus:ring-accent" />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Направление</span>
          <select value={sportChoice} onChange={(event) => setSportChoice(event.target.value)} className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base">
            {state.sports.map((sport) => <option key={sport.id} value={sport.id}>{sport.name}</option>)}
            <option value="custom">Свой вариант…</option>
          </select>
        </label>
        {sportChoice === 'custom' && <input required placeholder="Название вида спорта" value={customSport} onChange={(event) => setCustomSport(event.target.value)} className="w-full rounded-xl bg-card px-3 py-2 text-base" />}
        <div className="flex items-center justify-between gap-3 rounded-xl bg-card px-3 py-2 text-sm text-muted">
          <span>Город: <span className="text-white">{locationCity || 'не выбран'}</span></span>
          <CityChooser />
        </div>
        <label className="block text-sm text-muted">Город события
          <input required value={locationCity} onChange={(event) => { setLocationCity(event.target.value); setLatitude(undefined); setLongitude(undefined) }} className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-white outline-none focus:ring-1 focus:ring-accent" />
        </label>
        <LocationPicker
          required
          address={address}
          city={locationCity}
          district={district}
          onChange={(location) => {
            setAddress(location.address)
            setLocationCity(location.city)
            setDistrict(location.district)
            setLatitude(location.latitude)
            setLongitude(location.longitude)
          }}
        />
        <label className="block text-sm text-muted">Район
          <input value={district} onChange={(event) => setDistrict(event.target.value)} placeholder="Заполнится после выбора адреса" className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-white outline-none focus:ring-1 focus:ring-accent" />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Дата и время</span>
          <input required type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm"><span className="text-muted">Цена, ₽</span><input required type="number" min={0} value={price} onChange={(event) => setPrice(Number(event.target.value))} className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base" /></label>
          <label className="block text-sm"><span className="text-muted">Мест</span><input required type="number" min={1} value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base" /></label>
        </div>
        <label className="block text-sm"><span className="text-muted">Режим записи</span>
          <select value={joinMode} onChange={(event) => setJoinMode(event.target.value as JoinMode)} className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base"><option value="open">Свободное присоединение</option><option value="application">По заявке</option></select>
        </label>
        <label className="block text-sm"><span className="text-muted">Уровень (звёзды)</span><input required type="number" min={1} max={5} value={level} onChange={(event) => setLevel(Number(event.target.value))} className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base" /></label>
        <PrimaryButton type="submit" fullWidth>{eventType === 'tournament' ? 'Опубликовать турнир' : 'Опубликовать'}</PrimaryButton>
      </form>
    </div>
  )
}
