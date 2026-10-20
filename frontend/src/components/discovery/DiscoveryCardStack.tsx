import { useCallback, useRef, useState } from 'react'
import type { DiscoveryTeamCard, DiscoveryUserCard } from '../../data/discoveryTypes'
import { TeamDiscoveryCard } from './TeamDiscoveryCard'
import { UserDiscoveryCard } from './UserDiscoveryCard'

const SWIPE_THRESHOLD = 90

export function DiscoveryCardStack({
  current,
  next,
  mode,
  busy,
  onSwipe,
  onOpenTeam,
}: {
  current: DiscoveryUserCard | DiscoveryTeamCard | null
  next: DiscoveryUserCard | DiscoveryTeamCard | null
  mode: 'users' | 'teams'
  busy: boolean
  onSwipe: (direction: 'left' | 'right') => void
  onOpenTeam?: (teamId: string) => void
}) {
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false })
  const start = useRef({ x: 0, y: 0 })

  const onPointerDown = (event: React.PointerEvent) => {
    if (busy || !current) return
    start.current = { x: event.clientX, y: event.clientY }
    setDrag({ x: 0, y: 0, active: true })
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent) => {
    if (!drag.active) return
    setDrag({
      x: event.clientX - start.current.x,
      y: event.clientY - start.current.y,
      active: true,
    })
  }

  const finish = useCallback(() => {
    if (!drag.active) return
    const { x } = drag
    setDrag({ x: 0, y: 0, active: false })
    if (x > SWIPE_THRESHOLD) onSwipe('right')
    else if (x < -SWIPE_THRESHOLD) onSwipe('left')
  }, [drag, onSwipe])

  if (!current) return null

  const rotate = drag.x / 20
  const likeOpacity = Math.min(1, Math.max(0, drag.x / SWIPE_THRESHOLD))
  const skipOpacity = Math.min(1, Math.max(0, -drag.x / SWIPE_THRESHOLD))

  return (
    <div className="relative mx-auto w-full max-w-md">
      {next && (
        <div className="absolute inset-0 scale-[0.96] translate-y-2 opacity-60">
          {next.type === 'user' ? (
            <UserDiscoveryCard user={next} preview />
          ) : (
            <TeamDiscoveryCard team={next} preview />
          )}
        </div>
      )}
      <div
        className="relative touch-none transition-transform duration-150 will-change-transform"
        style={{
          transform: `translate(${drag.x}px, ${drag.y * 0.2}px) rotate(${rotate}deg)`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
      >
        {likeOpacity > 0.05 && (
          <span
            className="pointer-events-none absolute left-4 top-4 z-10 rounded-xl border-2 border-accent px-3 py-1 text-sm font-bold text-accent"
            style={{ opacity: likeOpacity }}
          >
            {mode === 'users' ? '❤️ LIKE' : '➕ JOIN'}
          </span>
        )}
        {skipOpacity > 0.05 && (
          <span
            className="pointer-events-none absolute right-4 top-4 z-10 rounded-xl border-2 border-warning px-3 py-1 text-sm font-bold text-warning"
            style={{ opacity: skipOpacity }}
          >
            ✕ SKIP
          </span>
        )}
        {current.type === 'user' ? (
          <UserDiscoveryCard user={current} />
        ) : (
          <TeamDiscoveryCard team={current} onOpen={onOpenTeam} />
        )}
      </div>
    </div>
  )
}
