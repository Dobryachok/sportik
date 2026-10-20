import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'

export function SportikModel({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  const clone = useMemo(() => scene.clone(true), [scene])
  return <primitive object={clone} />
}
