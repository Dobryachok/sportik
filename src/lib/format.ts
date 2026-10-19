export const ruWeekdayShort = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'] as const
const ruWeekdayLong = [
  'Воскресенье',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
] as const

export function formatEventDate(iso: string): { date: string; day: string; time: string } {
  const d = new Date(iso)
  const date = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
  const day = ruWeekdayShort[d.getDay()].toUpperCase()
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return { date, day, time }
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatNotificationDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function isPast(iso: string): boolean {
  return new Date(iso).getTime() < Date.now()
}

export function getWeekdayLong(iso: string): string {
  return ruWeekdayLong[new Date(iso).getDay()]
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
