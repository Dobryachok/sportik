import { ShieldCheck } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { isNavActive, navItems } from '../app/navigation'
import { ThemeToggle } from './ThemeToggle'

export function Sidebar() {
  const { pathname } = useLocation()
  const { currentUser } = useAppData()

  return (
    <aside className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:border-r md:border-white/10 md:bg-card/30 md:px-3 md:py-6">
      <div className="mb-8 px-2">
        <span className="text-xl font-extrabold tracking-[-0.04em] text-accent">Спортик</span>
        <p className="mt-0.5 text-xs text-muted">Найдите свою игру</p>
      </div>
      <nav className="flex flex-col gap-1" aria-label="Основная навигация">
        {navItems.map((item) => {
          const active = isNavActive(item, pathname)
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          )
        })}
        {currentUser?.role === 'admin' && <Link to="/admin" className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${pathname === '/admin' ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-white/5 hover:text-white'}`}><ShieldCheck size={20} />Администрирование</Link>}
      </nav>
      <div className="mt-auto px-2 pt-6"><ThemeToggle /></div>
    </aside>
  )
}
