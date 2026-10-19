import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { PrimaryButton } from '../components/PrimaryButton'
import { PageHeader } from '../components/PageHeader'
import type { JoinMode } from '../data/types'

export function CreateEventPage() {
  const { state, addNewEvent } = useAppData()
  const navigate = useNavigate()
  const [sportChoice, setSportChoice] = useState(state.sports[0]?.id ?? '')
  const [customSport, setCustomSport] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [district, setDistrict] = useState('левый берег')
  const [startsAt, setStartsAt] = useState('2026-10-26T19:00')
  const [price, setPrice] = useState(400)
  const [capacity, setCapacity] = useState(12)
  const [joinMode, setJoinMode] = useState<JoinMode>('open')
  const [level, setLevel] = useState(2)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const sportName =
      sportChoice === 'custom'
        ? customSport
        : state.sports.find((s) => s.id === sportChoice)?.name ?? customSport
    if (!title.trim() || !sportName.trim()) return

    addNewEvent({
      title,
      description,
      address,
      district,
      startsAt: new Date(startsAt).toISOString(),
      price,
      capacity,
      joinMode,
      level,
      sportName,
    })
    navigate('/events')
  }

  return (
    <div className="min-w-0 max-w-full md:max-w-xl">
      <PageHeader title="Новое событие" back />
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm">
          <span className="text-muted">Название</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base outline-none focus:ring-1 focus:ring-accent"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Описание</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base outline-none focus:ring-1 focus:ring-accent"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Направление</span>
          <select
            value={sportChoice}
            onChange={(e) => setSportChoice(e.target.value)}
            className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base"
          >
            {state.sports.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
            <option value="custom">Свой вариант…</option>
          </select>
        </label>
        {sportChoice === 'custom' && (
          <input
            required
            placeholder="Название вида спорта"
            value={customSport}
            onChange={(e) => setCustomSport(e.target.value)}
            className="w-full rounded-xl bg-card px-3 py-2 text-base"
          />
        )}
        <label className="block text-sm">
          <span className="text-muted">Адрес</span>
          <input
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Район</span>
          <input
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Дата и время</span>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-muted">Цена, ₽</span>
            <input
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Мест</span>
            <input
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base"
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-muted">Режим записи</span>
          <select
            value={joinMode}
            onChange={(e) => setJoinMode(e.target.value as JoinMode)}
            className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base"
          >
            <option value="open">Свободное присоединение</option>
            <option value="application">По заявке</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-muted">Уровень (звёзды)</span>
          <input
            type="number"
            min={1}
            max={5}
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base"
          />
        </label>
        <PrimaryButton type="submit" fullWidth>Опубликовать</PrimaryButton>
      </form>
    </div>
  )
}
