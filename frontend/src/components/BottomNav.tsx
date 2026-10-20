import { Link, useLocation } from 'react-router-dom'
import { isNavActive, navItems } from '../app/navigation'
import { useAppData } from '../app/AppDataContext'

export function BottomNav() {
  const { pathname } = useLocation()
  const { state } = useAppData()
  const hasUnreadNotifications = state.notifications.some((item) => !item.isRead)

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.09] bg-card/95 shadow-[0_-10px_26px_rgba(16,47,67,0.12)] backdrop-blur-xl md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Основная навигация"
    >
      <ul className="mx-auto flex min-h-[var(--app-nav-height)] max-w-md items-center justify-around px-2">
        {navItems.map((item) => {
          const active = isNavActive(item, pathname)
          const Icon = item.icon
          return (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={`relative mx-auto flex min-h-12 max-w-[4.75rem] flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-[10px] font-medium transition-colors ${
                  active ? 'text-accent' : 'text-muted'
                }`}
              >
                <span className="relative">
                  <Icon size={23} strokeWidth={active ? 2.25 : 1.8} />
                  {item.showBadge && hasUnreadNotifications && (
                    <span
                      className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-warning ring-2 ring-card"
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
