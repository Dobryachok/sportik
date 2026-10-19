import { Link, useLocation } from 'react-router-dom'
import { isNavActive, navItems } from '../app/navigation'

export function Sidebar() {
  const { pathname } = useLocation()

  return (
    <aside className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:border-r md:border-white/10 md:bg-card/30 md:px-3 md:py-6">
      <div className="mb-8 px-2">
        <span className="text-lg font-bold text-accent">Кто Куда</span>
        <p className="text-xs text-muted">СпортВместе</p>
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
      </nav>
    </aside>
  )
}
