const ownedKey = (userId: string) => `sportik-owned:${userId}`
const equippedKey = (userId: string) => `sportik-equipped:${userId}`
const spentKey = (userId: string) => `sportik-spent-points:${userId}`

export function readOwnedIds(userId: string): string[] {
  try {
    const raw = localStorage.getItem(ownedKey(userId))
    if (!raw) return ['slender-tee']
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed : ['slender-tee']
  } catch {
    return ['slender-tee']
  }
}

export function writeOwnedIds(userId: string, ids: string[]) {
  try {
    localStorage.setItem(ownedKey(userId), JSON.stringify(ids))
  } catch {
    /* optional */
  }
}

export function readEquippedId(userId: string): string | null {
  try {
    return localStorage.getItem(equippedKey(userId))
  } catch {
    return null
  }
}

export function writeEquippedId(userId: string, id: string | null) {
  try {
    if (id) localStorage.setItem(equippedKey(userId), id)
    else localStorage.removeItem(equippedKey(userId))
  } catch {
    /* optional */
  }
}

/** Activity points already spent in the shop (client-side ledger). */
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
