export const ADMIN_EMAIL = 'admin@kto-kuda.ru'
/** Демо-пароль администратора; в storage хранится только hash. */
export const ADMIN_PASSWORD = 'Admin2026!'
export const ADMIN_PASSWORD_HASH =
  '04445e6487736590d1ef50186b414e737e0164683cbbec64e00e73c000fd3bef'

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  const hash = await hashPassword(password)
  return hash === passwordHash
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
