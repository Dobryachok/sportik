import { Link } from 'react-router-dom'
import type { TeamMemberPreview } from '../../data/discoveryTypes'

export function TeamMembersPreview({ members }: { members: TeamMemberPreview[] }) {
  if (!members.length) return <p className="text-sm text-muted">Участников пока нет.</p>
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {members.map((member) => (
        <Link
          key={member.id}
          to={`/users/${member.id}`}
          className="flex shrink-0 flex-col items-center gap-1"
          title={member.name}
        >
          <img
            src={member.avatarUrl || '/images/hero.png'}
            alt=""
            className="h-12 w-12 rounded-full border-2 border-white/20 object-cover"
          />
          <span className="max-w-[4.5rem] truncate text-[10px] text-muted">{member.name.split(' ')[0]}</span>
        </Link>
      ))}
    </div>
  )
}
