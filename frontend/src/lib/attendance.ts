import type { Participation } from '../data/types'
import { isPast } from './format'

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export function attendanceDeadlineAt(startsAt: string): number {
  return new Date(startsAt).getTime() + WINDOW_MS
}

export function attendanceWindowOpen(startsAt: string, now = Date.now()): boolean {
  const start = new Date(startsAt).getTime()
  if (Number.isNaN(start) || now < start) return false
  return now <= attendanceDeadlineAt(startsAt)
}

/** Visit counts only when organizer marked the user as present. */
export function participationCountsAsVisit(participation: Participation, eventStartsAt: string): boolean {
  if (participation.status !== 'confirmed') return false
  if (!isPast(eventStartsAt)) return false
  return participation.attended === true
}

export function formatReliabilityPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `${value}%`
}
