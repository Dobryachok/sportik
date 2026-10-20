import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { Sidebar } from '../components/Sidebar'

export function AppShell() {
  const { pathname } = useLocation()
  const isSportik = pathname === '/sportik' || pathname.startsWith('/sportik/')

  return (
    <div className="flex min-h-[100dvh] max-w-full overflow-x-clip bg-bg text-[var(--app-ink)]">
      <Sidebar />
      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col bg-bg">
        <main
          className={
            isSportik
              ? 'relative h-[100dvh] min-h-0 min-w-0 flex-1 overflow-hidden p-0'
              : 'min-w-0 flex-1 overflow-x-clip px-4 pb-app-safe pt-5 md:px-6 md:pb-8 md:pt-7 mx-auto min-w-0 max-w-full flex-1 overflow-x-clip px-4 pb-app-safe pt-5 md:max-w-6xl md:px-6 md:pb-8 md:pt-7'
          }
        >
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
