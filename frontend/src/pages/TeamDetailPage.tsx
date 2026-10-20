import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchDiscoveryTeam } from '../api/discovery'
import { TeamMembersPreview } from '../components/discovery/TeamMembersPreview'
import { PageHeader } from '../components/PageHeader'
import type { DiscoveryTeamCard } from '../data/discoveryTypes'

export function TeamDetailPage() {
  const { id: teamId = '' } = useParams()
  const [team, setTeam] = useState<DiscoveryTeamCard | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    void fetchDiscoveryTeam(teamId)
      .then(setTeam)
      .catch((err) => setError(err instanceof Error ? err.message : 'Не удалось загрузить команду.'))
  }, [teamId])

  if (error) {
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

  return (
    <div className="page-frame pb-6">
      <PageHeader title={team.name} back />
      <section className="rounded-[1.75rem] border border-white/10 bg-card p-5">
        <div className="flex items-center gap-4">
          {team.logoUrl ? (
            <img src={team.logoUrl} alt="" className="h-20 w-20 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/15 text-3xl">🏆</div>
          )}
          <div>
            <p className="text-sm text-muted">{team.sport}</p>
            <p className="text-sm text-muted">{team.city}</p>
            {team.createdAt && (
              <p className="mt-1 text-xs text-muted">Создана {new Date(team.createdAt).toLocaleDateString('ru-RU')}</p>
            )}
          </div>
        </div>
        {team.description && <p className="mt-4 text-sm leading-relaxed text-muted">{team.description}</p>}
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
                <p className="text-xs text-muted">
                  {member.role === 'CAPTAIN' ? 'Капитан' : member.role === 'ADMIN' ? 'Администратор' : 'Участник'}
                </p>
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
    </div>
  )
}
