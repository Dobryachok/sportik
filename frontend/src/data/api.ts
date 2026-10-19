import type { AppState, Comment, Event, User } from './types'
import type { CreateEventInput } from './selectors'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isFormData = init.body instanceof FormData
  const response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(!isFormData && init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })
  if (!response.ok) {
    let message = 'Не удалось выполнить запрос. Попробуйте ещё раз.'
    try {
      const body = (await response.json()) as { detail?: unknown }
      if (typeof body.detail === 'string' && body.detail) message = body.detail
    } catch { /* a useful generic message is already set */ }
    throw new ApiError(message, response.status)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const fetchState = (city?: string) => request<AppState>(`/state${city ? `?city=${encodeURIComponent(city)}` : ''}`)
export const fetchMe = () => request<User | null>('/auth/me')
export const register = (input: { email: string; password: string; name: string }) => request<User>('/auth/register', { method: 'POST', body: JSON.stringify(input) })
export const login = (input: { email: string; password: string }) => request<User>('/auth/login', { method: 'POST', body: JSON.stringify(input) })
export const logout = () => request<void>('/auth/logout', { method: 'POST' })
export const updateProfile = (input: Partial<Pick<User, 'name' | 'bio' | 'city'>>) => request<User>('/profile', { method: 'PATCH', body: JSON.stringify(input) })
export const uploadAvatar = (file: File) => { const body = new FormData(); body.append('file', file); return request<User>('/profile/avatar', { method: 'POST', body }) }
export const reverseGeocode = (latitude: number, longitude: number) => request<{ city: string }>('/geo/reverse', { method: 'POST', body: JSON.stringify({ latitude, longitude }) })
export const fetchEvent = (eventId: string) => request<Event>(`/events/${encodeURIComponent(eventId)}`)
export const fetchComments = (eventId: string) => request<Comment[]>(`/events/${encodeURIComponent(eventId)}/comments`)
export const createEvent = (input: CreateEventInput) => request<{ id: string }>('/events', { method: 'POST', body: JSON.stringify(input) })
export const updateEvent = (eventId: string, input: CreateEventInput) => request<{ id: string }>(`/events/${encodeURIComponent(eventId)}`, { method: 'PATCH', body: JSON.stringify(input) })
export const joinEvent = (eventId: string) => request<{ status: 'confirmed' | 'pending' }>(`/events/${encodeURIComponent(eventId)}/join`, { method: 'POST' })
export const addComment = (eventId: string, text: string) => request<{ created: boolean }>(`/events/${encodeURIComponent(eventId)}/comments`, { method: 'POST', body: JSON.stringify({ text }) })
export const reviewParticipation = (participationId: string, decision: 'confirmed' | 'rejected') => request<{ status: 'confirmed' | 'rejected' }>(`/participations/${encodeURIComponent(participationId.replace(/^part-/, ''))}/review?decision=${decision}`, { method: 'POST' })
export const toggleFavorite = (eventId: string) => request<{ active: boolean }>(`/events/${encodeURIComponent(eventId)}/favorite`, { method: 'POST' })
export const toggleLike = (eventId: string) => request<{ active: boolean }>(`/events/${encodeURIComponent(eventId)}/like`, { method: 'POST' })
