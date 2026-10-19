import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { PageHeader } from '../components/PageHeader'
import { formatDateTime } from '../lib/format'

const authorColors = ['text-sky-400', 'text-orange-400', 'text-teal-400', 'text-violet-400']

export function DiscussionPage() {
  const { id } = useParams()
  const { state, currentUser, isAuthenticated, postComment } = useAppData()
  const [text, setText] = useState('')
  const event = state.events.find((e) => e.id === id)
  const comments = state.comments
    .filter((c) => c.eventId === id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  if (!event) return <p className="text-muted">Событие не найдено</p>

  const send = () => {
    postComment(event.id, text)
    setText('')
  }

  return (
    <div className="flex min-h-[calc(100dvh-var(--app-nav-height)-2rem)] min-w-0 max-w-full flex-col pb-chat-mobile md:min-h-[70vh]">
      <PageHeader title={event.title} back />
      <p className="mb-4 text-sm text-muted">{comments.length} сообщений</p>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {comments.map((c, idx) => {
          const author = state.users.find((u) => u.id === c.authorId)
          const color = authorColors[idx % authorColors.length]
          return (
            <div key={c.id} className="flex gap-2">
              <img
                src={author?.avatarUrl}
                alt=""
                className="h-9 w-9 shrink-0 rounded-full object-cover"
              />
              <div className="max-w-[85%] rounded-2xl bg-card px-3 py-2">
                <p className={`text-sm font-semibold ${color}`}>{author?.name}</p>
                <p className="text-sm leading-relaxed">{c.text}</p>
                <p className="mt-1 text-right text-[10px] text-muted">
                  {formatDateTime(c.createdAt).split(',')[1]?.trim()}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div
        className="fixed left-0 right-0 z-40 box-border w-full max-w-full border-t border-white/10 bg-bg/95 px-4 py-2 backdrop-blur fixed-above-nav md:static md:mt-4 md:border-0 md:bg-transparent md:px-0 md:py-0"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
      >
        {isAuthenticated && currentUser ? (
          <>
            <div className="flex gap-2 rounded-full bg-card p-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Написать"
                className="flex-1 bg-transparent px-3 text-base outline-none md:text-sm"
                onKeyDown={(e) => e.key === 'Enter' && send()}
              />
              <button
                type="button"
                onClick={send}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white"
                aria-label="Отправить"
              >
                ↑
              </button>
            </div>
            <p className="mt-1 text-xs text-muted md:mt-2">Вы: {currentUser.name}</p>
          </>
        ) : (
          <p className="py-2 text-center text-sm text-muted">
            <Link to="/login" state={{ from: `/events/${event.id}/discussion` }} className="text-accent">
              Войдите
            </Link>
            , чтобы написать в обсуждении
          </p>
        )}
      </div>
    </div>
  )
}
