import { ArrowLeft, Camera, Link2, LogOut, MapPin, Pencil, Plus, ShieldCheck, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { PrimaryButton } from '../components/PrimaryButton'
import { ThemeToggle } from '../components/ThemeToggle'
import type { SocialLink } from '../data/types'

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
  const [hasCar, setHasCar] = useState(
    currentUser?.hasCar === null || currentUser?.hasCar === undefined ? '' : currentUser.hasCar ? 'yes' : 'no',
  )
  const [workSchedule, setWorkSchedule] = useState(currentUser?.workSchedule ?? '')
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(currentUser?.socialLinks ?? [])
  const [busy, setBusy] = useState(false)

  if (!currentUser) return null

  const resetForm = () => {
    setName(currentUser.name)
    setBio(currentUser.bio ?? '')
    setProfileCity(currentUser.city || city)
    setBirthDate(currentUser.birthDate?.slice(0, 10) ?? '')
    setMaritalStatus(currentUser.maritalStatus ?? '')
    setHasCar(currentUser.hasCar === null || currentUser.hasCar === undefined ? '' : currentUser.hasCar ? 'yes' : 'no')
    setWorkSchedule(currentUser.workSchedule ?? '')
    setSocialLinks(currentUser.socialLinks ?? [])
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
      hasCar: hasCar === '' ? null : hasCar === 'yes',
      workSchedule: workSchedule || null,
      socialLinks: socialLinks
        .map((item) => ({ platform: item.platform.trim(), label: item.label?.trim() || '', url: item.url.trim() }))
        .filter((item) => item.platform && item.url),
    })
    if (saved) setEditing(false)
    setBusy(false)
  }

  const avatar = async (file?: File) => {
    if (file) await changeAvatar(file)
  }

  const updateSocialLink = (index: number, field: keyof SocialLink, value: string) => {
    setSocialLinks((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item))
  }
  const addSocialLink = () => {
    if (socialLinks.length < 5) setSocialLinks((items) => [...items, { platform: '', label: '', url: '' }])
  }
  const removeSocialLink = (index: number) => setSocialLinks((items) => items.filter((_, itemIndex) => itemIndex !== index))

  const stats = currentUser.stats ?? { events: 0, subscriptions: 0, followers: 0 }
  const infoRows = [
    { label: 'Семейное положение', value: optionalValue(currentUser.maritalStatus) },
    {
      label: 'Автомобиль',
      value: currentUser.hasCar === null || currentUser.hasCar === undefined
        ? 'Не выбрано'
        : currentUser.hasCar ? 'Есть' : 'Нет',
    },
    { label: 'График работы', value: optionalValue(currentUser.workSchedule) },
  ]

  return (
    <div className="page-frame pb-5">
      <header className="mb-4 flex h-10 items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Назад"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white transition-colors hover:bg-white/[0.07]"
        >
          <ArrowLeft size={23} />
        </button>
        <div className="flex items-center gap-2"><span className="text-sm font-bold text-muted">Профиль</span><ThemeToggle compact /></div>
      </header>

      <section className="rounded-[1.7rem] border border-white/[0.08] bg-card px-4 pb-5 pt-6 text-center shadow-[0_12px_32px_rgba(10,64,96,0.08)] sm:px-7">
        <div className="relative mx-auto h-28 w-28">
          <img
            src={currentUser.avatarUrl || '/images/hero.png'}
            alt={`Аватар ${currentUser.name}`}
            className="h-28 w-28 rounded-full border-[3px] border-white/70 object-cover shadow-[0_10px_24px_rgba(10,47,67,0.22)]"
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
        <h1 className="mt-4 text-[1.7rem] font-bold leading-none tracking-[-0.04em] text-white">
          {currentUser.name}{currentUser.age ? `, ${currentUser.age}` : ''}
        </h1>
        <p className="mt-2 flex items-center justify-center gap-2 text-base text-muted">
          <MapPin size={20} className="text-white/75" />
          {currentUser.city || city || 'Город не выбран'}
        </p>

        {!editing && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
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
          <div className="mt-6 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-5">
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
        <form onSubmit={save} className="mt-5 rounded-[1.7rem] border border-white/[0.08] bg-card p-4 sm:p-5">
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
          <div className="space-y-4">
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
            <label className="block text-sm font-medium text-white/85">
              Автомобиль
              <select value={hasCar} onChange={(event) => setHasCar(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-bg px-3.5 py-3 text-white outline-none transition-colors focus:border-accent">
                <option value="">Не выбрано</option>
                <option value="yes">Есть</option>
                <option value="no">Нет</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-white/85">
              График работы
              <input value={workSchedule} onChange={(event) => setWorkSchedule(event.target.value)} placeholder="Например, 5/2" className="mt-1.5 w-full rounded-xl border border-white/10 bg-bg px-3.5 py-3 text-white outline-none transition-colors focus:border-accent" />
            </label>
            <label className="block text-sm font-medium text-white/85">
              О себе
              <textarea rows={4} value={bio} onChange={(event) => setBio(event.target.value)} className="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-bg px-3.5 py-3 text-white outline-none transition-colors focus:border-accent" />
            </label>
            <section className="rounded-xl border border-white/10 bg-bg/50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div><h3 className="font-semibold text-white">Социальные сети</h3><p className="mt-0.5 text-xs text-muted">До пяти ссылок, которые будут видны в профиле.</p></div>
                <button type="button" onClick={addSocialLink} disabled={socialLinks.length >= 5} className="inline-flex items-center gap-1 text-sm font-semibold text-accent disabled:text-muted"><Plus size={16} /> Добавить</button>
              </div>
              <div className="mt-3 space-y-3">
                {socialLinks.map((item, index) => (
                  <div key={index} className="relative grid gap-2 rounded-lg border border-white/[0.08] p-2.5 sm:grid-cols-2">
                    <label className="text-xs text-muted">Сеть<input required value={item.platform} onChange={(event) => updateSocialLink(index, 'platform', event.target.value)} placeholder="Telegram" className="mt-1 w-full rounded-lg border border-white/10 bg-card px-2.5 py-2 text-sm text-white outline-none focus:border-accent" /></label>
                    <label className="pr-8 text-xs text-muted">Название (необязательно)<input value={item.label ?? ''} onChange={(event) => updateSocialLink(index, 'label', event.target.value)} placeholder="@nickname" className="mt-1 w-full rounded-lg border border-white/10 bg-card px-2.5 py-2 text-sm text-white outline-none focus:border-accent" /></label>
                    <label className="sm:col-span-2 text-xs text-muted">Ссылка<input required type="url" value={item.url} onChange={(event) => updateSocialLink(index, 'url', event.target.value)} placeholder="https://…" className="mt-1 w-full rounded-lg border border-white/10 bg-card px-2.5 py-2 text-sm text-white outline-none focus:border-accent" /></label>
                    <button type="button" onClick={() => removeSocialLink(index)} aria-label="Удалить ссылку" className="absolute right-2 top-2 rounded-md p-1.5 text-muted hover:bg-white/10 hover:text-white"><X size={15} /></button>
                  </div>
                ))}
              </div>
              {socialLinks.length === 0 && <button type="button" onClick={addSocialLink} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-accent"><Link2 size={16} /> Добавить соцсеть</button>}
            </section>
            {error && <p role="alert" className="rounded-xl bg-warning/10 px-3 py-2 text-sm text-warning">{error}</p>}
            <PrimaryButton type="submit" fullWidth disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить профиль'}</PrimaryButton>
          </div>
        </form>
      ) : (
        <>
          <section className="mt-5 rounded-[1.7rem] border border-white/[0.08] bg-card p-4 sm:p-5">
            <h2 className="text-lg font-bold">Дополнительная информация</h2>
            <div className="mt-4 divide-y divide-white/[0.12] border-y border-white/[0.12]">
              {infoRows.map((row) => (
                <div key={row.label} className="flex min-h-16 items-center justify-between gap-5 py-4 text-base">
                  <span className="font-semibold text-white">{row.label}</span>
                  <span className="text-right font-semibold text-white/90">{row.value}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="mt-5 rounded-[1.7rem] border border-white/[0.08] bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold">О себе</h2>
              <button type="button" onClick={openEditing} className="text-sm font-semibold text-accent">Изменить</button>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted">{currentUser.bio || 'Добавьте немного информации о себе.'}</p>
          </section>
          <section className="mt-5 rounded-[1.7rem] border border-white/[0.08] bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4"><h2 className="text-lg font-bold">Социальные сети</h2><button type="button" onClick={openEditing} className="inline-flex items-center gap-1 text-sm font-semibold text-accent"><Plus size={16} /> Добавить соцсеть</button></div>
            {currentUser.socialLinks?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {currentUser.socialLinks.map((item) => <a key={`${item.platform}:${item.url}`} href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-card px-3 py-2 text-sm font-semibold text-white transition-colors hover:border-accent"><Link2 size={15} className="text-accent" />{item.label || item.platform}</a>)}
              </div>
            ) : <p className="mt-2 text-sm text-muted">Добавьте ссылки, чтобы участникам было проще связаться с вами.</p>}
          </section>
        </>
      )}

      {currentUser?.role === 'admin' && <Link to="/admin" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-accent/50 px-4 text-sm font-semibold text-accent hover:bg-accent/10"><ShieldCheck size={17} />Администрирование</Link>}
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
