import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { CityChooser } from '../components/CityChooser'
import { LocationPicker } from '../components/LocationPicker'
import { PageHeader } from '../components/PageHeader'
import { PrimaryButton } from '../components/PrimaryButton'
import { StarPicker } from '../components/StarRating'
import type { Event, JoinMode } from '../data/types'

function localDateTime(iso: string) {
  const date = new Date(iso)
  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function EditEventPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, currentUser, editEvent } = useAppData()
  const event = state.events.find((item) => item.id === id)
  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [address, setAddress] = useState(event?.address ?? '')
  const [city, setCity] = useState(event?.city ?? '')
  const [district, setDistrict] = useState(event?.district ?? '')
  const [latitude, setLatitude] = useState<number | undefined>(event?.latitude ?? undefined)
  const [longitude, setLongitude] = useState<number | undefined>(event?.longitude ?? undefined)
  const [sportName, setSportName] = useState(state.sports.find((sport) => sport.id === event?.sportId)?.name ?? '')
  const [eventType, setEventType] = useState<NonNullable<Event['eventType']>>(event?.eventType ?? 'game')
  const [startsAt, setStartsAt] = useState(event ? localDateTime(event.startsAt) : '')
  const [capacity, setCapacity] = useState(event?.capacity ?? 1)
  const [joinMode, setJoinMode] = useState<JoinMode>(event?.joinMode ?? 'open')
  const [level, setLevel] = useState(event?.level ?? 1)
  const [busy, setBusy] = useState(false)

  if (!event) return <p className="text-muted">Событие не найдено. <Link to="/events" className="text-accent">Открыть каталог</Link></p>
  if (event.organizerUserId !== currentUser?.id) return <p className="text-muted">Редактировать событие может только организатор.</p>

  const chooseCity = (nextCity: string) => {
    setCity(nextCity)
    setLatitude(undefined)
    setLongitude(undefined)
  }

  const save = async (form: FormEvent) => {
    form.preventDefault()
    if (!title.trim() || !sportName.trim() || !address.trim() || !city.trim()) return
    setBusy(true)
    const ok = await editEvent(event.id, {
      title, description, address, city, district: district || undefined, sportName,
      startsAt: new Date(startsAt).toISOString(), capacity, joinMode, level, minAge: event.minAge,
      eventType, latitude, longitude,
    })
    setBusy(false)
    if (ok) navigate(`/events/${event.id}`)
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Изменить событие" back />
      <form onSubmit={(form) => void save(form)} className="space-y-4">
        <label className="block text-sm text-muted">Формат
          <select value={eventType} onChange={(form) => setEventType(form.target.value as NonNullable<Event['eventType']>)} className="mt-1 w-full rounded-xl bg-card px-3 py-2.5 text-white"><option value="game">Игра</option><option value="training">Тренировка</option><option value="tournament">Турнир</option></select>
        </label>
        <label className="block text-sm text-muted">Название
          <input required maxLength={255} value={title} onChange={(form) => setTitle(form.target.value)} className="mt-1 w-full rounded-xl bg-card px-3 py-2.5 text-white" />
        </label>
        <label className="block text-sm text-muted">Описание
          <textarea rows={4} value={description} onChange={(form) => setDescription(form.target.value)} className="mt-1 w-full rounded-xl bg-card px-3 py-2.5 text-white" />
        </label>
        <label className="block text-sm text-muted">Вид спорта
          <input required maxLength={100} value={sportName} onChange={(form) => setSportName(form.target.value)} className="mt-1 w-full rounded-xl bg-card px-3 py-2.5 text-white" />
        </label>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-card px-3 py-2.5 text-sm text-muted">
          <span>Город: <span className="text-white">{city || 'не выбран'}</span></span>
          <CityChooser value={city} onChange={chooseCity} label="Город события" />
        </div>
        <LocationPicker
          required
          address={address}
          city={city}
          district={district}
          onChange={(location) => {
            setAddress(location.address)
            setCity(location.city)
            setDistrict(location.district)
            setLatitude(location.latitude)
            setLongitude(location.longitude)
          }}
        />
        <label className="block text-sm text-muted">Район
          <input value={district} onChange={(form) => setDistrict(form.target.value)} placeholder="Заполнится после выбора адреса" className="mt-1 w-full rounded-xl bg-card px-3 py-2.5 text-white" />
        </label>
        <label className="block text-sm text-muted">Дата и время
          <input required type="datetime-local" value={startsAt} onChange={(form) => setStartsAt(form.target.value)} className="mt-1 w-full rounded-xl bg-card px-3 py-2.5 text-white" />
        </label>
        <label className="block text-sm text-muted">Мест
          <input required type="number" min={1} value={capacity} onChange={(form) => setCapacity(Number(form.target.value))} className="mt-1 w-full rounded-xl bg-card px-3 py-2.5 text-white" />
        </label>
        <label className="block text-sm text-muted">Уровень
          <span className="mt-2 block"><StarPicker value={level} onChange={setLevel} /></span>
          <span className="mt-1 block text-xs">От 0,5 до 5 звёзд с шагом 0,5.</span>
        </label>
        <label className="block text-sm text-muted">Запись
          <select value={joinMode} onChange={(form) => setJoinMode(form.target.value as JoinMode)} className="mt-1 w-full rounded-xl bg-card px-3 py-2.5 text-white"><option value="open">Свободная</option><option value="application">По заявке</option></select>
        </label>
        <PrimaryButton type="submit" fullWidth disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить изменения'}</PrimaryButton>
      </form>
    </div>
  )
}
