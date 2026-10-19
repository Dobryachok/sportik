import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { addComment, createEvent, fetchComments, fetchMe, fetchState, joinEvent, login as loginRequest, logout as logoutRequest, register as registerRequest, reviewParticipation, toggleFavorite, toggleLike, updateEvent, updateProfile, uploadAvatar } from '../data/api'
import type { CreateEventInput } from '../data/selectors'
import type { AppState, User } from '../data/types'

interface AppDataContextValue {
  state: AppState; currentUser: User | null; loading: boolean; error: string | null; city: string
  refresh: () => Promise<boolean>; setCity: (city: string, persist?: boolean) => Promise<boolean>
  signIn: (email: string, password: string) => Promise<boolean>; signUp: (name: string, email: string, password: string) => Promise<boolean>; signOut: () => Promise<void>
  saveProfile: (input: Partial<Pick<User, 'name' | 'bio' | 'city' | 'birthDate' | 'maritalStatus' | 'childrenCount' | 'hasCar' | 'workSchedule'>>) => Promise<boolean>; changeAvatar: (file: File) => Promise<boolean>
  favorite: (eventId: string) => Promise<boolean>; like: (eventId: string) => Promise<boolean>; participate: (eventId: string) => Promise<boolean>; postComment: (eventId: string, text: string) => Promise<boolean>; refreshComments: (eventId: string) => Promise<void>; review: (participationId: string, status: 'confirmed' | 'rejected') => Promise<boolean>; addNewEvent: (input: CreateEventInput) => Promise<boolean>; editEvent: (eventId: string, input: CreateEventInput) => Promise<boolean>
}
const AppDataContext = createContext<AppDataContextValue | null>(null)
const cityStorageKey = 'sport-together-city'
const readSavedCity = () => { try { return localStorage.getItem(cityStorageKey)?.trim() ?? '' } catch { return '' } }

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
    try { setError(null); await load(city); return true }
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
  const saveProfile = useCallback(async (input: Partial<Pick<User, 'name' | 'bio' | 'city' | 'birthDate' | 'maritalStatus' | 'childrenCount' | 'hasCar' | 'workSchedule'>>) => { try { const user = await updateProfile(input); setCurrentUser(user); if (input.city !== undefined) { setCityState(user.city); try { localStorage.setItem(cityStorageKey, user.city) } catch {} } await load(input.city ?? city, user); return true } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось сохранить профиль.'); return false } }, [city, load])
  const changeAvatar = useCallback(async (file: File) => { try { const user = await uploadAvatar(file); setCurrentUser(user); await load(city, user); return true } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось загрузить фото.'); return false } }, [city, load])
  const refreshComments = useCallback(async (eventId: string) => { try { const comments = await fetchComments(eventId); setState((old) => old ? { ...old, comments: [...old.comments.filter((item) => item.eventId !== eventId), ...comments] } : old) } catch { /* polling should not interrupt reading */ } }, [])
  const value = useMemo<AppDataContextValue | null>(() => state ? ({ state, currentUser, loading, error, city, refresh, setCity, signIn, signUp, signOut, saveProfile, changeAvatar, favorite: (id) => runMutation(() => toggleFavorite(id)), like: (id) => runMutation(() => toggleLike(id)), participate: (id) => runMutation(() => joinEvent(id)), postComment: (id, text) => text.trim() ? runMutation(() => addComment(id, text.trim())) : Promise.resolve(false), refreshComments, review: (id, decision) => runMutation(() => reviewParticipation(id, decision)), addNewEvent: (input) => runMutation(() => createEvent(input)), editEvent: (id, input) => runMutation(() => updateEvent(id, input)) }) : null, [state, currentUser, loading, error, city, refresh, setCity, signIn, signUp, signOut, saveProfile, changeAvatar, runMutation, refreshComments])
  if (!value) return <div className="flex min-h-[100dvh] items-center justify-center bg-bg px-4 text-center text-sm text-muted"><div><p>{error ?? 'Загружаем события…'}</p>{error && <button type="button" onClick={() => void refresh()} className="mt-3 text-accent">Повторить</button>}</div></div>
  return <AppDataContext.Provider value={value}>{error && <div role="alert" className="fixed inset-x-4 top-4 z-[60] mx-auto max-w-md rounded-xl bg-warning px-4 py-3 text-center text-sm text-bg shadow-lg">{error}</div>}{children}</AppDataContext.Provider>
}
export function useAppData() { const ctx = useContext(AppDataContext); if (!ctx) throw new Error('useAppData must be used within AppDataProvider'); return ctx }
