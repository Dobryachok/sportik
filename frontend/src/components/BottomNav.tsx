import { Link, useLocation } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { isNavActive, visibleNavItems } from '../app/navigation'

export function BottomNav() {
  const { pathname } = useLocation()
  const { currentUser } = useAppData()
  const items = visibleNavItems(Boolean(currentUser))

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.09] bg-[#15191d]/95 shadow-[0_-10px_26px_rgba(0,0,0,0.22)] backdrop-blur-xl md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Основная навигация"
    >
      <ul className="mx-auto flex min-h-[var(--app-nav-height)] max-w-lg items-center justify-around px-1">
        {items.map((item) => {
          const active = isNavActive(item, pathname)
          const Icon = item.icon
          return (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={`relative mx-auto flex min-h-12 max-w-[4.25rem] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[9px] font-medium transition-colors ${
                  active ? 'text-accent' : 'text-muted'
                }`}
              >
                <span className="relative">
                  <Icon size={20} strokeWidth={active ? 2.25 : 1.8} />
                  {item.showBadge && (
                    <span
                      className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-warning ring-2 ring-[#15191d]"
                      aria-hidden
                    />
                  )}
                </span>
                <span className="max-w-full truncate">{item.shortLabel}</span>
                {active && <span className="absolute -bottom-px h-0.5 w-6 rounded-full bg-accent" />}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
