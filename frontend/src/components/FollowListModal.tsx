import { X } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { FollowPreview } from '../data/discoveryTypes'

interface FollowListModalProps {
  title: string
  open: boolean
  items: FollowPreview[]
  loading: boolean
  onClose: () => void
}

export function FollowListModal({ title, open, items, loading, onClose }: FollowListModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[min(80dvh,520px)] w-full max-w-md flex-col rounded-2xl border border-white/10 bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-white/10 hover:text-white" aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {loading && <p className="py-8 text-center text-sm text-muted">Загрузка…</p>}
          {!loading && items.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">Пока пусто.</p>
          )}
          {!loading &&
            items.map((item) => (
              <Link
                key={item.id}
                to={`/users/${item.id}`}
                onClick={onClose}
                className="mb-2 flex items-center gap-3 rounded-xl border border-white/10 px-3 py-2.5 last:mb-0"
              >
                <img src={item.avatarUrl || '/images/hero.png'} alt="" className="h-11 w-11 rounded-full object-cover" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{item.name}</p>
                  <p className="truncate text-xs text-muted">{item.city || 'Город не указан'}</p>
                </div>
              </Link>
            ))}
        </div>
      </div>
    </div>
  )
}
