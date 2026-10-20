import { MapPin } from 'lucide-react'
import type { DiscoveryUserCard } from '../../data/discoveryTypes'
import { CompatibilityScore } from './CompatibilityScore'

export function UserDiscoveryCard({ user, preview }: { user: DiscoveryUserCard; preview?: boolean }) {
  return (
    <article
      className={`overflow-hidden rounded-[1.75rem] border border-white/10 bg-card shadow-[0_16px_40px_rgba(10,47,67,0.2)] ${preview ? 'pointer-events-none' : ''}`}
    >
      <div className="relative h-52 bg-bg">
        <img
          src={user.avatarUrl || '/images/hero.png'}
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-card via-card/80 to-transparent px-4 pb-3 pt-10">
          <h2 className="text-2xl font-bold text-white">
            {user.name}
            {user.age ? `, ${user.age}` : ''}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <MapPin size={16} />
            {user.city || 'Город не указан'}
          </p>
        </div>
      </div>
      <div className="space-y-4 p-4">
        <div className="flex justify-center">
          <CompatibilityScore value={user.compatibility} />
        </div>
        {user.bio && (
          <section>
            <h3 className="text-sm font-bold text-white">О пользователе</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">{user.bio}</p>
          </section>
        )}
        {user.interests.length > 0 && (
          <section>
            <h3 className="text-sm font-bold text-white">Интересы</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {user.interests.map((item) => (
                <span key={item.slug} className="rounded-full border border-white/10 bg-bg px-3 py-1 text-xs font-semibold text-white/90">
                  {item.name}
                </span>
              ))}
            </div>
          </section>
        )}
        {user.sportStats.length > 0 && (
          <section>
            <h3 className="text-sm font-bold text-white">Спортивная активность</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              {user.sportStats.map((row) => (
                <li key={row.sport} className="flex justify-between gap-3">
                  <span className="text-white/90">{row.sport}</span>
                  <span>{row.games} игр</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="rounded-xl border border-white/10 bg-bg/60 p-3 text-center">
          <p className="text-2xl">🐹</p>
          <p className="mt-1 text-sm font-bold text-white">Спортик</p>
          <p className="text-sm text-accent">Уровень {user.sportik.level}</p>
        </section>
      </div>
    </article>
  )
}
