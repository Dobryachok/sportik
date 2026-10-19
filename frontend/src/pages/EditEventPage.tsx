import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { PageHeader } from '../components/PageHeader'
import { PrimaryButton } from '../components/PrimaryButton'
import type { JoinMode } from '../data/types'

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
  const [sportName, setSportName] = useState(state.sports.find((sport) => sport.id === event?.sportId)?.name ?? '')
  const [startsAt, setStartsAt] = useState(event ? localDateTime(event.startsAt) : '')
  const [price, setPrice] = useState(event?.price ?? 0)
  const [capacity, setCapacity] = useState(event?.capacity ?? 1)
  const [joinMode, setJoinMode] = useState<JoinMode>(event?.joinMode ?? 'open')
  const [level, setLevel] = useState(event?.level ?? 1)
  const [busy, setBusy] = useState(false)

  if (!event) return <p className="text-muted">Событие не найдено. <Link to="/events" className="text-accent">Открыть каталог</Link></p>
  if (event.organizerUserId !== currentUser?.id) return <p className="text-muted">Редактировать событие может только организатор.</p>

  const save = async (form: FormEvent) => {
    form.preventDefault()
    if (!title.trim() || !sportName.trim() || !address.trim() || !city.trim()) return
    setBusy(true)
    const ok = await editEvent(event.id, {
      title, description, address, city, district,
      sportName, startsAt: new Date(startsAt).toISOString(),
      price, capacity, joinMode, level, minAge: event.minAge,
    })
    setBusy(false)
    if (ok) navigate(`/events/${event.id}`)
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Изменить событие" back />
      <form onSubmit={(form) => void save(form)} className="space-y-4">
        <label className="block text-sm text-muted">Название
          <input required maxLength={255} value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-xl bg-card px-3 py-2.5 text-white" />
        </label>
        <label className="block text-sm text-muted">Описание
          <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-xl bg-card px-3 py-2.5 text-white" />
        </label>
        <label className="block text-sm text-muted">Направление
          <input required maxLength={100} value={sportName} onChange={(e) => setSportName(e.target.value)} className="mt-1 w-full rounded-xl bg-card px-3 py-2.5 text-white" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-muted">Город
            <input required maxLength={150} value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 w-full rounded-xl bg-card px-3 py-2.5 text-white" />
          </label>
          <label className="block text-sm text-muted">Район
            <input value={district} onChange={(e) => setDistrict(e.target.value)} className="mt-1 w-full rounded-xl bg-card px-3 py-2.5 text-white" />
          </label>
        </div>
        <label className="block text-sm text-muted">Адрес
          <input required maxLength={255} value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1 w-full rounded-xl bg-card px-3 py-2.5 text-white" />
        </label>
        <label className="block text-sm text-muted">Дата и время
          <input required type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="mt-1 w-full rounded-xl bg-card px-3 py-2.5 text-white" />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm text-muted">Цена, ₽
            <input required type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} className="mt-1 w-full rounded-xl bg-card px-3 py-2.5 text-white" />
          </label>
          <label className="block text-sm text-muted">Мест
            <input required type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className="mt-1 w-full rounded-xl bg-card px-3 py-2.5 text-white" />
          </label>
          <label className="block text-sm text-muted">Уровень
            <input required type="number" min={1} max={5} value={level} onChange={(e) => setLevel(Number(e.target.value))} className="mt-1 w-full rounded-xl bg-card px-3 py-2.5 text-white" />
          </label>
        </div>
        <label className="block text-sm text-muted">Запись
          <select value={joinMode} onChange={(e) => setJoinMode(e.target.value as JoinMode)} className="mt-1 w-full rounded-xl bg-card px-3 py-2.5 text-white">
            <option value="open">Свободная</option><option value="application">По заявке</option>
          </select>
        </label>
        <PrimaryButton type="submit" fullWidth disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить изменения'}</PrimaryButton>
      </form>
    </div>
  )
}
