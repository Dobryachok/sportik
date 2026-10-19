import { Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { PageHeader } from '../components/PageHeader'
import { formatDateTime } from '../lib/format'

const authorColors = ['text-sky-400', 'text-orange-400', 'text-teal-400', 'text-violet-400', 'text-amber-300', 'text-pink-400']

function authorColor(authorId: string) {
  let hash = 0
  for (let index = 0; index < authorId.length; index += 1) hash = (hash * 31 + authorId.charCodeAt(index)) | 0
  return authorColors[Math.abs(hash) % authorColors.length]
}

export function DiscussionPage() {
  const { id } = useParams()
  const { state, currentUser, postComment, refreshComments } = useAppData()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const messageListRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const event = state.events.find((item) => item.id === id)
  const comments = state.comments.filter((comment) => comment.eventId === id).sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
  const myParticipation = currentUser ? state.participations.find((item) => item.eventId === id && item.userId === currentUser.id) : undefined
  const canWrite = Boolean(currentUser && event && (event.organizerUserId === currentUser.id || myParticipation?.status === 'confirmed'))

  useEffect(() => {
    if (!id) return
    let disposed = false
    let running = false
    const reload = async () => {
      if (disposed || running || document.visibilityState === 'hidden') return
      running = true
      const list = messageListRef.current
      stickToBottomRef.current = !list || list.scrollHeight - list.scrollTop - list.clientHeight < 96
      try {
        await refreshComments(id)
      } finally {
        running = false
      }
    }
    const onVisibility = () => { if (document.visibilityState === 'visible') void reload() }
    void reload()
    const timer = window.setInterval(() => void reload(), 5000)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      disposed = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [id, refreshComments])

  useEffect(() => {
    if (!stickToBottomRef.current) return
    const list = messageListRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [comments.length])

  if (!event) return <p className="text-muted">Событие не найдено</p>

  const send = async () => {
    if (!text.trim() || !canWrite) return
    setSending(true)
    if (await postComment(event.id, text)) setText('')
    setSending(false)
  }

  const composer = currentUser ? (
    canWrite ? <>
      <div className="flex gap-2 rounded-full bg-card-elevated p-2 md:bg-bg">
        <input value={text} onChange={(item) => setText(item.target.value)} placeholder="Написать сообщение" className="flex-1 bg-transparent px-3 text-base outline-none md:text-sm" onKeyDown={(item) => { if (item.key === 'Enter' && !item.shiftKey) { item.preventDefault(); void send() } }} />
        <button type="button" disabled={sending || !text.trim()} onClick={() => void send()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white disabled:opacity-50" aria-label="Отправить"><Send size={18} /></button>
      </div>
      <p className="mt-1 text-xs text-muted md:mt-2">Сообщение будет опубликовано в чате этого события.</p>
    </> : <p className="rounded-xl bg-card-elevated px-4 py-3 text-center text-sm text-muted">Писать в чат могут организатор и подтверждённые участники события.</p>
  ) : <p className="rounded-xl bg-card-elevated px-4 py-3 text-center text-sm text-muted"><Link to="/login" state={{ from: `/events/${event.id}/discussion` }} className="text-accent">Войдите</Link>, чтобы участвовать в обсуждении.</p>

  return (
    <div className="mx-auto flex h-[calc(100dvh-var(--app-nav-height)-4rem)] min-w-0 max-w-full flex-col md:h-[calc(100dvh-7rem)] md:max-w-5xl">
      <PageHeader title="Чат события" back />
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-card">
        <header className="shrink-0 border-b border-white/[0.08] px-4 py-3.5 md:px-5 md:py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate font-bold text-white">{event.title}</h1>
              <p className="mt-1 text-xs text-muted">{comments.length} сообщений · {event.confirmedCount ?? 0} из {event.capacity} участников</p>
            </div>
            <Link to={`/events/${event.id}`} className="shrink-0 text-sm font-semibold text-accent">К событию</Link>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted">{event.description || 'Обсудите детали встречи с организатором и участниками.'}</p>
          <p className="mt-1 truncate text-xs text-white/75">{event.address}</p>
        </header>
        <div ref={messageListRef} onScroll={() => { const list = messageListRef.current; if (list) stickToBottomRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < 96 }} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 md:px-5 md:py-5">
          {comments.length === 0 && <p className="py-10 text-center text-sm text-muted">Начните обсуждение события.</p>}
          {comments.map((comment) => {
            const author = state.users.find((item) => item.id === comment.authorId)
            const mine = comment.authorId === currentUser?.id
            const profileLink = `/users/${comment.authorId}`
            return (
              <div key={comment.id} className={`flex gap-2 ${mine ? 'justify-end' : ''}`}>
                {!mine && <Link to={profileLink} className="h-9 w-9 shrink-0"><img src={author?.avatarUrl || '/images/hero.png'} alt="" className="h-9 w-9 rounded-full object-cover" /></Link>}
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${mine ? 'bg-accent/20' : 'bg-card-elevated md:bg-bg'}`}>
                  <Link to={profileLink} className={`text-sm font-semibold ${authorColor(comment.authorId)}`}>{mine ? 'Вы' : author?.name || 'Участник'}</Link>
                  <p className="text-sm leading-relaxed text-white">{comment.text}</p>
                  <p className="mt-1 text-right text-[10px] text-muted">{formatDateTime(comment.createdAt).split(',')[1]?.trim()}</p>
                </div>
                {mine && <Link to={profileLink} className="h-9 w-9 shrink-0"><img src={author?.avatarUrl || currentUser?.avatarUrl || '/images/hero.png'} alt="" className="h-9 w-9 rounded-full object-cover" /></Link>}
              </div>
            )
          })}
        </div>
        <div className="shrink-0 border-t border-white/[0.08] bg-card px-4 py-3 md:px-5 md:py-4" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}>
          {composer}
        </div>
      </section>
    </div>
  )
}
