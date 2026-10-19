import { migrateAuthState } from './authRepository'
import { createSeedState } from './seed'
import type {
  AppState,
  Comment,
  Event,
  JoinMode,
  Participation,
  ParticipationStatus,
  Sport,
} from './types'

const STORAGE_KEY = 'sport-together-db'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9а-яё-]/gi, '')
    .slice(0, 48) || `sport-${Date.now()}`
}

export function loadState(): AppState {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const seed = createSeedState()
    saveState(seed)
    return seed
  }
  try {
    const parsed = JSON.parse(raw) as AppState
    const seed = createSeedState()
    const migrated = migrateAuthState(parsed, seed)
    if (JSON.stringify(migrated) !== JSON.stringify(parsed)) {
      saveState(migrated)
    }
    return migrated
  } catch {
    const seed = createSeedState()
    saveState(seed)
    return seed
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function resetToSeed(): AppState {
  const seed = createSeedState()
  saveState(seed)
  return seed
}

export function setCity(state: AppState, city: string): AppState {
  const next = { ...state, city }
  saveState(next)
  return next
}

export function toggleFavorite(state: AppState, eventId: string): AppState {
  const set = new Set(state.favorites)
  if (set.has(eventId)) set.delete(eventId)
  else set.add(eventId)
  const next = { ...state, favorites: [...set] }
  saveState(next)
  return next
}

export function toggleLike(state: AppState, eventId: string): AppState {
  const set = new Set(state.likedEvents)
  if (set.has(eventId)) set.delete(eventId)
  else set.add(eventId)
  const next = { ...state, likedEvents: [...set] }
  saveState(next)
  return next
}

export function getPublishedEvents(state: AppState): Event[] {
  return state.events.filter((e) => e.status === 'published')
}

export function getEventParticipants(state: AppState, eventId: string): Participation[] {
  return state.participations.filter(
    (p) => p.eventId === eventId && p.status === 'confirmed',
  )
}

export function getUserParticipation(
  state: AppState,
  eventId: string,
  userId: string,
): Participation | undefined {
  return state.participations.find((p) => p.eventId === eventId && p.userId === userId)
}

export function joinEvent(state: AppState, eventId: string, userId: string): AppState {
  const event = state.events.find((e) => e.id === eventId)
  if (!event || event.status !== 'published') return state

  const existing = getUserParticipation(state, eventId, userId)
  if (existing) return state

  const confirmedCount = getEventParticipants(state, eventId).length
  if (confirmedCount >= event.capacity && event.joinMode === 'open') return state

  const status: ParticipationStatus =
    event.joinMode === 'open' ? 'confirmed' : 'pending'

  const participation: Participation = {
    id: `part-${Date.now()}`,
    eventId,
    userId,
    status,
    createdAt: new Date().toISOString(),
  }

  const next = {
    ...state,
    participations: [...state.participations, participation],
  }
  saveState(next)
  return next
}

export function reviewParticipation(
  state: AppState,
  participationId: string,
  status: 'confirmed' | 'rejected',
): AppState {
  const next = {
    ...state,
    participations: state.participations.map((p) =>
      p.id === participationId ? { ...p, status } : p,
    ),
  }
  saveState(next)
  return next
}

export function addComment(
  state: AppState,
  eventId: string,
  authorId: string,
  text: string,
): AppState {
  const comment: Comment = {
    id: `c-${Date.now()}`,
    eventId,
    authorId,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  }
  const next = { ...state, comments: [...state.comments, comment] }
  saveState(next)
  return next
}

export function findOrCreateSport(state: AppState, name: string): { state: AppState; sport: Sport } {
  const trimmed = name.trim()
  const existing = state.sports.find((s) => s.name.toLowerCase() === trimmed.toLowerCase())
  if (existing) return { state, sport: existing }

  const sport: Sport = {
    id: `sp-${Date.now()}`,
    name: trimmed,
    slug: slugify(trimmed),
    eventCount: 0,
  }
  const next = { ...state, sports: [...state.sports, sport] }
  saveState(next)
  return { state: next, sport }
}

export interface CreateEventInput {
  title: string
  description: string
  address: string
  district?: string
  startsAt: string
  price: number
  capacity: number
  joinMode: JoinMode
  level: number
  sportName: string
  minAge?: number
}

export function createEvent(state: AppState, organizerUserId: string, input: CreateEventInput): AppState {
  const { state: withSport, sport } = findOrCreateSport(state, input.sportName)

  const event: Event = {
    id: `ev-${Date.now()}`,
    sportId: sport.id,
    organizerUserId,
    title: input.title.trim(),
    description: input.description.trim(),
    address: input.address.trim(),
    district: input.district,
    city: withSport.city,
    startsAt: input.startsAt,
    price: input.price,
    capacity: input.capacity,
    joinMode: input.joinMode,
    status: 'published',
    level: input.level,
    minAge: input.minAge,
    imageUrl: '/images/hero.png',
    gallery: ['/images/hero.png'],
    rating: 4,
    eventType: 'game',
  }

  const sports = withSport.sports.map((s) =>
    s.id === sport.id ? { ...s, eventCount: (s.eventCount ?? 0) + 1 } : s,
  )

  const next = {
    ...withSport,
    sports,
    events: [...withSport.events, event],
  }
  saveState(next)
  return next
}
