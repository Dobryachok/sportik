import type { AppState, Comment, Event, LocationSuggestion, User } from './types'
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

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
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
      if (typeof body.detail === 'string' && body.detail) {
        message = body.detail
      } else if (Array.isArray(body.detail)) {
        const parts = body.detail
          .map((item) => {
            if (!item || typeof item !== 'object') return ''
            const entry = item as { msg?: string; loc?: unknown[] }
            const field = Array.isArray(entry.loc) ? entry.loc.filter((part) => part !== 'body').join('.') : ''
            const text = entry.msg ?? ''
            return field ? `${field}: ${text}` : text
          })
          .filter(Boolean)
        if (parts.length) message = parts.join('; ')
      }
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
export const updateProfile = (input: Partial<Pick<User, 'name' | 'bio' | 'city' | 'birthDate' | 'maritalStatus' | 'gender' | 'hasCar' | 'workSchedule' | 'socialLinks' | 'interests'>>) => request<User>('/profile', { method: 'PATCH', body: JSON.stringify(input) })
export const completeStartQuest = () => request<User>('/profile/start-complete', { method: 'POST' })
export const uploadAvatar = (file: File) => { const body = new FormData(); body.append('file', file); return request<User>('/profile/avatar', { method: 'POST', body }) }
export const reverseGeocode = (latitude: number, longitude: number) => request<{ city: string }>('/geo/reverse', { method: 'POST', body: JSON.stringify({ latitude, longitude }) })
export const suggestAddresses = (query: string, city?: string, signal?: AbortSignal) => request<LocationSuggestion[]>(`/geo/suggest?query=${encodeURIComponent(query)}${city ? `&city=${encodeURIComponent(city)}` : ''}`, { signal })
export const fetchEvent = (eventId: string) => request<Event>(`/events/${encodeURIComponent(eventId)}`)
export const fetchUser = (userId: string) => request<User>(`/users/${encodeURIComponent(userId)}`)
export const toggleUserFollow = (userId: string) => request<{ active: boolean }>(`/users/${encodeURIComponent(userId)}/follow`, { method: 'POST' })
export const fetchFollowers = () =>
  request<Array<{ id: string; name: string; avatarUrl?: string; city: string }>>('/profile/followers')
export const fetchFollowing = () =>
  request<Array<{ id: string; name: string; avatarUrl?: string; city: string }>>('/profile/following')
export const requestSport = (name: string) => request<{ id: string; status: 'pending' }>('/sports/requests', { method: 'POST', body: JSON.stringify({ name }) })
export interface PendingSport { id: string; name: string; slug: string; createdAt: string; requestedById?: string; requestedByName?: string }

export interface AdminSportCatalogItem {
  id: string
  name: string
  slug: string
  backgroundImage?: string | null
}

export interface OrganizationApplicationInput {
  name: string
  description: string
  city: string
  latitude: number
  longitude: number
  email?: string
  phone?: string
  website?: string
  comment?: string
}

export interface OwnedOrganization {
  id: string
  name: string
  description: string
  city: string
  latitude: number
  longitude: number
  email?: string | null
  phone?: string | null
  website?: string | null
  status: 'pending' | 'approved' | 'rejected'
  role: 'owner' | 'member'
  applicationComment?: string | null
  reviewComment?: string | null
  reviewedAt?: string | null
}

export interface PendingOrganization extends OrganizationApplicationInput {
  id: string
  requestedById: string
  requestedByName: string
  createdAt: string
}

export interface PublicOrganization {
  id: string
  name: string
  description: string
  city: string
  latitude: number
  longitude: number
  email?: string | null
  phone?: string | null
  website?: string | null
  events: Event[]
}

export interface AdminEvent {
  id: string
  title: string
  city: string
  startsAt: string
  status: 'published' | 'unpublished'
  organizerId: string
  organizerName: string
  organizationId?: string | null
  organizationName?: string | null
}

