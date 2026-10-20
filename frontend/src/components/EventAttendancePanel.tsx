import { useEffect, useState } from 'react'
import { fetchEventAttendance, saveEventAttendance, type EventAttendanceResponse } from '../data/api'
import { attendanceWindowOpen, formatReliabilityPercent } from '../lib/attendance'
import { formatEventDate, isPast } from '../lib/format'
import { PrimaryButton } from './PrimaryButton'

type Props = {
  eventId: string
  startsAt: string
  onSaved?: () => void
}

export function EventAttendancePanel({ eventId, startsAt, onSaved }: Props) {
  const [data, setData] = useState<EventAttendanceResponse | null>(null)
  const [marks, setMarks] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void fetchEventAttendance(eventId)
      .then((payload) => {
        if (cancelled) return
        setData(payload)
        const next: Record<string, boolean> = {}
        for (const row of payload.rows) {
          if (row.attended !== null) next[row.userId] = row.attended
        }
        setMarks(next)
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Не удалось загрузить список.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [eventId])

  const windowOpen = data?.windowOpen ?? attendanceWindowOpen(startsAt)
  const deadline = data?.deadlineAt ? formatEventDate(data.deadlineAt).date : null

  const save = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const payload = Object.entries(marks).map(([userId, attended]) => ({ userId, attended }))
      const updated = await saveEventAttendance(eventId, payload)
      setData(updated)
      setMessage('Посещаемость сохранена.')
      onSaved?.()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось сохранить отметки.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="mt-4 text-sm text-muted">Загружаем список участников…</p>
  }

  if (error && !data) {
    return <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>
  }

  if (!data) return null

  const beforeStart = !isPast(startsAt)

  return (
    <div className="mt-4 rounded-[1.35rem] border border-white/[0.08] bg-card p-4">
      <h3 className="font-bold text-white">Посещаемость</h3>
      <p className="mt-1 text-xs leading-5 text-muted">
        Отметьте, кто пришёл на событие. Окно — 7 дней после начала. Отметки влияют на надёжность участника в профиле.
      </p>
      {beforeStart && (
        <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-muted">
          Отметки станут доступны после начала мероприятия.
        </p>
      )}
      {!beforeStart && !windowOpen && (
        <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-muted">
          Срок отметок истёк{deadline ? ` (до ${deadline})` : ''}. Изменить список уже нельзя.
        </p>
      )}
      {!beforeStart && windowOpen && deadline && (
        <p className="mt-2 text-xs font-medium text-accent">Можно отмечать до {deadline}</p>
      )}
      {data.rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Нет подтверждённых участников.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {data.rows.map((row) => {
            const marked = row.userId in marks
            const attended = marks[row.userId]
            const readOnly = !windowOpen || beforeStart
            return (
              <li
                key={row.participationId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-bg/40 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{row.name}</p>
                  {row.reliabilityPercent !== null && row.reliabilityPercent !== undefined && (
                    <p className="text-[11px] text-muted">
                      Надёжность: {formatReliabilityPercent(row.reliabilityPercent)}
                    </p>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => setMarks((prev) => ({ ...prev, [row.userId]: true }))}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${
                      marked && attended ? 'bg-accent text-white' : 'border border-white/15 text-muted hover:text-white'
                    }`}
                  >
                    Был
                  </button>
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => setMarks((prev) => ({ ...prev, [row.userId]: false }))}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${
                      marked && attended === false ? 'bg-warning/90 text-bg' : 'border border-white/15 text-muted hover:text-white'
                    }`}
                  >
                    Не был
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {windowOpen && !beforeStart && data.rows.length > 0 && (
        <PrimaryButton fullWidth className="mt-4" disabled={saving || Object.keys(marks).length === 0} onClick={() => void save()}>
          {saving ? 'Сохраняем…' : 'Сохранить посещаемость'}
        </PrimaryButton>
      )}
      {message && <p className="mt-3 text-sm text-accent">{message}</p>}
      {error && data && <p role="alert" className="mt-2 text-sm text-rose-300">{error}</p>}
    </div>
  )
}
