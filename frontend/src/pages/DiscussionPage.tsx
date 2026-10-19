import { Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { PageHeader } from '../components/PageHeader'
import { formatDateTime } from '../lib/format'

const authorColors = ['text-sky-400', 'text-orange-400', 'text-teal-400', 'text-violet-400']

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
      await refreshComments(id)
      running = false
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
      <div className="flex gap-2 rounded-full bg-card p-2">
        <input value={text} onChange={(item) => setText(item.target.value)} placeholder="Написать сообщение" className="flex-1 bg-transparent px-3 text-base outline-none md:text-sm" onKeyDown={(item) => { if (item.key === 'Enter' && !item.shiftKey) { item.preventDefault(); void send() } }} />
        <button type="button" disabled={sending || !text.trim()} onClick={() => void send()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white disabled:opacity-50" aria-label="Отправить"><Send size={18} /></button>
      </div>
      <p className="mt-1 text-xs text-muted md:mt-2">Сообщение будет опубликовано в чате этого события.</p>
    </> : <p className="rounded-xl bg-card px-4 py-3 text-center text-sm text-muted">Писать в чат могут организатор и подтверждённые участники события.</p>
  ) : <p className="rounded-xl bg-card px-4 py-3 text-center text-sm text-muted"><Link to="/login" state={{ from: `/events/${event.id}/discussion` }} className="text-accent">Войдите</Link>, чтобы участвовать в обсуждении.</p>

  return (
    <div className="mx-auto min-h-[calc(100dvh-var(--app-nav-height)-2rem)] min-w-0 max-w-full pb-chat-mobile md:min-h-[72vh] md:max-w-6xl">
      <PageHeader title="Чат события" back />
      <div className="md:grid md:grid-cols-[minmax(0,1fr)_18rem] md:overflow-hidden md:rounded-[1.5rem] md:border md:border-white/[0.08] md:bg-card">
        <section className="flex min-h-[calc(100dvh-var(--app-nav-height)-8rem)] flex-col md:min-h-[70vh] md:border-r md:border-white/[0.08]">
          <div className="mb-4 flex items-start justify-between gap-4 md:mb-0 md:border-b md:border-white/[0.08] md:px-5 md:py-4"><div><h1 className="font-bold text-white">{event.title}</h1><p className="mt-1 text-sm text-muted">{comments.length} сообщений</p></div><Link to={`/events/${event.id}`} className="text-sm font-semibold text-accent">К событию</Link></div>
          <div ref={messageListRef} onScroll={() => { const list = messageListRef.current; if (list) stickToBottomRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < 96 }} className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-4 md:px-5 md:py-5">
            {comments.length === 0 && <p className="py-10 text-center text-sm text-muted">Начните обсуждение события.</p>}
            {comments.map((comment, index) => {
              const author = state.users.find((item) => item.id === comment.authorId)
              return <div key={comment.id} className="flex gap-2"><Link to={`/users/${comment.authorId}`} className="h-9 w-9 shrink-0"><img src={author?.avatarUrl || '/images/hero.png'} alt="" className="h-9 w-9 rounded-full object-cover" /></Link><div className="max-w-[85%] rounded-2xl bg-card-elevated px-3 py-2 md:bg-bg"><Link to={`/users/${comment.authorId}`} className={`text-sm font-semibold ${authorColors[index % authorColors.length]}`}>{author?.name || 'Участник'}</Link><p className="text-sm leading-relaxed text-white">{comment.text}</p><p className="mt-1 text-right text-[10px] text-muted">{formatDateTime(comment.createdAt).split(',')[1]?.trim()}</p></div></div>
            })}
          </div>
          <div className="fixed left-0 right-0 z-40 box-border w-full max-w-full border-t border-white/10 bg-bg/95 px-4 py-2 backdrop-blur fixed-above-nav md:static md:border-t md:border-white/[0.08] md:bg-card md:px-5 md:py-4" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}>{composer}</div>
        </section>
        <aside className="hidden p-5 md:block"><p className="text-xs font-semibold text-muted">ЧАТ СОБЫТИЯ</p><h2 className="mt-2 text-xl font-bold leading-tight text-white">{event.title}</h2><p className="mt-3 text-sm leading-6 text-muted">{event.description || 'Обсудите детали встречи с организатором и участниками.'}</p><dl className="mt-6 space-y-4 border-t border-white/[0.08] pt-5 text-sm"><div><dt className="text-muted">Адрес</dt><dd className="mt-1 font-medium text-white">{event.address}</dd></div><div><dt className="text-muted">Участники</dt><dd className="mt-1 font-medium text-white">{event.confirmedCount ?? 0} из {event.capacity}</dd></div></dl></aside>
      </div>
    </div>
  )
}
