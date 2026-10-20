import { Link, useNavigate } from 'react-router-dom'
import { useState, type FormEvent } from 'react'
import { useAppData } from '../app/AppDataContext'
import { CityChooser } from '../components/CityChooser'
import { LocationPicker } from '../components/LocationPicker'
import { PrimaryButton } from '../components/PrimaryButton'
import { SocialLinksFields } from '../components/SocialLinksFields'
import { ThemeToggle } from '../components/ThemeToggle'
import type { OrganizationApplicationInput } from '../data/api'
import type { SocialLink } from '../data/types'

type AccountType = 'user' | 'organization'

export function RegisterPage() {
  const { signUp, error } = useAppData()
  const navigate = useNavigate()
  const [accountType, setAccountType] = useState<AccountType>('user')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [description, setDescription] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState<number | undefined>()
  const [longitude, setLongitude] = useState<number | undefined>()
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([])
  const [comment, setComment] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    if (accountType === 'organization') {
      if (!orgName.trim() || !city.trim()) {
        setFormError('Укажите название организации и город.')
        return
      }
    }
    setBusy(true)
    let organization: OrganizationApplicationInput | undefined
    if (accountType === 'organization') {
      organization = {
        name: orgName.trim(),
        description: description.trim(),
        city: city.trim(),
        address: address.trim() || undefined,
        latitude,
        longitude,
        email: email.trim(),
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
        socialLinks: socialLinks.filter((item) => item.platform.trim() && item.url.trim()),
        comment: comment.trim() || undefined,
      }
    }
    const ok = await signUp(name, email, password, accountType, organization)
    setBusy(false)
    if (ok) {
      navigate(accountType === 'organization' ? '/org' : '/', { replace: true })
    }
  }

  return (
    <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-lg items-center px-4 py-8">
      <div className="absolute right-4 top-4">
        <ThemeToggle compact />
      </div>
      <section className="w-full rounded-2xl bg-card p-5 shadow-2xl sm:p-7">
        <Link to="/" className="text-sm text-accent">← К событиям</Link>
        <p className="mt-7 text-sm text-muted">Спортик</p>
        <h1 className="mt-1 text-2xl font-bold">Создать аккаунт</h1>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-bg p-1">
          <button
            type="button"
            onClick={() => setAccountType('user')}
            className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${accountType === 'user' ? 'bg-accent text-white' : 'text-muted'}`}
          >
            Участник
          </button>
          <button
            type="button"
            onClick={() => setAccountType('organization')}
            className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${accountType === 'organization' ? 'bg-accent text-white' : 'text-muted'}`}
          >
            Организация
          </button>
        </div>

        <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="text-muted">{accountType === 'organization' ? 'Контактное лицо' : 'Имя'}</span>
            <input
              required
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-xl bg-bg px-3 py-3 outline-none ring-accent focus:ring-1"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Электронная почта</span>
            <input
              required
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-xl bg-bg px-3 py-3 outline-none ring-accent focus:ring-1"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Пароль</span>
            <input
              required
              minLength={10}
              autoComplete="new-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-describedby="password-tip"
              className="mt-1 w-full rounded-xl bg-bg px-3 py-3 outline-none ring-accent focus:ring-1"
            />
            <span id="password-tip" className="mt-1 block text-xs text-muted">
              Минимум 10 символов, с буквами и цифрами.
            </span>
          </label>

          {accountType === 'organization' && (
            <div className="space-y-4 rounded-xl border border-white/10 bg-bg/40 p-4">
              <p className="text-sm font-semibold text-white">Данные организации</p>
              <p className="text-xs text-muted">
                После регистрации заявка попадёт в админ-панель на проверку.
              </p>
              <label className="block text-sm text-muted">
                Название организации *
                <input
                  required
                  maxLength={255}
                  value={orgName}
                  onChange={(event) => setOrgName(event.target.value)}
                  className="mt-1 w-full rounded-xl bg-card px-3 py-2.5 text-white outline-none focus:ring-1 focus:ring-accent"
                />
              </label>
              <label className="block text-sm text-muted">
                Описание
                <textarea
                  maxLength={10000}
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="mt-1 w-full rounded-xl bg-card px-3 py-2.5 text-white outline-none focus:ring-1 focus:ring-accent"
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-card px-3 py-2.5 text-sm text-muted">
                <span>
                  Город: <span className="text-white">{city || 'не выбран'}</span> *
                </span>
                <CityChooser
                  value={city}
                  onChange={(nextCity) => {
                    setCity(nextCity)
                    setLatitude(undefined)
                    setLongitude(undefined)
                    setAddress('')
                  }}
                  label="Город организации"
                />
              </div>
              <LocationPicker
                lockCity
                required={false}
                address={address}
                city={city}
                district=""
                onChange={(location) => {
                  setAddress(location.address)
                  setLatitude(location.latitude)
                  setLongitude(location.longitude)
                }}
              />
              <p className="text-xs text-muted">Адрес на карте необязателен — можно указать только город.</p>
              <label className="block text-sm text-muted">
                Телефон
                <input
                  maxLength={50}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="mt-1 w-full rounded-xl bg-card px-3 py-2.5 text-white"
                />
              </label>
              <label className="block text-sm text-muted">
                Сайт
                <input
                  type="url"
                  placeholder="https://example.org"
                  maxLength={500}
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  className="mt-1 w-full rounded-xl bg-card px-3 py-2.5 text-white"
                />
              </label>
              <SocialLinksFields value={socialLinks} onChange={setSocialLinks} />
              <label className="block text-sm text-muted">
                Комментарий для администратора
                <textarea
                  maxLength={4000}
                  rows={2}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  className="mt-1 w-full rounded-xl bg-card px-3 py-2.5 text-white"
                />
              </label>
            </div>
          )}

          {(formError || error) && (
            <p role="alert" className="text-sm text-warning">{formError || error}</p>
          )}
          <PrimaryButton type="submit" fullWidth disabled={busy}>
            {busy ? 'Создаём…' : accountType === 'organization' ? 'Зарегистрироваться и отправить заявку' : 'Создать аккаунт'}
          </PrimaryButton>
        </form>
        <p className="mt-5 text-center text-sm text-muted">
          Уже есть аккаунт? <Link className="text-accent" to="/login">Войти</Link>
        </p>
      </section>
    </main>
  )
}
