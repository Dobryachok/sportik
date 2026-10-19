import type { AppState, Event, Participation } from './types'

export interface CreateEventInput {
  title: string
  description: string
  address: string
  district?: string
  city?: string
  startsAt: string
  price: number
  capacity: number
  joinMode: 'open' | 'application'
  level: number
  sportName: string
  minAge?: number
}

export function getPublishedEvents(state: AppState): Event[] {
  return state.events.filter((event) => event.status === 'published')
}

export function getEventParticipants(state: AppState, eventId: string): Participation[] {
  return state.participations.filter(
    (participation) => participation.eventId === eventId && participation.status === 'confirmed',
  )
}

export function getUserParticipation(
  state: AppState,
  eventId: string,
  userId: string,
): Participation | undefined {
  return state.participations.find(
    (participation) => participation.eventId === eventId && participation.userId === userId,
  )
}
