import { MapPin, Trophy } from 'lucide-react'
import type { DiscoveryTeamCard } from '../../data/discoveryTypes'
import { CompatibilityScore } from './CompatibilityScore'
import { TeamMembersPreview } from './TeamMembersPreview'

export function TeamDiscoveryCard({
  team,
  preview,
  onOpen,
}: {
  team: DiscoveryTeamCard
  preview?: boolean
  onOpen?: (teamId: string) => void
}) {
  return (
    <article
      className={`overflow-hidden rounded-[1.75rem] border border-white/10 bg-card shadow-[0_16px_40px_rgba(10,47,67,0.2)] ${preview ? 'pointer-events-none' : ''}`}
    >
      <button
        type="button"
        className="w-full text-left"
        onClick={() => !preview && onOpen?.(team.id)}
      >
        <div className="flex h-40 items-center justify-center bg-bg">
          {team.logoUrl ? (
            <img src={team.logoUrl} alt="" className="h-24 w-24 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-accent/15 text-3xl">🏆</div>
          )}
        </div>
      </button>
      <div className="space-y-4 p-4">
        <div>
          <h2 className="text-2xl font-bold text-white">{team.name}</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted">
            <Trophy size={16} className="text-accent" />
            {team.sport}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <MapPin size={16} />
            {team.city}
          </p>
          <p className="mt-2 text-sm text-muted">👥 {team.membersCount} участников</p>
        </div>
        <div className="flex justify-center">
          <CompatibilityScore value={team.compatibility} />
        </div>
        {team.description && <p className="text-sm leading-relaxed text-muted">{team.description}</p>}
        <section>
          <h3 className="text-sm font-bold text-white">Статистика</h3>
          <p className="mt-1 text-sm text-muted">
            {team.stats.games} игр
            {team.stats.wins > 0 ? ` · ${team.stats.wins} побед` : ''}
          </p>
        </section>
        <section>
          <h3 className="mb-2 text-sm font-bold text-white">Участники</h3>
          <TeamMembersPreview members={team.members} />
        </section>
      </div>
    </article>
  )
}
