import { Link, useLocation } from 'react-router-dom'
import { isNavActive, navItems } from '../app/navigation'

export function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-bg/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Основная навигация"
    >
      <ul className="flex min-h-[var(--app-nav-height)] items-center justify-around px-1">
        {navItems.map((item) => {
          const active = isNavActive(item, pathname)
          const Icon = item.icon
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-label={item.label}
                className={`relative flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 px-1.5 py-1 ${
                  active ? 'text-accent' : 'text-muted'
                }`}
              >
                <span className="relative">
                  <Icon size={24} strokeWidth={active ? 2.2 : 1.8} />
                  {item.showBadge && (
                    <span
                      className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-warning"
                      aria-hidden
                    />
                  )}
                </span>
                <span className="hidden max-w-[4.25rem] truncate text-[11px] leading-tight sm:block">
                  {item.shortLabel}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
