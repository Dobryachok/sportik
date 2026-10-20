import type { AppState } from '../../data/types'
import type { User } from '../../data/types'
import { isPast } from '../../lib/format'
import type { SportikStage } from './progress'
import { sportikModelPath } from './models'

/** 0 — женские модели, 1 — мужские (префикс файла). */
export type BodyGender = 'female' | 'male'

export type SportBodyKey =
  | 'basketball'
  | 'football'
  | 'volleyball'
  | 'tennis'
  | 'hockey'
  | 'boxing'
  | 'golf'

export type SportBodyRow = {
  key: SportBodyKey
  label: string
  gender: BodyGender
  /** Подстроки в slug / названии вида спорта из API. */
  matchers: string[]
  /** [тонкий/полный базовый, средний, накачанный/стройный] — порядок зависит от пола. */
  variants: [string, string, string]
  variantLabels: [string, string, string]
}

/** Соответствие видов спорта и набора GLB (см. таблицу 0/1 в ассетах). */
export const SPORT_BODY_ROWS: SportBodyRow[] = [
  {
    key: 'basketball',
    label: 'Баскетбол',
    gender: 'male',
    matchers: ['basketball', 'баскетбол', 'баскет'],
    variants: ['1skinny basketball player.glb', '1slender basketball player.glb', '1muscular basketball player.glb'],
    variantLabels: ['Тощий', 'Атлет', 'Титан'],
  },
  {
    key: 'football',
    label: 'Футбол',
    gender: 'male',
    matchers: ['football', 'футбол', 'futsal', 'футзал'],
    variants: ['1skinny basketball player.glb', '1slender basketball player.glb', '1muscular basketball player.glb'],
    variantLabels: ['Тощий', 'Атлет', 'Титан'],
  },
  {
    key: 'boxing',
    label: 'Бокс',
    gender: 'male',
    matchers: ['box', 'бокс'],
    variants: ['1skinny boxer.glb', '1slender box.glb', '1muscular boxer.glb'],
    variantLabels: ['Тощий', 'Атлет', 'Титан'],
  },
  {
    key: 'hockey',
    label: 'Хоккей',
    gender: 'male',
    matchers: ['hockey', 'хоккей'],
    variants: ['1skinny hockey player.glb', '1slender hockey player.glb', '1muscular hockey player.glb'],
    variantLabels: ['Тощий', 'Атлет', 'Титан'],
  },
  {
    key: 'volleyball',
    label: 'Волейбол',
    gender: 'female',
    matchers: ['volleyball', 'волейбол'],
    variants: ['0full volleyball match.glb', '0volleyball, slender.glb', '0thin volleyball player.glb'],
    variantLabels: ['Плюс', 'Баланс', 'Фит'],
  },
  {
    key: 'tennis',
    label: 'Теннис',
    gender: 'female',
    matchers: ['tennis', 'теннис'],
    variants: ['0tennis full version.glb', '0slim tennis player.glb', '0slender tennis player.glb'],
    variantLabels: ['Плюс', 'Баланс', 'Фит'],
  },
  {
    key: 'golf',
    label: 'Гольф',
    gender: 'female',
    matchers: ['golf', 'гольф'],
    variants: ['0full golf.glb', '0slim tennis player.glb', '0slender tennis player.glb'],
    variantLabels: ['Плюс', 'Баланс', 'Фит'],
  },
]

export function profileBodyGender(user: User | null | undefined): BodyGender {
  if (user?.gender === 'female') return 'female'
  if (user?.gender === 'male') return 'male'
  return 'male'
}

export function defaultBodyFile(gender: BodyGender) {
  return gender === 'female' ? '0by default2.glb' : '1by default.glb'
}

export function matchSportBody(sportName: string, sportSlug: string): SportBodyRow | null {
  const hay = `${sportName} ${sportSlug}`.toLowerCase()
  return SPORT_BODY_ROWS.find((row) => row.matchers.some((part) => hay.includes(part))) ?? null
}

export function pastParticipationsBySport(state: AppState, userId: string) {
  const events = new Map(state.events.map((event) => [event.id, event]))
  const sports = new Map(state.sports.map((sport) => [sport.id, sport]))
  const counts = new Map<SportBodyKey, number>()

  for (const part of state.participations) {
    if (part.userId !== userId || part.status !== 'confirmed') continue
    const event = events.get(part.eventId)
    if (!event || !isPast(event.startsAt)) continue
    const sport = sports.get(event.sportId)
    if (!sport) continue
    const row = matchSportBody(sport.name, sport.slug ?? '')
    if (!row) continue
    counts.set(row.key, (counts.get(row.key) ?? 0) + 1)
  }
  return counts
}

export function unlockedSportRows(state: AppState, userId: string) {
  const counts = pastParticipationsBySport(state, userId)
  return SPORT_BODY_ROWS.filter((row) => (counts.get(row.key) ?? 0) >= 1)
}

/** Индекс варианта по стадии тамагочи (0 = базовый по полу). */
export function stageVariantIndex(stage: SportikStage, gender: BodyGender): number {
  if (gender === 'male') {
    return stage === 'default' ? 0 : stage === 'medium' ? 1 : 2
  }
  return stage === 'default' ? 0 : stage === 'medium' ? 1 : 2
}

export function sportBodyModelUrl(row: SportBodyRow, variantIndex: number) {
  const file = row.variants[Math.min(2, Math.max(0, variantIndex))]
  return sportikModelPath(file)
}

export function defaultBodyModelUrl(gender: BodyGender) {
  return sportikModelPath(defaultBodyFile(gender))
}

export function findSportBodyRow(key: SportBodyKey | null | undefined) {
  if (!key) return null
  return SPORT_BODY_ROWS.find((row) => row.key === key) ?? null
}
