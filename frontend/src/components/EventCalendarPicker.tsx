import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useMemo, useState } from 'react'

function dateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

interface EventCalendarPickerProps {
  open: boolean
  selected: Date
  markedDays: ReadonlySet<string>
  onClose: () => void
  onSelect: (date: Date) => void
}

export function EventCalendarPicker({ open, selected, markedDays, onClose, onSelect }: EventCalendarPickerProps) {
  const [viewMonth, setViewMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1))

  const grid = useMemo(() => {
    const year = viewMonth.getFullYear()
    const month = viewMonth.getMonth()
    const first = new Date(year, month, 1)
    const startOffset = (first.getDay() + 6) % 7
    const cells: (Date | null)[] = []
    for (let i = 0; i < startOffset; i += 1) cells.push(null)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day))
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [viewMonth])

  if (!open) return null

  const monthLabel = viewMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })

  const shiftMonth = (delta: number) => {
    setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Выбор даты">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-card p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button type="button" onClick={() => shiftMonth(-1)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-white/10 hover:text-white" aria-label="Предыдущий месяц">
            <ChevronLeft size={18} />
          </button>
          <p className="text-sm font-bold capitalize text-white">{monthLabel}</p>
          <button type="button" onClick={() => shiftMonth(1)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-white/10 hover:text-white" aria-label="Следующий месяц">
            <ChevronRight size={18} />
          </button>
          <button type="button" onClick={onClose} className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-white/10 hover:text-white" aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>
        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-muted">
          {['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((day, index) => {
            if (!day) return <span key={`empty-${index}`} className="h-10" />
            const active =
              day.getDate() === selected.getDate() &&
              day.getMonth() === selected.getMonth() &&
              day.getFullYear() === selected.getFullYear()
            const hasEvents = markedDays.has(dateKey(day))
            return (
              <button
                key={dateKey(day)}
                type="button"
                onClick={() => {
                  onSelect(day)
                  onClose()
                }}
                className={`relative flex h-10 flex-col items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                  active ? 'bg-chip text-[#151b1f]' : 'text-white/85 hover:bg-white/10'
                }`}
              >
                {day.getDate()}
                {hasEvents && (
                  <span className={`absolute bottom-1 h-1 w-1 rounded-full ${active ? 'bg-accent' : 'bg-accent/90'}`} />
                )}
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-center text-xs text-muted">Точка — в этот день есть мероприятия с учётом выбранных фильтров</p>
      </div>
    </div>
  )
}

export function eventDateKey(iso: string): string {
  const d = new Date(iso)
  return dateKey(d)
}
