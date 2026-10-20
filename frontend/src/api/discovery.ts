import { request } from '../data/api'
import type { DiscoveryTeamCard, DiscoveryUserCard, ProfileMemberships } from '../data/discoveryTypes'

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
