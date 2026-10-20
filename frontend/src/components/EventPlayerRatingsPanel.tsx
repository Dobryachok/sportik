import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchEventPlayerRatings,
  saveEventPlayerRating,
  type EventPlayerRatingsResponse,
} from '../data/api'
import { attendanceWindowOpen } from '../lib/attendance'
import { formatEventDate } from '../lib/format'
import { StarPicker, StarRating } from './StarRating'

function skillScoreFromStars(stars: number) {
  return Math.max(1, Math.min(100, Math.round(stars * 20)))
}

function starsFromSkillScore(score: number | null | undefined) {
  if (score == null) return 0
  return Math.max(0, Math.min(5, score / 20))
}

type Props = {
  eventId: string
  startsAt: string
  joinMode: 'open' | 'application'
}

function RatingSlider({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string
  value: number
  disabled?: boolean
  onChange: (score: number) => void
}) {
  return (
    <label className="block min-w-0 flex-1">
      <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-muted">
        <span>{label}</span>
        <span className="tabular-nums text-white">{value}%</span>
      </div>
      <input
        type="range"
        min={1}
        max={100}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1.5 h-2 w-full cursor-pointer accent-accent disabled:cursor-not-allowed disabled:opacity-50"
      />
    </label>
  )
}

export function EventPlayerRatingsPanel({ eventId, startsAt, joinMode }: Props) {
  const [data, setData] = useState<EventPlayerRatingsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [draftFriendliness, setDraftFriendliness] = useState<Record<string, number>>({})
  const [draftSkill, setDraftSkill] = useState<Record<string, number>>({})
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void fetchEventPlayerRatings(eventId)
      .then((payload) => {
        if (cancelled) return
        setData(payload)
        const friendliness: Record<string, number> = {}
        const skill: Record<string, number> = {}
        for (const row of payload.rows) {
          if (row.myFriendliness != null) friendliness[row.userId] = row.myFriendliness
          if (row.skillScore != null) skill[row.userId] = row.skillScore
        }
        setDraftFriendliness(friendliness)
        setDraftSkill(skill)
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Не удалось загрузить оценки.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [eventId])

  const queueSave = (key: string, action: () => Promise<void>) => {
    const existing = saveTimers.current[key]
    if (existing) clearTimeout(existing)
    saveTimers.current[key] = setTimeout(() => {
      void action().catch((cause) => {
        setError(cause instanceof Error ? cause.message : 'Не удалось сохранить оценку.')
      })
    }, 450)
  }

  const saveFriendliness = (targetUserId: string, score: number) => {
    setDraftFriendliness((prev) => ({ ...prev, [targetUserId]: score }))
    queueSave(`f:${targetUserId}`, async () => {
      const updated = await saveEventPlayerRating(eventId, {
        targetUserId,
        kind: 'friendliness',
        score,
      })
      setData(updated)
      setDraftFriendliness((prev) => {
        const next = { ...prev }
        for (const row of updated.rows) {
          if (row.myFriendliness != null) next[row.userId] = row.myFriendliness
        }
        return next
      })
    })
  }

  const saveSkill = (targetUserId: string, score: number) => {
    setDraftSkill((prev) => ({ ...prev, [targetUserId]: score }))
    queueSave(`s:${targetUserId}`, async () => {
      const updated = await saveEventPlayerRating(eventId, {
        targetUserId,
        kind: 'skill',
        score,
      })
      setData(updated)
      setDraftSkill((prev) => {
        const next = { ...prev }
        for (const row of updated.rows) {
          if (row.skillScore != null) next[row.userId] = row.skillScore
        }
        return next
      })
    })
  }

  if (loading) return <p className="mt-4 text-sm text-muted">Загружаем оценки участников…</p>
  if (error && !data) return <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>
  if (!data) return null

  const windowOpen = data.windowOpen ?? attendanceWindowOpen(startsAt)
  const deadline = data.deadlineAt ? formatEventDate(data.deadlineAt).date : null
  const showSkillColumn = joinMode === 'open'

  return (
    <section className="mt-6 rounded-[1.35rem] border border-white/[0.08] bg-card p-4">
      <h2 className="text-xl font-bold tracking-[-0.025em]">Оценки участников</h2>
      <p className="mt-1 text-xs leading-5 text-muted">
        Дружелюбие — ползунок (оценивают участники). Скилл — только звёзды 1–5 (выставляет организатор на открытых событиях).
      </p>
      {!windowOpen && (
        <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-muted">
          Срок оценок истёк{deadline ? ` (до ${deadline})` : ''}.
        </p>
      )}
      {windowOpen && deadline && (
        <p className="mt-2 text-xs font-medium text-accent">Можно оценивать до {deadline}</p>
      )}
      {data.rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Нет подтверждённых участников.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {data.rows.map((row) => {
            const friendlinessValue = draftFriendliness[row.userId] ?? row.myFriendliness ?? 70
            const skillScore = draftSkill[row.userId] ?? row.skillScore ?? null
            const skillStars = starsFromSkillScore(skillScore)
            return (
              <li
                key={row.userId}
                className="rounded-xl border border-white/[0.06] bg-bg/40 p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <img
                    src={row.avatarUrl || '/images/hero.png'}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <Link to={`/users/${row.userId}`} className="truncate font-semibold text-white hover:text-accent">
                      {row.name}
                    </Link>
                    <p className="truncate text-xs text-muted">{row.city || 'Город не указан'}</p>
                  </div>
                </div>
                <div className="mt-3 space-y-3">
                  {showSkillColumn && (
                    <div className="rounded-lg border border-white/[0.06] bg-card/40 px-3 py-2.5">
                      <p className="text-[11px] font-medium text-muted">Скилл (организатор)</p>
                      <div className="mt-2">
                        {row.canRateSkill && windowOpen ? (
                          <StarPicker
                            value={skillStars || 0}
                            size={26}
                            onChange={(stars) => saveSkill(row.userId, skillScoreFromStars(stars))}
                          />
                        ) : skillScore != null ? (
                          <StarRating value={skillStars} size={18} />
                        ) : (
                          <p className="text-xs text-muted">Организатор ещё не выставил скилл</p>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="rounded-lg border border-white/[0.06] bg-card/40 px-3 py-2.5">
                    <p className="text-[11px] font-medium text-muted">Дружелюбие</p>
                    {row.canRateFriendliness && windowOpen ? (
                      <>
                        <RatingSlider
                          label="Ваша оценка"
                          value={friendlinessValue}
                          onChange={(score) => saveFriendliness(row.userId, score)}
                        />
                        {row.avgFriendliness != null && (
                          <p className="mt-1 text-[10px] text-muted">
                            Среднее по событию: {row.avgFriendliness}%
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-white">
                        {row.avgFriendliness != null ? `${row.avgFriendliness}%` : '—'}
                        <span className="text-xs text-muted"> (среднее)</span>
                      </p>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {error && data && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
    </section>
  )
}
