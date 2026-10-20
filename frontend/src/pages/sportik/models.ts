import type { SportikStage } from './progress'
import { defaultBodyModelUrl, profileBodyGender } from './sportBodies'
import type { User } from '../../data/types'

export function sportikModelPath(fileName: string) {
  return `/models/${encodeURIComponent(fileName)}`
}

/** @deprecated Используйте defaultBodyModelUrl / sportBodies. */
export const STAGE_MODEL_FILES: Record<SportikStage, string> = {
  default: '0by default2.glb',
  medium: '0by default2.glb',
  hight: '0by default2.glb',
}

export function stageModelUrl(_stage: SportikStage, user?: User | null) {
  return defaultBodyModelUrl(profileBodyGender(user))
}
