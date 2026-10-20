import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { sportikModelPath } from './models'
import { defaultBodyModelUrl, type BodyGender } from './sportBodies'
import type { SportBodyRow } from './sportBodies'
import { sportBodyModelUrl, stageVariantIndex } from './sportBodies'
import type { SportikStage } from './progress'

export type SportikLoadState = {
  loaded: boolean
  loading: boolean
  progress: number
}

const loader = new GLTFLoader()
const gltfCache = new Map<string, GLTF>()
const inflight = new Map<string, Promise<GLTF>>()
const loadState = new Map<string, SportikLoadState>()
const listeners = new Map<string, Set<(state: SportikLoadState) => void>>()

function stateFor(url: string): SportikLoadState {
  if (gltfCache.has(url)) return { loaded: true, loading: false, progress: 1 }
  return loadState.get(url) ?? { loaded: false, loading: false, progress: 0 }
}

function setState(url: string, next: SportikLoadState) {
  loadState.set(url, next)
  listeners.get(url)?.forEach((fn) => fn(next))
}

export function getSportikLoadState(url: string): SportikLoadState {
  if (!url) return { loaded: true, loading: false, progress: 1 }
  return stateFor(url)
}

export function subscribeSportikLoad(url: string, fn: (state: SportikLoadState) => void) {
  if (!url) {
    fn({ loaded: true, loading: false, progress: 1 })
    return () => {}
  }
  let set = listeners.get(url)
  if (!set) {
    set = new Set()
    listeners.set(url, set)
  }
  set.add(fn)
  fn(stateFor(url))
  return () => {
    set!.delete(fn)
    if (set!.size === 0) listeners.delete(url)
  }
}

/** Start loading a GLB; resolves when cached. Safe to call repeatedly. */
export function loadSportikGlb(url: string): Promise<GLTF> {
  if (!url) return Promise.reject(new Error('empty url'))
  const cached = gltfCache.get(url)
  if (cached) return Promise.resolve(cached)

  const pending = inflight.get(url)
  if (pending) return pending

  setState(url, { loaded: false, loading: true, progress: 0 })

  const promise = new Promise<GLTF>((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        gltfCache.set(url, gltf)
        inflight.delete(url)
        setState(url, { loaded: true, loading: false, progress: 1 })
        resolve(gltf)
      },
      (event) => {
        const total = event.total || 0
        const progress = total > 0 ? Math.min(1, event.loaded / total) : 0
        setState(url, { loaded: false, loading: true, progress })
      },
      (error) => {
        inflight.delete(url)
        setState(url, { loaded: false, loading: false, progress: 0 })
        reject(error)
      },
    )
  })

  inflight.set(url, promise)
  return promise
}

export function getCachedSportikGltf(url: string): GLTF | null {
  return gltfCache.get(url) ?? null
}

/** Queue a single GLB (no-op if already loaded or loading). */
export function preloadSportikGlb(url: string) {
  if (!url || gltfCache.has(url)) return
  void loadSportikGlb(url).catch(() => {})
}

export function preloadSportikFile(fileName: string) {
  preloadSportikGlb(sportikModelPath(fileName))
}

let defaultBodiesQueued = false

/** Both default bodies — site bootstrap; gender-specific one is shown as fallback. */
export function preloadDefaultBodies() {
  if (defaultBodiesQueued) return
  defaultBodiesQueued = true
  preloadSportikGlb(defaultBodyModelUrl('male'))
  preloadSportikGlb(defaultBodyModelUrl('female'))
}

export function preloadDefaultBodyForGender(gender: BodyGender) {
  preloadSportikGlb(defaultBodyModelUrl(gender))
}

/** Preload the body variant the user unlocked at the current tamagotchi stage. */
export function preloadSportRowForStage(row: SportBodyRow, stage: SportikStage) {
  const index = stageVariantIndex(stage, row.gender)
  preloadSportikGlb(sportBodyModelUrl(row, index))
}
