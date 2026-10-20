import { useEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { Sidebar } from '../components/Sidebar'
import { isStartQuestComplete } from '../lib/startQuest'
import { useAppData } from './AppDataContext'

function StartQuestSync() {
  const { city, currentUser, state, completeStart } = useAppData()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const wasCompleted = useRef<boolean | null>(null)

  useEffect(() => {
    if (!currentUser) {
      wasCompleted.current = null
      return
    }
    if (wasCompleted.current === null) {
      wasCompleted.current = Boolean(currentUser.startCompleted)
      return
    }
    if (currentUser.startCompleted) {
      if (!wasCompleted.current && !pathname.startsWith('/sportik')) {
        wasCompleted.current = true
        navigate('/sportik?shop=1', { replace: true })
        return
      }
      wasCompleted.current = true
      return
    }
    if (!isStartQuestComplete(city, currentUser, state)) return
    let cancelled = false
    void completeStart().then((ok) => {
      if (cancelled || !ok) return
      wasCompleted.current = true
      if (!pathname.startsWith('/sportik')) navigate('/sportik?shop=1', { replace: true })
    })
    return () => {
      cancelled = true
    }
  }, [city, completeStart, currentUser, navigate, pathname, state])

  return null
}

export function AppShell() {
  const { pathname } = useLocation()

  return (
    <div className="flex min-h-[100dvh] max-w-full overflow-x-clip bg-bg text-[var(--app-ink)]">
      <Sidebar />
      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col bg-bg">
        <main
          className={`mx-auto flex min-h-0 w-full min-w-0 max-w-3xl flex-1 flex-col overflow-x-clip ${
            pathname.startsWith('/sportik')
              ? 'px-0 pt-0 pb-0 md:px-6 md:pb-8 md:pt-7'
              : 'px-4 pb-app-safe pt-5 md:px-6 md:pb-8 md:pt-7'
          }`}
        >
          <StartQuestSync />
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
