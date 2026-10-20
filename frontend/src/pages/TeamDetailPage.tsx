import { Camera } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  acceptJoinRequest,
  fetchDiscoveryTeam,
  fetchTeamJoinRequests,
  inviteTeamByEmail,
  joinTeamRequest,
  leaveTeam,
  rejectJoinRequest,
  uploadTeamLogo,
} from '../api/discovery'
import { useAppData } from '../app/AppDataContext'
import { TeamMembersPreview } from '../components/discovery/TeamMembersPreview'
import { PageHeader } from '../components/PageHeader'
import { PrimaryButton } from '../components/PrimaryButton'
import type { DiscoveryTeamCard, TeamJoinRequestRow } from '../data/discoveryTypes'

function teamRoleLabel(role: string | undefined | null) {
  if (role === 'CAPTAIN') return 'Капитан'
  if (role === 'ADMIN') return 'Администратор'
  if (role === 'MEMBER') return 'Участник'
  return 'Участник'
}

export function TeamDetailPage() {
  const { currentUser } = useAppData()
  const navigate = useNavigate()
  const { id: teamId = '' } = useParams()
  const [team, setTeam] = useState<DiscoveryTeamCard | null>(null)
  const [error, setError] = useState('')
  const [joinBusy, setJoinBusy] = useState(false)
  const [requests, setRequests] = useState<TeamJoinRequestRow[]>([])
  const [requestsBusy, setRequestsBusy] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteStatus, setInviteStatus] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [logoBusy, setLogoBusy] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [leaveBusy, setLeaveBusy] = useState(false)
  const [newCaptainId, setNewCaptainId] = useState('')
  const logoInputRef = useRef<HTMLInputElement>(null)

  const loadTeam = () => {
    void fetchDiscoveryTeam(teamId)
      .then(setTeam)
      .catch((err) => setError(err instanceof Error ? err.message : 'Не удалось загрузить команду.'))
  }

  useEffect(() => {
    loadTeam()
  }, [teamId])

  useEffect(() => {
    if (!team?.canManage) {
      setRequests([])
      return
    }
    setRequestsBusy(true)
    void fetchTeamJoinRequests(teamId)
      .then(setRequests)
      .catch(() => setRequests([]))
      .finally(() => setRequestsBusy(false))
  }, [team?.canManage, teamId])

  const submitJoin = async () => {
    if (joinBusy) return
    setJoinBusy(true)
    setError('')
    try {
      await joinTeamRequest(teamId)
      loadTeam()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить заявку.')
    } finally {
      setJoinBusy(false)
    }
  }

  const reviewRequest = async (requestId: number, decision: 'accept' | 'reject') => {
    setRequestsBusy(true)
    setError('')
    try {
      if (decision === 'accept') await acceptJoinRequest(teamId, requestId)
      else await rejectJoinRequest(teamId, requestId)
      setRequests((items) => items.filter((item) => item.requestId !== requestId))
      loadTeam()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось обработать заявку.')
    } finally {
      setRequestsBusy(false)
    }
  }

  const sendInvite = async () => {
    const email = inviteEmail.trim()
    if (!email || inviteBusy) return
    setInviteBusy(true)
    setInviteStatus('')
    try {
      const result = await inviteTeamByEmail(teamId, email)
      setInviteEmail('')
      setInviteStatus(
        result.userFound
          ? 'Приглашение отправлено. Пользователь увидит его в уведомлениях.'
          : 'Приглашение сохранено. Пользователь увидит его после регистрации с этой почтой.',
      )
    } catch (err) {
      setInviteStatus(err instanceof Error ? err.message : 'Не удалось отправить приглашение.')
    } finally {
      setInviteBusy(false)
    }
  }

  const onLogoSelected = async (file: File | undefined) => {
    if (!file || !team?.canManage || logoBusy) return
    setLogoBusy(true)
    setError('')
    try {
      const result = await uploadTeamLogo(teamId, file)
      setTeam((current) => (current ? { ...current, logoUrl: result.logoUrl } : current))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить аватар.')
    } finally {
      setLogoBusy(false)
    }
  }

  if (error && !team) {
    return (
      <div className="page-frame">
        <PageHeader title="Команда" back />
        <p className="text-sm text-warning">{error}</p>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="page-frame">
        <PageHeader title="Команда" back />
        <p className="text-sm text-muted">Загрузка…</p>
      </div>
    )
  }

  const canJoin = !team.viewerRole && !team.joinRequestStatus
  const isMember = Boolean(team.viewerRole)
  const isCaptain = team.viewerRole === 'CAPTAIN'
  const captainTransferCandidates = team.members.filter((member) => member.id !== currentUser?.id)
  const soleCaptain = isCaptain && team.membersCount <= 1

  const confirmLeave = async () => {
    if (leaveBusy) return
    setLeaveBusy(true)
    setError('')
    try {
      await leaveTeam(teamId, isCaptain && team.membersCount > 1 ? newCaptainId || undefined : undefined)
      setLeaveOpen(false)
      navigate('/profile')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось выйти из команды.')
    } finally {
      setLeaveBusy(false)
    }
  }

  return (
    <div className="page-frame pb-6">
      <PageHeader title={team.name} back />
      {error && <p role="alert" className="mb-4 rounded-xl bg-warning/10 px-3 py-2 text-sm text-warning">{error}</p>}
      <section className="rounded-[1.75rem] border border-white/10 bg-card p-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            {team.logoUrl ? (
              <img src={team.logoUrl} alt="" className="h-20 w-20 rounded-2xl object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/15 text-3xl">🏆</div>
            )}
            {team.canManage && (
              <>
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoBusy}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white shadow-lg disabled:opacity-60"
                  aria-label="Загрузить аватар команды"
                >
                  <Camera size={16} />
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    void onLogoSelected(file)
                    event.target.value = ''
                  }}
                />
              </>
            )}
          </div>
          <div>
            <p className="text-sm text-muted">{team.sport}</p>
            <p className="text-sm text-muted">{team.city}</p>
            {team.viewerRole && (
              <p className="mt-1 text-xs font-semibold text-accent">Ваш статус: {teamRoleLabel(team.viewerRole)}</p>
            )}
            {team.joinRequestStatus === 'PENDING' && (
              <p className="mt-1 text-xs font-semibold text-amber-300">Заявка на вступление на рассмотрении</p>
            )}
            {team.createdAt && (
              <p className="mt-1 text-xs text-muted">Создана {new Date(team.createdAt).toLocaleDateString('ru-RU')}</p>
            )}
          </div>
        </div>
        {team.description && <p className="mt-4 text-sm leading-relaxed text-muted">{team.description}</p>}
        {canJoin && (
          <PrimaryButton className="mt-4" disabled={joinBusy} onClick={() => void submitJoin()}>
            {joinBusy ? 'Отправляем…' : 'Подать заявку на вступление'}
          </PrimaryButton>
        )}
        {isMember && (
          <button
            type="button"
            className="mt-4 w-full rounded-xl border border-warning/40 px-4 py-2.5 text-sm font-semibold text-warning"
            onClick={() => {
              setNewCaptainId(captainTransferCandidates[0]?.id ?? '')
              setLeaveOpen(true)
            }}
          >
            Выйти из команды
          </button>
        )}
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-bg/70 p-3">
            <p className="text-muted">Игр</p>
            <p className="text-xl font-bold text-accent">{team.stats.games}</p>
          </div>
          <div className="rounded-xl bg-bg/70 p-3">
            <p className="text-muted">Winrate</p>
            <p className="text-xl font-bold text-accent">{team.stats.winRate}%</p>
          </div>
        </div>
      </section>

      {team.canManage && (
        <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-card p-5">
          <h2 className="text-lg font-bold">Пригласить по почте</h2>
          <p className="mt-1 text-sm text-muted">Отправьте приглашение зарегистрированному пользователю или сохраните его для новой регистрации.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="email@example.com"
              className="min-h-11 flex-1 rounded-xl border border-white/10 bg-bg px-3 text-sm text-white outline-none focus:border-accent"
            />
            <button
              type="button"
              disabled={inviteBusy || !inviteEmail.trim()}
              onClick={() => void sendInvite()}
              className="min-h-11 rounded-xl bg-accent px-4 text-sm font-bold text-white disabled:opacity-50"
            >
              {inviteBusy ? 'Отправка…' : 'Пригласить'}
            </button>
          </div>
          {inviteStatus && <p className="mt-2 text-xs text-muted">{inviteStatus}</p>}
        </section>
      )}

      {team.canManage && (
        <section className="mt-5 rounded-[1.75rem] border border-accent/25 bg-card p-5">
          <h2 className="text-lg font-bold">Заявки на вступление</h2>
          {requestsBusy && requests.length === 0 && <p className="mt-3 text-sm text-muted">Загрузка…</p>}
          {!requestsBusy && requests.length === 0 && (
            <p className="mt-3 text-sm text-muted">Нет ожидающих заявок.</p>
          )}
          <ul className="mt-3 space-y-3">
            {requests.map((request) => (
              <li key={request.requestId} className="rounded-xl border border-white/10 p-3">
                <div className="flex items-center gap-3">
                  <img src={request.avatarUrl || '/images/hero.png'} alt="" className="h-10 w-10 rounded-full object-cover" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/users/${request.userId}`} className="font-semibold text-white hover:text-accent">
                      {request.name}
                    </Link>
                    {request.createdAt && (
                      <p className="text-xs text-muted">{new Date(request.createdAt).toLocaleString('ru-RU')}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={requestsBusy}
                    onClick={() => void reviewRequest(request.requestId, 'reject')}
                    className="min-h-10 flex-1 rounded-xl border border-warning/40 text-sm font-semibold text-warning"
                  >
                    Отклонить
                  </button>
                  <button
                    type="button"
                    disabled={requestsBusy}
                    onClick={() => void reviewRequest(request.requestId, 'accept')}
                    className="min-h-10 flex-1 rounded-xl bg-accent text-sm font-bold text-white"
                  >
                    Принять
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-card p-5">
        <h2 className="text-lg font-bold">Участники</h2>
        <div className="mt-3 space-y-3">
          {team.members.map((member) => (
            <Link
              key={member.id}
              to={`/users/${member.id}`}
              className="flex items-center gap-3 rounded-xl border border-white/10 px-3 py-2"
            >
              <img src={member.avatarUrl || '/images/hero.png'} alt="" className="h-10 w-10 rounded-full object-cover" />
              <div>
                <p className="font-semibold text-white">{member.name}</p>
                <p className="text-xs text-muted">{teamRoleLabel(member.role)}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-4">
          <TeamMembersPreview members={team.members} />
        </div>
      </section>
      {team.history && team.history.length > 0 && (
        <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-card p-5">
          <h2 className="text-lg font-bold">История</h2>
          <ul className="mt-3 space-y-3 text-sm text-muted">
            {team.history.map((item) => (
              <li key={`${item.date}-${item.title}`}>
                <p className="text-white/90">{new Date(item.date).toLocaleDateString('ru-RU')} — {item.title}</p>
                <p>{item.place}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      <Link to="/discovery?mode=teams" className="mt-6 inline-block text-sm font-semibold text-accent">
        Вернуться к поиску команд
      </Link>

      {leaveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card p-5 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Выйти из команды «{team.name}»?</h3>
            {soleCaptain ? (
              <p className="mt-3 text-sm text-muted">
                Нельзя выйти из команды, пока вы являетесь единственным капитаном. Сначала распустите команду или передайте управление.
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted">
                После выхода вы перестанете быть участником команды.
              </p>
            )}
            {isCaptain && !soleCaptain && captainTransferCandidates.length > 0 && (
              <label className="mt-4 block text-sm text-muted">
                Новый капитан
                <select
                  value={newCaptainId}
                  onChange={(event) => setNewCaptainId(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-bg px-3 py-2.5 text-sm text-white"
                >
                  {captainTransferCandidates.map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </label>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl border border-white/15 px-3 py-2.5 text-sm font-semibold text-white"
                onClick={() => setLeaveOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={leaveBusy || soleCaptain || (isCaptain && team.membersCount > 1 && !newCaptainId)}
                className="flex-1 rounded-xl bg-warning/90 px-3 py-2.5 text-sm font-bold text-bg disabled:opacity-50"
                onClick={() => void confirmLeave()}
              >
                {leaveBusy ? 'Выходим…' : 'Выйти'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
