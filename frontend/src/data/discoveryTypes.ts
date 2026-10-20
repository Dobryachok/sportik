export interface DiscoveryInterest {
  name: string
  slug: string
}

export interface SportStatRow {
  sport: string
  games: number
}

export interface SportikSummary {
  level: number
  visits: number
  stage: string
  image: string
}

export interface DiscoveryUserCard {
  type: 'user'
  id: string
  name: string
  city: string
  age?: number
  avatarUrl?: string
  bio?: string
  interests: DiscoveryInterest[]
  sportStats: SportStatRow[]
  sportik: SportikSummary
  compatibility: number
}

export interface TeamMemberPreview {
  id: string
  name: string
  avatarUrl?: string
  role: string
}

export interface TeamStats {
  games: number
  wins: number
  losses: number
  winRate: number
}

export interface DiscoveryTeamCard {
  type: 'team'
  id: string
  name: string
  description: string
  city: string
  sport: string
  sportId?: string
  logoUrl?: string
  membersCount: number
  members: TeamMemberPreview[]
  stats: TeamStats
  compatibility: number
  createdAt?: string | null
  history?: { date: string; title: string; place: string }[]
  viewerRole?: string | null
  canManage?: boolean
  joinRequestStatus?: string | null
}

export interface ProfileMembershipTeam {
  id: string
  name: string
  role: string
  sport: string
  logoUrl?: string
  membersCount?: number
  membershipStatus?: 'member' | 'pending'
}

export interface FollowPreview {
  id: string
  name: string
  avatarUrl?: string
  city: string
}

export interface TeamJoinRequestRow {
  id: number
  requestId: number
  userId: string
  name: string
  avatarUrl?: string
  status: string
  createdAt?: string
}

export interface TeamEmailInvite {
  inviteId: number
  teamId: string
  teamName: string
  logoUrl?: string
  invitedByName: string
  createdAt?: string
}

export interface ProfileMembershipGroup {
  id: string
  name: string
  role: string
}

export interface ProfileMemberships {
  teams: ProfileMembershipTeam[]
  groups: ProfileMembershipGroup[]
}
