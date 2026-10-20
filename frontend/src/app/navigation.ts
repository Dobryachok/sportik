import { Bell, CalendarCheck, CircleCheck, Sparkles, User, PersonStanding } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  shortLabel: string
  icon: LucideIcon
  match?: (path: string) => boolean
  showBadge?: boolean
  authOnly?: boolean
  hideWhenStartComplete?: boolean
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
      p.startsWith('/sport/'),
  },
  {
    to: '/sportik',
    label: 'Спортик',
    shortLabel: 'Спортик',
    icon: PersonStanding,
    authOnly: true,
    match: (p) => p === '/sportik' || p.startsWith('/sportik/'),
  },
  {
    to: '/tamagotchi',
    label: 'Старт',
    shortLabel: 'Старт',
    icon: Sparkles,
    hideWhenStartComplete: true,
    match: (p) => p === '/tamagotchi',
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

export function visibleNavItems(isAuthenticated: boolean, startCompleted = false): NavItem[] {
  return navItems.filter((item) => {
    if (item.authOnly && !isAuthenticated) return false
    if (item.hideWhenStartComplete && startCompleted) return false
    return true
  })
}
