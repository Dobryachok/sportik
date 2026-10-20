import { useGLTF } from '@react-three/drei'
import { sportikModelPath } from './models'
import type { SportBodyRow } from './sportBodies'
import { sportBodyModelUrl, stageVariantIndex } from './sportBodies'
import type { SportikStage } from './progress'

/** Queue a single GLB for the drei cache (no-op if already loaded). */
export function preloadSportikGlb(url: string) {
  if (!url) return
  useGLTF.preload(url)
}

export function preloadSportikFile(fileName: string) {
  preloadSportikGlb(sportikModelPath(fileName))
}

/** Preload the body variant the user would wear at the current tamagotchi stage. */
export function preloadSportRowForStage(row: SportBodyRow, stage: SportikStage) {
  const index = stageVariantIndex(stage, row.gender)
  preloadSportikGlb(sportBodyModelUrl(row, index))
}

/** All three physique variants for a sport (e.g. when Titan picks another silhouette). */
export function preloadSportRowVariants(row: SportBodyRow) {
  row.variants.forEach((_, index) => preloadSportikGlb(sportBodyModelUrl(row, index)))
}
