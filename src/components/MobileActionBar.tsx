import type { ReactNode } from 'react'

interface MobileActionBarProps {
  children: ReactNode
}

export function MobileActionBar({ children }: MobileActionBarProps) {
  return (
    <div
      className="fixed left-0 right-0 z-40 box-border w-full max-w-full border-t border-white/10 bg-bg/95 px-4 py-3 backdrop-blur fixed-above-nav md:hidden"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
    >
      {children}
    </div>
  )
}
