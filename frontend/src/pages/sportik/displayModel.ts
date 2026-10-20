import type { AppState } from '../../data/types'
import type { User } from '../../data/types'
import { findOwnedItem } from './catalog'
import {
  defaultBodyModelUrl,
  findSportBodyRow,
  profileBodyGender,
  sportBodyModelUrl,
  stageVariantIndex,
  unlockedSportRows,
  type SportBodyKey,
} from './sportBodies'
import type { SportikStage } from './progress'
import { sportikModelPath } from './models'

export type SportikEquip = {
  sportKey: SportBodyKey | null
  variantIndex: number | null
  warehouseId: string | null
}

export function resolveDisplayModelUrl(
  stage: SportikStage,
  user: User | null,
  equip: SportikEquip,
  unlockedKeys: Set<SportBodyKey>,
) {
  const warehouse = equip.warehouseId ? findOwnedItem(equip.warehouseId) : undefined
  if (warehouse?.modelFile) return sportikModelPath(warehouse.modelFile)

  const row = findSportBodyRow(equip.sportKey)
  if (row && unlockedKeys.has(row.key)) {
    const canPick = stage === 'hight'
    const variant = canPick && equip.variantIndex !== null
      ? equip.variantIndex
      : stageVariantIndex(stage, row.gender)
    return sportBodyModelUrl(row, variant)
  }

  return defaultBodyModelUrl(profileBodyGender(user))
}

export function buildUnlockedKeySet(state: AppState, userId: string) {
  return new Set(unlockedSportRows(state, userId).map((row) => row.key))
}
