import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { PrimaryButton } from '../components/PrimaryButton'
import { PageHeader } from '../components/PageHeader'

export function RegisterPage() {
  const { register, state, isAuthenticated } = useAppData()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [city, setCity] = useState(state.city)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) navigate('/profile', { replace: true })
  }, [isAuthenticated, navigate])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const err = await register({ name, email, password, city })
    setLoading(false)
    if (err) {
      setError(err)
      return
    }
    navigate('/profile', { replace: true })
  }

  return (
    <div className="min-w-0 max-w-full md:max-w-md">
      <PageHeader title="Регистрация" back />
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <p className="rounded-xl bg-warning/15 px-3 py-2 text-sm text-warning">{error}</p>
        )}
        <label className="block text-sm">
          <span className="text-muted">Имя</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base outline-none focus:ring-1 focus:ring-accent"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base outline-none focus:ring-1 focus:ring-accent"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Пароль</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base outline-none focus:ring-1 focus:ring-accent"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Город</span>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base outline-none focus:ring-1 focus:ring-accent"
          />
        </label>
        <PrimaryButton type="submit" fullWidth disabled={loading}>
          {loading ? 'Создание…' : 'Зарегистрироваться'}
        </PrimaryButton>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        Уже есть аккаунт?{' '}
        <Link to="/login" className="text-accent">Войти</Link>
      </p>
    </div>
  )
}