export const requestOrganization = (input: OrganizationApplicationInput) => request<{ id: string; status: 'pending' }>('/organizations/applications', { method: 'POST', body: JSON.stringify(input) })
export const fetchMyOrganizations = () => request<OwnedOrganization[]>('/organizations/mine')
export const fetchPendingOrganizations = () => request<PendingOrganization[]>('/admin/organizations')
export const reviewOrganization = (organizationId: string, decision: 'approved' | 'rejected', comment = '') => request<{ id: string; status: string }>(`/admin/organizations/${encodeURIComponent(organizationId)}`, { method: 'PATCH', body: JSON.stringify({ decision, comment }) })
export const fetchOrganization = (organizationId: string) => request<PublicOrganization>(`/organizations/${encodeURIComponent(organizationId)}`)
export const fetchAdminEvents = (status: 'published' | 'unpublished' = 'published') => request<AdminEvent[]>(`/admin/events?status_value=${status.toUpperCase()}`)
export const moderateEvent = (eventId: string, action: 'unpublish' | 'remove', reason = '') => request<{ id: string; status: 'unpublished' }>(`/admin/events/${encodeURIComponent(eventId)}/moderation`, { method: 'PATCH', body: JSON.stringify({ action, reason }) })
export const fetchPendingSports = () => request<PendingSport[]>('/admin/sports')
export const fetchAdminSportCatalog = () => request<AdminSportCatalogItem[]>('/admin/sports/catalog')
export const updatePendingSport = (sportId: string, input: { name?: string; slug?: string }) =>
  request<PendingSport & { status: string }>(`/admin/sports/${encodeURIComponent(sportId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })

export const reviewSport = (
  sportId: string,
  decision: 'approved' | 'rejected',
  input?: { name?: string; slug?: string },
) =>
  request<{ id: string; name: string; slug: string; status: string }>(
    `/admin/sports/${encodeURIComponent(sportId)}`,
    { method: 'PATCH', body: JSON.stringify({ decision, ...input }) },
  )

export const uploadSportBackground = (sportId: string, file: File) => {
  const body = new FormData()
  body.append('file', file)
  return request<{ backgroundImage: string }>(`/admin/sports/${encodeURIComponent(sportId)}/background`, { method: 'POST', body })
}

export const deleteSportBackground = (sportId: string) =>
  request<{ ok: boolean }>(`/admin/sports/${encodeURIComponent(sportId)}/background`, { method: 'DELETE' })

export const deleteApprovedSport = (sportId: string) =>
  request<{ ok: boolean }>(`/admin/sports/${encodeURIComponent(sportId)}`, { method: 'DELETE' })
export const fetchEventParticipants = (eventId: string) => request<User[]>(`/events/${encodeURIComponent(eventId)}/participants`)
export const fetchComments = (eventId: string) => request<Comment[]>(`/events/${encodeURIComponent(eventId)}/comments`)
export const createEvent = (input: CreateEventInput) => request<{ id: string }>('/events', { method: 'POST', body: JSON.stringify(input) })
export const updateEvent = (eventId: string, input: CreateEventInput) => request<{ id: string }>(`/events/${encodeURIComponent(eventId)}`, { method: 'PATCH', body: JSON.stringify(input) })
export const joinEvent = (eventId: string) => request<{ status: 'confirmed' | 'pending' | 'waitlist' }>(`/events/${encodeURIComponent(eventId)}/join`, { method: 'POST' })
export const joinEventAsTeam = (eventId: string, teamId: string) =>
  request<{ registered: number; waitlisted: number; pending: number }>(
    `/events/${encodeURIComponent(eventId)}/join-team`,
    { method: 'POST', body: JSON.stringify({ teamId }) },
  )
export const leaveEvent = (eventId: string) => request<void>(`/events/${encodeURIComponent(eventId)}/join`, { method: 'DELETE' })
export const addComment = (eventId: string, text: string) => request<{ created: boolean }>(`/events/${encodeURIComponent(eventId)}/comments`, { method: 'POST', body: JSON.stringify({ text }) })
export const dismissNotification = (notificationId: string) => request<void>(`/notifications/${encodeURIComponent(notificationId)}/dismiss`, { method: 'PATCH' })
export const reviewParticipation = (participationId: string, decision: 'confirmed' | 'rejected') => request<{ status: 'confirmed' | 'rejected' }>(`/participations/${encodeURIComponent(participationId.replace(/^part-/, ''))}/review?decision=${decision}`, { method: 'POST' })
export const toggleFavorite = (eventId: string) => request<{ active: boolean }>(`/events/${encodeURIComponent(eventId)}/favorite`, { method: 'POST' })
export const toggleLike = (eventId: string) => request<{ active: boolean }>(`/events/${encodeURIComponent(eventId)}/like`, { method: 'POST' })
