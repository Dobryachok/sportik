import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAppData } from '../app/AppDataContext'
import { PrimaryButton } from '../components/PrimaryButton'

export function LoginPage() {
  const { signIn, error } = useAppData(); const navigate = useNavigate(); const location = useLocation()
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false)
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); if (await signIn(email, password)) navigate((location.state as { from?: string } | null)?.from || '/', { replace: true }); setBusy(false) }
  return <main className="mx-auto flex min-h-[100dvh] w-full max-w-md items-center px-4 py-8"><section className="w-full rounded-2xl bg-card p-5 shadow-2xl sm:p-7"><Link to="/" className="text-sm text-accent">← К событиям</Link><p className="mt-7 text-sm text-muted">СпортВместе</p><h1 className="mt-1 text-2xl font-bold">Войти в аккаунт</h1><form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm"><span className="text-muted">Электронная почта</span><input required autoComplete="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-xl bg-bg px-3 py-3 outline-none ring-accent focus:ring-1" /></label><label className="block text-sm"><span className="text-muted">Пароль</span><input required minLength={10} autoComplete="current-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl bg-bg px-3 py-3 outline-none ring-accent focus:ring-1" /></label>{error && <p role="alert" className="text-sm text-warning">{error}</p>}<PrimaryButton type="submit" fullWidth disabled={busy}>{busy ? 'Входим…' : 'Войти'}</PrimaryButton></form><p className="mt-5 text-center text-sm text-muted">Нет аккаунта? <Link className="text-accent" to="/register">Зарегистрироваться</Link></p></section></main>
}
