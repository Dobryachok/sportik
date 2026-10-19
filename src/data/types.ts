export type UserRole = 'user' | 'organization' | 'admin'

export type OrgStatus = 'pending' | 'approved' | 'rejected'

export type JoinMode = 'open' | 'application'

export type EventStatus = 'published' | 'unpublished'

export type ParticipationStatus = 'confirmed' | 'pending' | 'rejected'

export interface AuthAccount {
  id: string
  userId: string
  email: string
  passwordHash: string
}

export interface User {
  id: string
  name: string
  age?: number
  city: string
  role: UserRole
  avatarUrl?: string
  bio?: string
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
  title: string
  description: string
  address: string
  district?: string
  city: string
  startsAt: string
  price: number
  discountedPrice?: number
  capacity: number
  joinMode: JoinMode
  status: EventStatus
  level: number
  minAge?: number
  imageUrl?: string
  gallery?: string[]
  rating: number
  distanceKm?: number
  eventType?: 'game' | 'training'
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
  createdAt: string
}

export interface Notification {
  id: string
  createdAt: string
  title: string
  body: string
  linkText?: string
  linkUrl?: string
  eventTag?: string
  eventDate?: string
}

export interface AppState {
  version: number
  currentUserId: string | null
  accounts: AuthAccount[]
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
