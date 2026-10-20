import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { addComment, completeStartQuest as completeStartRequest, createEvent, dismissNotification as dismissNotificationRequest, fetchComments, fetchEvent, fetchMe, fetchState, joinEvent, leaveEvent, login as loginRequest, logout as logoutRequest, register as registerRequest, reviewParticipation, toggleFavorite, toggleLike, updateEvent, updateProfile, uploadAvatar } from '../data/api'
import type { CreateEventInput } from '../data/selectors'
import type { AppState, Comment, Event, User } from '../data/types'

interface AppDataContextValue {
  state: AppState; currentUser: User | null; loading: boolean; error: string | null; city: string
  refresh: () => Promise<boolean>; setCity: (city: string, persist?: boolean) => Promise<boolean>
  signIn: (email: string, password: string) => Promise<boolean>; signUp: (name: string, email: string, password: string) => Promise<boolean>; signOut: () => Promise<void>
  saveProfile: (input: Partial<Pick<User, 'name' | 'bio' | 'city' | 'birthDate' | 'maritalStatus' | 'gender' | 'hasCar' | 'workSchedule' | 'socialLinks' | 'interests'>>) => Promise<boolean>; completeStart: () => Promise<boolean>; changeAvatar: (file: File) => Promise<boolean>
  favorite: (eventId: string) => Promise<boolean>; like: (eventId: string) => Promise<boolean>; participate: (eventId: string) => Promise<boolean>; leave: (eventId: string) => Promise<boolean>; postComment: (eventId: string, text: string) => Promise<boolean>; refreshComments: (eventId: string) => Promise<void>; mergeComment: (comment: Comment) => void; dismissNotification: (notificationId: string) => Promise<boolean>; review: (participationId: string, status: 'confirmed' | 'rejected') => Promise<boolean>; addNewEvent: (input: CreateEventInput) => Promise<boolean>; editEvent: (eventId: string, input: CreateEventInput) => Promise<boolean>
}
const AppDataContext = createContext<AppDataContextValue | null>(null)
const cityStorageKey = 'sportik-city'
const readSavedCity = () => { try { return localStorage.getItem(cityStorageKey)?.trim() || localStorage.getItem('sport-together-city')?.trim() || '' } catch { return '' } }

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [city, setCityState] = useState(readSavedCity)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async (selectedCity: string, user?: User | null) => {
    const next = await fetchState(selectedCity)
    setState(next)
    if (user !== undefined) setCurrentUser(user)
  }, [])
  const refresh = useCallback(async () => {
    try {
      setError(null)
      const user = await fetchMe()
      await load(city, user)
      return true
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось загрузить данные.'); return false }
  }, [city, load])
  useEffect(() => { void (async () => { try { const user = await fetchMe(); const selected = user?.city || readSavedCity(); if (selected) setCityState(selected); await load(selected, user) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось загрузить данные.') } finally { setLoading(false) } })() }, [load])
  const setCity = useCallback(async (raw: string, persist = true) => {
    const selected = raw.trim()
    if (!selected) return false
    setCityState(selected); try { localStorage.setItem(cityStorageKey, selected) } catch { /* storage is optional */ }
    try {
      if (persist && currentUser) { const user = await updateProfile({ city: selected }); setCurrentUser(user) }
      await load(selected)
      return true
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось обновить город.'); return false }
  }, [currentUser, load])
  const runMutation = useCallback(async (action: () => Promise<unknown>) => { try { setError(null); await action(); return await refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось сохранить изменения.'); return false } }, [refresh])
  const signIn = useCallback(async (email: string, password: string) => { try { setError(null); const user = await loginRequest({ email, password }); const selected = user.city || city; setCityState(selected); try { localStorage.setItem(cityStorageKey, selected) } catch {} await load(selected, user); return true } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось войти.'); return false } }, [city, load])
  const signUp = useCallback(async (name: string, email: string, password: string) => { try { setError(null); const user = await registerRequest({ name, email, password }); await load(city, user); return true } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось создать аккаунт.'); return false } }, [city, load])
  const signOut = useCallback(async () => { try { await logoutRequest() } finally { setCurrentUser(null); await load(city, null) } }, [city, load])
  const saveProfile = useCallback(async (input: Partial<Pick<User, 'name' | 'bio' | 'city' | 'birthDate' | 'maritalStatus' | 'gender' | 'hasCar' | 'workSchedule' | 'socialLinks' | 'interests'>>) => { try { const user = await updateProfile(input); setCurrentUser(user); if (input.city !== undefined) { setCityState(user.city); try { localStorage.setItem(cityStorageKey, user.city) } catch {} } await load(input.city ?? city, user); return true } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось сохранить профиль.'); return false } }, [city, load])
  const completeStart = useCallback(async () => {
    if (!currentUser) return false
    if (currentUser.startCompleted) return true
    try {
      setError(null)
      if (city && city !== currentUser.city) {
        const withCity = await updateProfile({ city })
        setCurrentUser(withCity)
      }
      const user = await completeStartRequest()
      setCurrentUser(user)
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось сохранить прохождение Старта.')
      return false
    }
  }, [city, currentUser])
  const changeAvatar = useCallback(async (file: File) => { try { const user = await uploadAvatar(file); setCurrentUser(user); await load(city, user); return true } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось загрузить фото.'); return false } }, [city, load])
  const refreshComments = useCallback(async (eventId: string) => { try { const comments = await fetchComments(eventId); setState((old) => old ? { ...old, comments: [...old.comments.filter((item) => item.eventId !== eventId), ...comments] } : old) } catch { /* fallback refresh should not interrupt reading */ } }, [])
  const mergeComment = useCallback((comment: Comment) => {
    setState((old) => old ? {
      ...old,
      comments: [...old.comments.filter((item) => item.id !== comment.id), comment],
    } : old)
  }, [])
  const postComment = useCallback(async (eventId: string, rawText: string) => {
    const comment = rawText.trim()
    if (!comment) return false
    try {
      setError(null)
      await addComment(eventId, comment)
      await refreshComments(eventId)
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось отправить сообщение.')
      return false
    }
  }, [refreshComments])
  const upsertEvents = useCallback((incoming: Event[]) => {
    if (!incoming.length) return
    setState((old) => {
      if (!old) return old
      const byId = new Map(old.events.map((event) => [event.id, event]))
      for (const event of incoming) byId.set(event.id, event)
      return { ...old, events: [...byId.values()] }
    })
  }, [])
  const favorite = useCallback(async (eventId: string) => {
    try {
      setError(null)
      const { active } = await toggleFavorite(eventId)
      setState((old) => {
        if (!old) return old
        const favorites = active
          ? (old.favorites.includes(eventId) ? old.favorites : [...old.favorites, eventId])
          : old.favorites.filter((id) => id !== eventId)
        return { ...old, favorites }
      })
      if (active) {
        try {
          const event = await fetchEvent(eventId)
          upsertEvents([event])
        } catch {
          /* event card will load it on «Избранные» */
        }
      }
      void refresh()
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось обновить избранное.')
      return false
    }
  }, [refresh, upsertEvents])
  const dismissNotification = useCallback(async (notificationId: string) => {
    try {
      setError(null)
      await dismissNotificationRequest(notificationId)
      setState((old) => old ? { ...old, notifications: old.notifications.filter((item) => item.id !== notificationId) } : old)
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось убрать уведомление.')
      return false
    }
  }, [])
  const value = useMemo<AppDataContextValue | null>(() => state ? ({ state, currentUser, loading, error, city, refresh, setCity, signIn, signUp, signOut, saveProfile, completeStart, changeAvatar, favorite, like: (id) => runMutation(() => toggleLike(id)), participate: (id) => runMutation(() => joinEvent(id)), leave: (id) => runMutation(() => leaveEvent(id)), postComment, refreshComments, mergeComment, dismissNotification, review: (id, decision) => runMutation(() => reviewParticipation(id, decision)), addNewEvent: (input) => runMutation(() => createEvent(input)), editEvent: (id, input) => runMutation(() => updateEvent(id, input)) }) : null, [state, currentUser, loading, error, city, refresh, setCity, signIn, signUp, signOut, saveProfile, completeStart, changeAvatar, favorite, runMutation, postComment, refreshComments, mergeComment, dismissNotification])
  if (!value) return <div className="flex min-h-[100dvh] items-center justify-center bg-bg px-4 text-center text-sm text-muted"><div><p>{error ?? 'Загружаем события…'}</p>{error && <button type="button" onClick={() => void refresh()} className="mt-3 text-accent">Повторить</button>}</div></div>
  return <AppDataContext.Provider value={value}>{error && <div role="alert" className="fixed inset-x-4 top-4 z-[60] mx-auto max-w-md rounded-xl bg-warning px-4 py-3 text-center text-sm text-bg shadow-lg">{error}</div>}{children}</AppDataContext.Provider>
}
export function useAppData() { const ctx = useContext(AppDataContext); if (!ctx) throw new Error('useAppData must be used within AppDataProvider'); return ctx }
