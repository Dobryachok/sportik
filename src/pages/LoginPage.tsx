import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { PrimaryButton } from '../components/PrimaryButton'
import { PageHeader } from '../components/PageHeader'

export function LoginPage() {
  const { login, isAuthenticated } = useAppData()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/profile'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true })
  }, [isAuthenticated, navigate, from])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const err = await login(email, password)
    setLoading(false)
    if (err) {
      setError(err)
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="min-w-0 max-w-full md:max-w-md">
      <PageHeader title="Вход" back />
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <p className="rounded-xl bg-warning/15 px-3 py-2 text-sm text-warning">{error}</p>
        )}
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl bg-card px-3 py-2 text-base outline-none focus:ring-1 focus:ring-accent"
          />
        </label>
        <PrimaryButton type="submit" fullWidth disabled={loading}>
          {loading ? 'Вход…' : 'Войти'}
        </PrimaryButton>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        Нет аккаунта?{' '}
        <Link to="/register" className="text-accent">Зарегистрироваться</Link>
      </p>
    </div>
  )
}
