import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { acceptJoinRequest, fetchDiscoveryUser, fetchJoinRequestCard, rejectJoinRequest } from '../api/discovery'
import { DiscoveryCardStack } from '../components/discovery/DiscoveryCardStack'
import { SwipeControls } from '../components/discovery/SwipeControls'
import { UserDiscoveryCard } from '../components/discovery/UserDiscoveryCard'
import { PageHeader } from '../components/PageHeader'
import { PrimaryButton } from '../components/PrimaryButton'
import type { DiscoveryUserCard } from '../data/discoveryTypes'
import { useDiscovery } from '../hooks/useDiscovery'

export function DiscoveryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const mode = searchParams.get('mode') === 'teams' ? 'teams' : 'users'
  const navigate = useNavigate()
  const { current, next, loading, error, reload, actOnUser, actOnTeam } = useDiscovery(mode)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [highlightUser, setHighlightUser] = useState<DiscoveryUserCard | null>(null)
  const [joinRequest, setJoinRequest] = useState<Awaited<ReturnType<typeof fetchJoinRequestCard>> | null>(null)

  const requestId = searchParams.get('request')
  const userId = searchParams.get('user')

  useEffect(() => {
    if (userId) {
      void fetchDiscoveryUser(userId).then(setHighlightUser).catch(() => setHighlightUser(null))
    } else {
      setHighlightUser(null)
    }
  }, [userId])

  useEffect(() => {
    if (requestId) {
      const id = Number(requestId)
      if (Number.isFinite(id)) {
        void fetchJoinRequestCard(id).then(setJoinRequest).catch(() => setJoinRequest(null))
      }
    } else {
      setJoinRequest(null)
    }
  }, [requestId])

  const setMode = (nextMode: 'users' | 'teams') => {
    const params = new URLSearchParams(searchParams)
    params.set('mode', nextMode)
    params.delete('user')
    params.delete('request')
    setSearchParams(params, { replace: true })
  }

  const runAction = async (direction: 'left' | 'right') => {
    if (!current || busy) return
    setBusy(true)
    setActionError('')
    try {
      if (current.type === 'user') {
        await actOnUser(current.id, direction === 'right' ? 'like' : 'skip')
      } else {
        await actOnTeam(current.id, direction === 'right' ? 'join' : 'skip')
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Не удалось выполнить действие.')
    } finally {
      setBusy(false)
    }
  }

  const reviewRequest = async (decision: 'accept' | 'reject') => {
    if (!joinRequest) return
    setBusy(true)
    setActionError('')
    try {
      if (decision === 'accept') await acceptJoinRequest(joinRequest.teamId, joinRequest.requestId)
      else await rejectJoinRequest(joinRequest.teamId, joinRequest.requestId)
      const params = new URLSearchParams(searchParams)
      params.delete('request')
      setSearchParams(params, { replace: true })
      setJoinRequest(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Не удалось обработать заявку.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-frame pb-6">
      <PageHeader title="Поиск" back />
      <div className="mb-4 flex rounded-2xl border border-white/10 bg-card p-1">
        {(['users', 'teams'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMode(tab)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${
              mode === tab ? 'bg-accent text-white' : 'text-muted hover:text-white'
            }`}
          >
            {tab === 'users' ? 'Люди' : 'Команды'}
          </button>
        ))}
      </div>

      {joinRequest && (
        <section className="mb-5 rounded-[1.5rem] border border-accent/30 bg-card p-4">
          <h2 className="text-lg font-bold">Заявка в команду «{joinRequest.teamName}»</h2>
          <p className="mt-1 text-sm text-muted">{joinRequest.applicant.name} хочет вступить в вашу команду</p>
          <div className="mt-4">
            <UserDiscoveryCard user={joinRequest.applicant} />
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              to={`/users/${joinRequest.applicant.id}`}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-white/15 text-sm font-semibold text-white"
            >
              Посмотреть профиль
            </Link>
            <button
              type="button"
              disabled={busy}
              onClick={() => void reviewRequest('reject')}
              className="min-h-11 flex-1 rounded-xl border border-warning/50 text-sm font-bold text-warning"
            >
              Отклонить
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void reviewRequest('accept')}
              className="min-h-11 flex-1 rounded-xl bg-accent text-sm font-bold text-white"
            >
              Принять
            </button>
          </div>
        </section>
      )}

      {highlightUser && !joinRequest && (
        <section className="mb-5">
          <UserDiscoveryCard user={highlightUser} />
          <div className="mt-3 flex gap-2">
            <Link to={`/users/${highlightUser.id}`} className="text-sm font-semibold text-accent underline">
              Открыть профиль
            </Link>
          </div>
        </section>
      )}

      {(error || actionError) && (
        <p role="alert" className="mb-4 rounded-xl bg-warning/10 px-3 py-2 text-sm text-warning">
          {error || actionError}
        </p>
      )}

      {loading && !current && (
        <div className="rounded-2xl border border-dashed border-white/15 px-5 py-16 text-center text-sm text-muted">
          Загружаем рекомендации…
        </div>
      )}

      {!loading && !current && !highlightUser && !joinRequest && (
        <div className="rounded-2xl border border-dashed border-white/15 px-5 py-16 text-center">
          <p className="text-3xl">{mode === 'users' ? '😔' : '🏆'}</p>
          <p className="mt-3 text-base font-semibold text-white">
            {mode === 'users' ? 'Пока никого подходящего нет' : 'Команд пока нет'}
          </p>
          <p className="mt-2 text-sm text-muted">
            {mode === 'users'
              ? 'Вы посмотрели всех доступных пользователей. Попробуйте позже.'
              : 'Подходящих команд пока нет. Попробуйте позже.'}
          </p>
          <PrimaryButton className="mt-5" onClick={() => void reload()}>
            Обновить
          </PrimaryButton>
        </div>
      )}

      {current && !joinRequest && (
        <>
          <DiscoveryCardStack
            current={current}
            next={next}
            mode={mode}
            busy={busy}
            onSwipe={(direction) => void runAction(direction)}
            onOpenTeam={(teamId) => navigate(`/teams/${teamId}`)}
          />
          <SwipeControls
            mode={mode}
            disabled={busy}
            onSkip={() => void runAction('left')}
            onPrimary={() => void runAction('right')}
          />
        </>
      )}
    </div>
  )
}
