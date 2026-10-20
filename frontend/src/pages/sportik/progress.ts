import type { AppState } from '../../data/types'
import { participationCountsAsVisit } from '../../lib/attendance'

export type SportikStage = 'default' | 'medium' | 'hight'

export const STAGE_LABELS: Record<SportikStage, string> = {
  default: 'Новичок',
  medium: 'Атлет',
  hight: 'Титан',
}

export function countVisits(state: AppState, userId: string): number {
  const events = new Map(state.events.map((event) => [event.id, event]))
  return state.participations.filter((participation) => {
    if (participation.userId !== userId) return false
    const event = events.get(participation.eventId)
    return event ? participationCountsAsVisit(participation, event.startsAt) : false
  }).length
}

export function progressPoints(visits: number, closedCount: number): number {
  return visits + closedCount * 2
}

export function resolveStage(visits: number, closedCount: number): SportikStage {
  if (visits >= 40 && closedCount >= 4) return 'hight'
  if (visits >= 10 && closedCount >= 1) return 'medium'
  return 'default'
}

export function nextProgress(closedCount: number, stage: SportikStage) {
  if (stage === 'hight') {
    return {
      visitTarget: 40,
      challengesNeeded: 0,
      nextLabel: null as string | null,
    }
  }
  if (stage === 'medium') {
    return {
      visitTarget: 40,
      challengesNeeded: Math.max(0, 4 - closedCount),
      nextLabel: 'Высокий',
    }
  }
  return {
    visitTarget: 10,
    challengesNeeded: Math.max(0, 1 - closedCount),
      nextLabel: 'Атлет',
  }
}
