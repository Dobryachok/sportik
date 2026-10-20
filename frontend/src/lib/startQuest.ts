import type { AppState, User } from '../data/types'

export function hasStartProfile(user: User | null): boolean {
  return Boolean(user?.city && user.bio?.trim())
}

export function hasStartEvent(state: AppState, userId?: string): boolean {
  if (!userId) return false
  return state.participations.some(
    (item) => item.userId === userId && (item.status === 'confirmed' || item.status === 'pending'),
  )
}

export function isStartQuestComplete(city: string, user: User | null, state: AppState): boolean {
  return Boolean(city) && hasStartProfile(user) && hasStartEvent(state, user?.id)
}
