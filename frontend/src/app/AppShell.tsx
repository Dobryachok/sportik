import { Outlet } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { Sidebar } from '../components/Sidebar'

export function AppShell() {
  return (
    <div className="flex min-h-[100dvh] max-w-full overflow-x-clip bg-bg text-[var(--app-ink)]">
      <Sidebar />
      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col bg-bg">
        <main className="min-w-0 flex-1 overflow-x-clip px-4 pb-app-safe pt-5 md:px-6 md:pb-8 md:pt-7">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
