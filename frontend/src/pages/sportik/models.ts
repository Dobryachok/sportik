import type { SportikStage } from './progress'

/** GLB filenames live in `frontend/public/models/`. */
export function sportikModelPath(fileName: string) {
  return `/models/${encodeURIComponent(fileName)}`
}

/** Body progression: novice → athlete → titan (from asset pack). */
export const STAGE_MODEL_FILES: Record<SportikStage, string> = {
  default: 'by default2.glb',
  medium: 'slender basketball player.glb',
  hight: 'muscular basketball player.glb',
}

export function stageModelUrl(stage: SportikStage) {
  return sportikModelPath(STAGE_MODEL_FILES[stage])
}
