import { ArrowLeft, Camera, LogOut, MapPin, Pencil } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { PrimaryButton } from '../components/PrimaryButton'

const maritalOptions = [
  { value: '', label: 'Не выбрано' },
  { value: 'Не женат / не замужем', label: 'Не женат / не замужем' },
  { value: 'В отношениях', label: 'В отношениях' },
  { value: 'Женат / замужем', label: 'Женат / замужем' },
]

function optionalValue(value: string | null | undefined) {
  return value?.trim() || 'Не выбрано'
}

export function ProfilePage() {
  const { currentUser, city, error, saveProfile, changeAvatar, signOut } = useAppData()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(currentUser?.name ?? '')
  const [bio, setBio] = useState(currentUser?.bio ?? '')
  const [profileCity, setProfileCity] = useState(currentUser?.city || city)
  const [birthDate, setBirthDate] = useState(currentUser?.birthDate?.slice(0, 10) ?? '')
  const [maritalStatus, setMaritalStatus] = useState(currentUser?.maritalStatus ?? '')
  const [childrenCount, setChildrenCount] = useState(
    currentUser?.childrenCount === null || currentUser?.childrenCount === undefined ? '' : String(currentUser.childrenCount),
  )
  const [hasCar, setHasCar] = useState(
    currentUser?.hasCar === null || currentUser?.hasCar === undefined ? '' : currentUser.hasCar ? 'yes' : 'no',
  )
  const [workSchedule, setWorkSchedule] = useState(currentUser?.workSchedule ?? '')
  const [busy, setBusy] = useState(false)

  if (!currentUser) return null

  const resetForm = () => {
    setName(currentUser.name)
    setBio(currentUser.bio ?? '')
    setProfileCity(currentUser.city || city)
    setBirthDate(currentUser.birthDate?.slice(0, 10) ?? '')
    setMaritalStatus(currentUser.maritalStatus ?? '')
    setChildrenCount(currentUser.childrenCount === null || currentUser.childrenCount === undefined ? '' : String(currentUser.childrenCount))
    setHasCar(currentUser.hasCar === null || currentUser.hasCar === undefined ? '' : currentUser.hasCar ? 'yes' : 'no')
    setWorkSchedule(currentUser.workSchedule ?? '')
  }

  const openEditing = () => {
    resetForm()
    setEditing(true)
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    const saved = await saveProfile({
      name,
      bio,
      city: profileCity,
      birthDate: birthDate || null,
      maritalStatus: maritalStatus || null,
      childrenCount: childrenCount === '' ? null : Number(childrenCount),
      hasCar: hasCar === '' ? null : hasCar === 'yes',
      workSchedule: workSchedule || null,
    })
    if (saved) setEditing(false)
    setBusy(false)
  }

  const avatar = async (file?: File) => {
    if (file) await changeAvatar(file)
  }

  const stats = currentUser.stats ?? { events: 0, subscriptions: 0, followers: 0 }
  const infoRows = [
    { label: 'Семейное положение', value: optionalValue(currentUser.maritalStatus) },
    {
      label: 'Дети',
      value: currentUser.childrenCount === null || currentUser.childrenCount === undefined
        ? 'Не выбрано'
        : currentUser.childrenCount === 0 ? 'Нет' : `${currentUser.childrenCount}`,
    },
    {
      label: 'Автомобиль',
      value: currentUser.hasCar === null || currentUser.hasCar === undefined
        ? 'Не выбрано'
        : currentUser.hasCar ? 'Есть' : 'Нет',
    },
    { label: 'График работы', value: optionalValue(currentUser.workSchedule) },
  ]

  return (
    <div className="mx-auto min-w-0 max-w-full pb-5 md:max-w-xl">
      <header className="mb-4 flex h-10 items-center">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Назад"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white transition-colors hover:bg-white/[0.07]"
        >
          <ArrowLeft size={25} />
        </button>
      </header>

      <section className="px-1 pb-7 text-center">
        <div className="relative mx-auto h-36 w-36">
          <img
            src={currentUser.avatarUrl || '/images/hero.png'}
            alt={`Аватар ${currentUser.name}`}
            className="h-36 w-36 rounded-full border-[3px] border-white/70 object-cover shadow-[0_14px_28px_rgba(0,0,0,0.35)]"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-xl border-2 border-card bg-accent text-white shadow-lg"
            aria-label="Загрузить аватар"
          >
            <Camera size={18} />
          </button>
          <input
            ref={inputRef}
            onChange={(event) => void avatar(event.target.files?.[0])}
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            type="file"
          />
        </div>
        <h1 className="mt-5 text-[1.7rem] font-bold leading-none tracking-[-0.04em] text-white">
          {currentUser.name}{currentUser.age ? `, ${currentUser.age}` : ''}
        </h1>
        <p className="mt-3 flex items-center justify-center gap-2 text-lg text-muted">
          <MapPin size={20} className="text-white/75" />
          {currentUser.city || city || 'Город не выбран'}
        </p>

        {!editing && (
          <div className="mt-8 grid gap-3">
            <button
              type="button"
              onClick={openEditing}
              className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-accent bg-transparent px-5 text-base font-bold text-accent transition-colors hover:bg-accent/10"
            >
              <Pencil size={18} /> Редактировать профиль
            </button>
            <Link
              to="/create-event"
              className="flex min-h-14 items-center justify-center rounded-2xl bg-accent px-5 text-base font-bold text-white shadow-[0_8px_20px_rgba(0,174,239,0.22)] transition-colors hover:bg-accent-hover"
            >
              Создать событие
            </Link>
          </div>
        )}

        {!editing && (
          <div className="mt-9 grid grid-cols-3 divide-x divide-white/10">
            <div>
              <p className="text-2xl font-bold text-accent">{stats.events}</p>
              <p className="mt-1 text-sm text-muted">событий</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-accent">{stats.subscriptions}</p>
              <p className="mt-1 text-sm text-muted">подписок</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-accent">{stats.followers}</p>
              <p className="mt-1 text-sm text-muted">подписчиков</p>
            </div>
          </div>
        )}
      </section>

      {editing ? (
        <form onSubmit={save} className="border-t-8 border-black/30 px-1 pt-7">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Информация о себе</h2>
              <p className="mt-1 text-sm text-muted">Все поля можно изменить в любой момент.</p>
            </div>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-sm font-semibold text-muted transition-colors hover:text-white"
            >
              Отмена
            </button>
          </div>
          <div className="space-y-4 rounded-[1.35rem] border border-white/[0.08] bg-card p-4">
            <label className="block text-sm font-medium text-white/85">
              Имя
              <input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-bg px-3.5 py-3 text-white outline-none transition-colors focus:border-accent" />
            </label>
            <label className="block text-sm font-medium text-white/85">
              Город
              <input value={profileCity} onChange={(event) => setProfileCity(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-bg px-3.5 py-3 text-white outline-none transition-colors focus:border-accent" />
            </label>
            <label className="block text-sm font-medium text-white/85">
              Дата рождения
              <input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-bg px-3.5 py-3 text-white outline-none transition-colors focus:border-accent" />
            </label>
            <label className="block text-sm font-medium text-white/85">
              Семейное положение
              <select value={maritalStatus} onChange={(event) => setMaritalStatus(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-bg px-3.5 py-3 text-white outline-none transition-colors focus:border-accent">
                {maritalOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-white/85">
                Дети
                <select value={childrenCount} onChange={(event) => setChildrenCount(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-bg px-3.5 py-3 text-white outline-none transition-colors focus:border-accent">
                  <option value="">Не выбрано</option>
                  {[0, 1, 2, 3, 4, 5].map((count) => <option key={count} value={count}>{count === 0 ? 'Нет' : count}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-white/85">
                Автомобиль
                <select value={hasCar} onChange={(event) => setHasCar(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-bg px-3.5 py-3 text-white outline-none transition-colors focus:border-accent">
                  <option value="">Не выбрано</option>
                  <option value="yes">Есть</option>
                  <option value="no">Нет</option>
                </select>
              </label>
            </div>
            <label className="block text-sm font-medium text-white/85">
              График работы
              <input value={workSchedule} onChange={(event) => setWorkSchedule(event.target.value)} placeholder="Например, 5/2" className="mt-1.5 w-full rounded-xl border border-white/10 bg-bg px-3.5 py-3 text-white outline-none transition-colors focus:border-accent" />
            </label>
            <label className="block text-sm font-medium text-white/85">
              О себе
              <textarea rows={4} value={bio} onChange={(event) => setBio(event.target.value)} className="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-bg px-3.5 py-3 text-white outline-none transition-colors focus:border-accent" />
            </label>
            {error && <p role="alert" className="rounded-xl bg-warning/10 px-3 py-2 text-sm text-warning">{error}</p>}
            <PrimaryButton type="submit" fullWidth disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить профиль'}</PrimaryButton>
          </div>
        </form>
      ) : (
        <>
          <section className="border-t-8 border-black/30 px-1 py-7">
            <h2 className="text-xl font-bold">Дополнительная информация</h2>
            <div className="mt-5 divide-y divide-white/[0.12] border-y border-white/[0.12]">
              {infoRows.map((row) => (
                <div key={row.label} className="flex min-h-16 items-center justify-between gap-5 py-4 text-base">
                  <span className="font-semibold text-white">{row.label}</span>
                  <span className="text-right font-semibold text-white/90">{row.value}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="px-1 pb-2">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold">О себе</h2>
              <button type="button" onClick={openEditing} className="text-sm font-semibold text-accent">Изменить</button>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted">{currentUser.bio || 'Добавьте немного информации о себе.'}</p>
          </section>
        </>
      )}

      <button
        type="button"
        onClick={async () => {
          await signOut()
          navigate('/', { replace: true })
        }}
        className="mt-7 flex min-h-11 items-center gap-2 rounded-xl px-1 text-sm font-semibold text-muted transition-colors hover:text-warning"
      >
        <LogOut size={17} /> Выйти из аккаунта
      </button>
    </div>
  )
}
