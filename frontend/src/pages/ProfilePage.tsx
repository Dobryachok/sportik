import { Camera, LogOut, MapPin, Pencil } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { PrimaryButton } from '../components/PrimaryButton'

export function ProfilePage() {
  const { currentUser, city, saveProfile, changeAvatar, signOut } = useAppData()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(currentUser?.name ?? '')
  const [bio, setBio] = useState(currentUser?.bio ?? '')
  const [profileCity, setProfileCity] = useState(currentUser?.city || city)
  const [busy, setBusy] = useState(false)

  if (!currentUser) return null

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    if (await saveProfile({ name, bio, city: profileCity })) setEditing(false)
    setBusy(false)
  }

  const avatar = async (file?: File) => {
    if (file) await changeAvatar(file)
  }

  return (
    <div className="mx-auto min-w-0 max-w-full md:max-w-xl">
      <section className="relative overflow-hidden rounded-[1.55rem] border border-white/[0.08] bg-card px-5 pb-5 pt-7 text-center">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(ellipse_at_top,#0f607a_0%,rgba(18,32,38,0)_72%)]" />
        <div className="relative mx-auto h-28 w-28">
          <img
            src={currentUser.avatarUrl || '/images/hero.png'}
            alt={`Аватар ${currentUser.name}`}
            className="h-28 w-28 rounded-full border-[3px] border-card object-cover shadow-[0_10px_25px_rgba(0,0,0,0.35)]"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white shadow-lg"
            aria-label="Загрузить аватар"
          >
            <Camera size={17} />
          </button>
          <input
            ref={inputRef}
            onChange={(event) => void avatar(event.target.files?.[0])}
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            type="file"
          />
        </div>
        <div className="relative mt-4 flex items-center justify-center gap-2">
          <h1 className="text-2xl font-bold tracking-[-0.035em] text-white">{currentUser.name}</h1>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Редактировать профиль"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <Pencil size={15} />
          </button>
        </div>
        <p className="relative mt-2 flex items-center justify-center gap-1.5 text-sm text-muted">
          <MapPin size={15} className="text-accent" />
          {currentUser.city || city || 'Город не выбран'}
        </p>
      </section>

      {editing ? (
        <form onSubmit={save} className="mt-4 space-y-4 rounded-[1.35rem] border border-white/[0.08] bg-card p-5">
          <div>
            <h2 className="text-lg font-bold">Редактировать профиль</h2>
            <p className="mt-1 text-sm text-muted">Эти данные видят участники событий.</p>
          </div>
          <label className="block text-sm font-medium text-white/80">
            Имя
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-bg px-3.5 py-3 text-white outline-none transition-colors focus:border-accent"
            />
          </label>
          <label className="block text-sm font-medium text-white/80">
            О себе
            <textarea
              rows={4}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              className="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-bg px-3.5 py-3 text-white outline-none transition-colors focus:border-accent"
            />
          </label>
          <label className="block text-sm font-medium text-white/80">
            Город
            <input
              value={profileCity}
              onChange={(event) => setProfileCity(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-bg px-3.5 py-3 text-white outline-none transition-colors focus:border-accent"
            />
          </label>
          <div className="flex items-center gap-3">
            <PrimaryButton type="submit" fullWidth disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить'}</PrimaryButton>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="min-h-12 shrink-0 rounded-xl px-3 text-sm font-semibold text-muted transition-colors hover:text-white"
            >
              Отмена
            </button>
          </div>
        </form>
      ) : (
        <section className="mt-4 rounded-[1.35rem] border border-white/[0.08] bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">О себе</h2>
            <button type="button" onClick={() => setEditing(true)} className="text-sm font-semibold text-accent">Изменить</button>
          </div>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted">
            {currentUser.bio || 'Расскажите другим участникам о себе.'}
          </p>
        </section>
      )}

      <button
        type="button"
        onClick={async () => {
          await signOut()
          navigate('/', { replace: true })
        }}
        className="mt-6 flex min-h-11 items-center gap-2 rounded-xl px-1 text-sm font-semibold text-muted transition-colors hover:text-warning"
      >
        <LogOut size={17} /> Выйти из аккаунта
      </button>
    </div>
  )
}
