import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  loginWithPassword,
  logoutUser,
  registerAccount,
  type RegisterInput,
} from '../data/authRepository'
import {
  addComment,
  createEvent,
  joinEvent,
  loadState,
  resetToSeed,
  reviewParticipation,
  setCity,
  toggleFavorite,
  toggleLike,
  type CreateEventInput,
} from '../data/repository'
import type { AppState } from '../data/types'
import type { User } from '../data/types'

interface AppDataContextValue {
  state: AppState
  currentUser: User | null
  isAuthenticated: boolean
  refresh: () => void
  login: (email: string, password: string) => Promise<string | null>
  register: (input: RegisterInput) => Promise<string | null>
  logout: () => void
  changeCity: (city: string) => void
  resetData: () => void
  favorite: (eventId: string) => void
  like: (eventId: string) => void
  participate: (eventId: string) => void
  postComment: (eventId: string, text: string) => void
  review: (participationId: string, status: 'confirmed' | 'rejected') => void
  addNewEvent: (input: CreateEventInput) => void
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState())

  const refresh = useCallback(() => setState(loadState()), [])

  const currentUser = useMemo(() => {
    if (!state.currentUserId) return null
    return state.users.find((u) => u.id === state.currentUserId) ?? null
  }, [state])

  const isAuthenticated = currentUser != null

  const value = useMemo<AppDataContextValue>(
    () => ({
      state,
      currentUser,
      isAuthenticated,
      refresh,
      login: async (email, password) => {
        const result = await loginWithPassword(loadState(), email, password)
        if (!result.ok) return result.error
        setState(result.state)
        return null
      },
      register: async (input) => {
        const result = await registerAccount(loadState(), input)
        if (!result.ok) return result.error
        setState(result.state)
        return null
      },
      logout: () => setState((s) => logoutUser(s)),
      changeCity: (city) => setState((s) => setCity(s, city)),
      resetData: () => setState(resetToSeed()),
      favorite: (eventId) => {
        if (!state.currentUserId) return
        setState((s) => toggleFavorite(s, eventId))
      },
      like: (eventId) => setState((s) => toggleLike(s, eventId)),
      participate: (eventId) => {
        if (!state.currentUserId) return
        setState((s) => joinEvent(s, eventId, s.currentUserId!))
      },
      postComment: (eventId, text) => {
        if (!state.currentUserId || !text.trim()) return
        setState((s) => addComment(s, eventId, s.currentUserId!, text))
      },
      review: (participationId, status) =>
        setState((s) => reviewParticipation(s, participationId, status)),
      addNewEvent: (input) => {
        if (!state.currentUserId) return
        setState((s) => createEvent(s, s.currentUserId!, input))
      },
    }),
    [state, currentUser, isAuthenticated, refresh],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}
