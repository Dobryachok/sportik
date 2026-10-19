import { Navigate, useLocation } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import type { ReactNode } from 'react'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { currentUser, loading } = useAppData()
  const location = useLocation()
  if (loading) return <p className="py-12 text-center text-muted">Проверяем вход…</p>
  if (!currentUser) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <>{children}</>
}
