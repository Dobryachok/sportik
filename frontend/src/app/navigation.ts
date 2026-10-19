import { Bell, CalendarCheck, CircleCheck, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  shortLabel: string
  icon: LucideIcon
  match?: (path: string) => boolean
  showBadge?: boolean
}

export const navItems: NavItem[] = [
  {
    to: '/',
    label: 'События',
    shortLabel: 'События',
    icon: CalendarCheck,
    match: (p) =>
      p === '/' ||
      p.startsWith('/events') ||
      p.startsWith('/create-event') ||
      p.startsWith('/sport'),
  },
  {
    to: '/notifications',
    label: 'Уведомления',
    shortLabel: 'Уведом.',
    icon: Bell,
    showBadge: true,
    match: (p) => p === '/notifications',
  },
  {
    to: '/my-events',
    label: 'Мои события',
    shortLabel: 'Мои',
    icon: CircleCheck,
    match: (p) => p === '/my-events',
  },
  {
    to: '/profile',
    label: 'Профиль',
    shortLabel: 'Профиль',
    icon: User,
    match: (p) => p === '/profile',
  },
]

export function isNavActive(item: NavItem, pathname: string): boolean {
  if (item.match) return item.match(pathname)
  return pathname === item.to
}
