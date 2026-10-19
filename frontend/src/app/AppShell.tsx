import { Outlet } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { Sidebar } from '../components/Sidebar'

export function AppShell() {
  return (
    <div className="flex min-h-[100dvh] max-w-full overflow-x-clip bg-bg text-white">
      <Sidebar />
      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col">
        <main className="mx-auto min-w-0 max-w-full flex-1 overflow-x-clip px-4 pt-4 pb-app-safe md:max-w-6xl md:px-6 md:pb-8 md:pt-6">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
