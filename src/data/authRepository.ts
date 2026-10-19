import { ADMIN_EMAIL, hashPassword, normalizeEmail, verifyPassword } from './auth'
import type { AppState, AuthAccount, User } from './types'

const STORAGE_KEY = 'sport-together-db'

function persist(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export type AuthResult = { ok: true; state: AppState } | { ok: false; error: string }

export interface RegisterInput {
  name: string
  email: string
  password: string
  city: string
}

export function migrateAuthState(state: AppState, seed: AppState): AppState {
  let next: AppState = {
    ...state,
    accounts: state.accounts ?? seed.accounts,
    currentUserId: state.currentUserId ?? null,
  }

  const filtered = next.notifications?.filter((n) => n.title !== 'Обновите приложение')
  if (filtered && filtered.length !== next.notifications.length) {
    next = { ...next, notifications: filtered }
  }

  if ((next.version ?? 0) < 3) {
    next = {
      ...next,
      version: 3,
      accounts: seed.accounts,
      currentUserId: null,
    }
  }

  if (!next.accounts?.length) {
    next = { ...next, accounts: seed.accounts }
  }

  const hasAdmin = next.accounts.some((a) => a.email === ADMIN_EMAIL)
  if (!hasAdmin) {
    const adminAcc = seed.accounts.find((a) => a.email === ADMIN_EMAIL)
    if (adminAcc) {
      next = { ...next, accounts: [...next.accounts, adminAcc] }
    }
  }

  if (next.currentUserId && !next.users.some((u) => u.id === next.currentUserId)) {
    next = { ...next, currentUserId: null }
  }

  next.version = 3
  return next
}

export async function loginWithPassword(
  state: AppState,
  email: string,
  password: string,
): Promise<AuthResult> {
  const normalized = normalizeEmail(email)
  const account = state.accounts.find((a) => a.email === normalized)
  if (!account) {
    return { ok: false, error: 'Неверный email или пароль' }
  }
  const valid = await verifyPassword(password, account.passwordHash)
  if (!valid) {
    return { ok: false, error: 'Неверный email или пароль' }
  }
  const next = { ...state, currentUserId: account.userId }
  persist(next)
  return { ok: true, state: next }
}

export async function registerAccount(
  state: AppState,
  input: RegisterInput,
): Promise<AuthResult> {
  const name = input.name.trim()
  const email = normalizeEmail(input.email)
  const password = input.password

  if (!name) return { ok: false, error: 'Укажите имя' }
  if (!email.includes('@')) return { ok: false, error: 'Некорректный email' }
  if (password.length < 6) return { ok: false, error: 'Пароль не менее 6 символов' }
  if (state.accounts.some((a) => a.email === email)) {
    return { ok: false, error: 'Этот email уже зарегистрирован' }
  }

  const passwordHash = await hashPassword(password)
  const userId = `u-${Date.now()}`
  const user: User = {
    id: userId,
    name,
    city: input.city.trim() || state.city,
    role: 'user',
    avatarUrl: `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`,
    stats: { events: 0, subscriptions: 0, followers: 0 },
  }
  const account: AuthAccount = {
    id: `acc-${Date.now()}`,
    userId,
    email,
    passwordHash,
  }

  const next = {
    ...state,
    users: [...state.users, user],
    accounts: [...state.accounts, account],
    currentUserId: userId,
  }
  persist(next)
  return { ok: true, state: next }
}

export function logoutUser(state: AppState): AppState {
  const next = { ...state, currentUserId: null }
  persist(next)
  return next
}
