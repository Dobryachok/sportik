export type UserRole = 'user' | 'organization' | 'admin'

export type OrgStatus = 'pending' | 'approved' | 'rejected'

export type JoinMode = 'open' | 'application'

export type EventStatus = 'published' | 'unpublished'

export type ParticipationStatus = 'confirmed' | 'pending' | 'rejected' | 'cancelled'

export interface SocialLink {
  platform: string
  url: string
  label?: string
}

export interface User {
  id: string
  name: string
  age?: number
  city: string
  role: UserRole
  avatarUrl?: string
  bio?: string
  socialLinks?: SocialLink[]
  birthDate?: string | null
  maritalStatus?: string | null
  hasCar?: boolean | null
  workSchedule?: string | null
  viewerFollows?: boolean
  stats?: { events: number; subscriptions: number; followers: number }
}

export interface Organization {
  id: string
  name: string
  description: string
  sports: string[]
  status: OrgStatus
  ownerUserId: string
  rejectionReason?: string
}

export interface Sport {
  id: string
  name: string
  slug: string
  eventCount?: number
}

export interface Event {
  id: string
  sportId: string
  organizerUserId: string
  organizationId?: string
  organizationName?: string | null
  title: string
  description: string
  address: string
  district?: string
  city: string
  startsAt: string
  capacity: number
  confirmedCount?: number
  joinMode: JoinMode
  status: EventStatus
  level: number
  minAge?: number
  imageUrl?: string
  gallery?: string[]
  rating: number
  distanceKm?: number
  eventType?: 'game' | 'training' | 'tournament'
  latitude?: number | null
  longitude?: number | null
}

export interface Participation {
  id: string
  eventId: string
  userId: string
  status: ParticipationStatus
  createdAt: string
}

export interface Comment {
  id: string
  eventId: string
  authorId: string
  text: string
  kind?: 'MESSAGE' | 'PARTICIPANT_JOINED' | 'PARTICIPANT_LEFT'
  createdAt: string
}

export interface Notification {
  id: string
  type?: string
  isRead?: boolean
  createdAt: string
  title: string
  body: string
  linkText?: string
  linkUrl?: string
  eventTag?: string
  eventDate?: string
}

export interface LocationSuggestion {
  label: string
  address: string
  city: string
  district: string
  latitude: number
  longitude: number
}

export interface AppState {
  version: number
  currentUserId: string | null
  city: string
  users: User[]
  organizations: Organization[]
  sports: Sport[]
  events: Event[]
  participations: Participation[]
  comments: Comment[]
  notifications: Notification[]
  favorites: string[]
  likedEvents: string[]
}
