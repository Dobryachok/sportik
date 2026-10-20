import { useMemo } from 'react'
import { useSportikGlb } from './useSportikGlb'

type Props = {
  targetUrl: string
  fallbackUrl: string
}

export function SportikAvatar({ targetUrl, fallbackUrl }: Props) {
  const targetGltf = useSportikGlb(targetUrl)
  const fallbackGltf = useSportikGlb(fallbackUrl)

  const gltf = targetGltf ?? (targetUrl !== fallbackUrl ? fallbackGltf : null)
  const clone = useMemo(() => gltf?.scene.clone(true) ?? null, [gltf])

  if (!clone) return null
  return <primitive object={clone} />
}
