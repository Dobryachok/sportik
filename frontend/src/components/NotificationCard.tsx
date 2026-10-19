import { Link } from 'react-router-dom'
import type { Notification } from '../data/types'
import { formatNotificationDate } from '../lib/format'

export function NotificationCard({ item }: { item: Notification }) {
  return (
    <article className="rounded-2xl bg-card p-4">
      <time className="text-xs text-muted">{formatNotificationDate(item.createdAt)}</time>
      <h3 className="mt-1 text-base font-semibold">{item.title}</h3>
      <p className="mt-2 break-words text-sm leading-relaxed text-white/90">{item.body}</p>
      {item.linkUrl && item.linkText && (
        <Link to={item.linkUrl} className="mt-2 inline-block text-sm text-accent underline">
          {item.linkText}
        </Link>
      )}
      {(item.eventTag || item.eventDate) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
          {item.eventDate && <span className="text-sm text-accent">{item.eventDate}</span>}
          {item.eventTag && (
            <span className="rounded-full border border-accent px-3 py-1 text-xs text-accent">
              {item.eventTag}
            </span>
          )}
        </div>
      )}
    </article>
  )
}
