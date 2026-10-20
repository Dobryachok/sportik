import type { SportBodyKey } from './sportBodies'

const ownedKey = (userId: string) => `sportik-owned:${userId}`
const equipKey = (userId: string) => `sportik-equip:${userId}`
const spentKey = (userId: string) => `sportik-spent-points:${userId}`

export type StoredEquip = {
  sportKey: SportBodyKey | null
  variantIndex: number | null
  warehouseId: string | null
}

export function readOwnedIds(userId: string): string[] {
  try {
    const raw = localStorage.getItem(ownedKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function writeOwnedIds(userId: string, ids: string[]) {
  try {
    localStorage.setItem(ownedKey(userId), JSON.stringify(ids))
  } catch {
    /* optional */
  }
}

export function readEquip(userId: string): StoredEquip {
  try {
    const raw = localStorage.getItem(equipKey(userId))
    if (!raw) return { sportKey: null, variantIndex: null, warehouseId: null }
    const parsed = JSON.parse(raw) as StoredEquip
    return {
      sportKey: parsed.sportKey ?? null,
      variantIndex: parsed.variantIndex ?? null,
      warehouseId: parsed.warehouseId ?? null,
    }
  } catch {
    return { sportKey: null, variantIndex: null, warehouseId: null }
  }
}

export function writeEquip(userId: string, equip: StoredEquip) {
  try {
    localStorage.setItem(equipKey(userId), JSON.stringify(equip))
  } catch {
    /* optional */
  }
}

export function readSpentPoints(userId: string): number {
  try {
    const raw = localStorage.getItem(spentKey(userId))
    return raw ? Number(raw) || 0 : 0
  } catch {
    return 0
  }
}

export function writeSpentPoints(userId: string, spent: number) {
  try {
    localStorage.setItem(spentKey(userId), String(spent))
  } catch {
    /* optional */
  }
}

export function availableBalance(totalPoints: number, userId: string) {
  return Math.max(0, totalPoints - readSpentPoints(userId))
}
