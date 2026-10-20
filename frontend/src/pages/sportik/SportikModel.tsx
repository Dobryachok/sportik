import { useMemo } from 'react'
import { useSportikGlb } from './useSportikGlb'

export function SportikModel({ url }: { url: string }) {
  const gltf = useSportikGlb(url)
  const clone = useMemo(() => gltf?.scene.clone(true) ?? null, [gltf])
  if (!clone) return null
  return <primitive object={clone} />
}
