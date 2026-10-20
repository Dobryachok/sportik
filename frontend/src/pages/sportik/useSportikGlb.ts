import { useEffect, useState } from 'react'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  getCachedSportikGltf,
  getSportikLoadState,
  loadSportikGlb,
  subscribeSportikLoad,
  type SportikLoadState,
} from './modelLoader'

export function useSportikGlbLoadState(url: string): SportikLoadState {
  const [state, setState] = useState<SportikLoadState>(() =>
    url ? getSportikLoadState(url) : { loaded: true, loading: false, progress: 1 },
  )

  useEffect(() => {
    if (!url) {
      setState({ loaded: true, loading: false, progress: 1 })
      return
    }
    void loadSportikGlb(url).catch(() => {})
    return subscribeSportikLoad(url, setState)
  }, [url])

  return state
}

/** Loads `url` and returns parsed GLTF when ready. */
export function useSportikGlb(url: string): GLTF | null {
  const [gltf, setGltf] = useState<GLTF | null>(() => getCachedSportikGltf(url))

  useEffect(() => {
    if (!url) {
      setGltf(null)
      return
    }
    const cached = getCachedSportikGltf(url)
    if (cached) {
      setGltf(cached)
      return
    }
    setGltf(null)
    let cancelled = false
    void loadSportikGlb(url)
      .then((loaded) => {
        if (!cancelled) setGltf(loaded)
      })
      .catch(() => {
        if (!cancelled) setGltf(null)
      })
    return () => {
      cancelled = true
    }
  }, [url])

  return gltf
}
