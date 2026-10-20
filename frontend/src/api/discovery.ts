import { request } from '../data/api'
import type {
  DiscoveryTeamCard,
  DiscoveryUserCard,
  ProfileMemberships,
  TeamEmailInvite,
  TeamJoinRequestRow,
} from '../data/discoveryTypes'

export interface DiscoveryListResponse<T> {
  items: T[]
  nextCursor: string | null
}

export const fetchDiscoveryUsers = (cursor?: string, limit = 10) =>
  request<DiscoveryListResponse<DiscoveryUserCard>>(
    `/discovery/users?limit=${limit}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
  )

export const fetchDiscoveryTeams = (cursor?: string, limit = 10) =>
  request<DiscoveryListResponse<DiscoveryTeamCard>>(
    `/discovery/teams?limit=${limit}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
  )

export const fetchDiscoveryUser = (userId: string) =>
  request<DiscoveryUserCard>(`/discovery/users/${encodeURIComponent(userId)}`)

export const fetchDiscoveryTeam = (teamId: string) =>
  request<DiscoveryTeamCard>(`/discovery/teams/${encodeURIComponent(teamId)}`)

export const likeDiscoveryUser = (userId: string) =>
  request<{ ok: boolean }>(`/discovery/users/${encodeURIComponent(userId)}/like`, { method: 'POST' })

export const skipDiscoveryUser = (userId: string) =>
  request<{ ok: boolean }>(`/discovery/users/${encodeURIComponent(userId)}/skip`, { method: 'POST' })

export const skipDiscoveryTeam = (teamId: string) =>
  request<{ ok: boolean }>(`/discovery/teams/${encodeURIComponent(teamId)}/skip`, { method: 'POST' })

export const joinTeamRequest = (teamId: string) =>
  request<{ ok: boolean; requestId: number }>(`/teams/${encodeURIComponent(teamId)}/join-request`, { method: 'POST' })

export const fetchProfileMemberships = () => request<ProfileMemberships>('/profile/memberships')

export const createTeam = (input: { name: string; city: string; sportId: string; description?: string }) =>
  request<{ id: string; name: string }>('/teams', { method: 'POST', body: JSON.stringify(input) })

export const fetchJoinRequestCard = (requestId: number) =>
  request<{
    requestId: number
    status: string
    teamId: string
    teamName: string
    applicant: DiscoveryUserCard
  }>(`/teams/join-requests/${requestId}`)

export const acceptJoinRequest = (teamId: string, requestId: number) =>
  request<{ status: string }>(
    `/teams/${encodeURIComponent(teamId)}/join-requests/${requestId}/accept`,
    { method: 'POST', body: JSON.stringify({}) },
  )

export const rejectJoinRequest = (teamId: string, requestId: number) =>
  request<{ status: string }>(
    `/teams/${encodeURIComponent(teamId)}/join-requests/${requestId}/reject`,
    { method: 'POST', body: JSON.stringify({}) },
  )

export const fetchTeamJoinRequests = (teamId: string) =>
  request<TeamJoinRequestRow[]>(`/teams/${encodeURIComponent(teamId)}/join-requests`)

export const inviteTeamByEmail = (teamId: string, email: string) =>
  request<{ ok: boolean; inviteId: number; userFound: boolean }>(
    `/teams/${encodeURIComponent(teamId)}/invites`,
    { method: 'POST', body: JSON.stringify({ email }) },
  )

export const fetchTeamEmailInvites = () => request<TeamEmailInvite[]>('/profile/team-invites')

export const acceptTeamEmailInvite = (inviteId: number) =>
  request<{ status: string; teamId: string }>(`/teams/invites/${inviteId}/accept`, { method: 'POST' })

export const declineTeamEmailInvite = (inviteId: number) =>
  request<{ status: string }>(`/teams/invites/${inviteId}/decline`, { method: 'POST' })

export const leaveTeam = (teamId: string, newCaptainId?: string) =>
  request<{ ok: boolean }>(`/teams/${encodeURIComponent(teamId)}/leave`, {
    method: 'POST',
    body: JSON.stringify(newCaptainId ? { newCaptainId } : {}),
  })

export const uploadTeamLogo = (teamId: string, file: File) => {
  const body = new FormData()
  body.append('file', file)
  return request<{ logoUrl: string }>(`/teams/${encodeURIComponent(teamId)}/logo`, { method: 'POST', body })
}
