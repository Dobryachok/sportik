import { Link2, Plus, X } from 'lucide-react'
import type { SocialLink } from '../data/types'

interface SocialLinksFieldsProps {
  value: SocialLink[]
  onChange: (links: SocialLink[]) => void
  title?: string
  hint?: string
}

export function SocialLinksFields({
  value,
  onChange,
  title = 'Социальные сети организации',
  hint = 'До пяти ссылок — сайт, Telegram, VK и т.д.',
}: SocialLinksFieldsProps) {
  const add = () => {
    if (value.length >= 5) return
    onChange([...value, { platform: '', label: '', url: '' }])
  }

  const update = (index: number, field: keyof SocialLink, next: string) => {
    onChange(value.map((item, i) => (i === index ? { ...item, [field]: next } : item)))
  }

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <section className="rounded-xl border border-white/10 bg-bg/50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="mt-0.5 text-xs text-muted">{hint}</p>
        </div>
        <button
          type="button"
          onClick={add}
          disabled={value.length >= 5}
          className="inline-flex items-center gap-1 text-sm font-semibold text-accent disabled:text-muted"
        >
          <Plus size={16} /> Добавить
        </button>
      </div>
      <div className="mt-3 space-y-3">
        {value.map((item, index) => (
          <div key={index} className="relative grid gap-2 rounded-lg border border-white/[0.08] p-2.5 sm:grid-cols-2">
            <label className="text-xs text-muted">
              Сеть
              <input
                required
                value={item.platform}
                onChange={(event) => update(index, 'platform', event.target.value)}
                placeholder="Telegram"
                className="mt-1 w-full rounded-lg border border-white/10 bg-card px-2.5 py-2 text-sm text-white outline-none focus:border-accent"
              />
            </label>
            <label className="pr-8 text-xs text-muted">
              Подпись (необязательно)
              <input
                value={item.label ?? ''}
                onChange={(event) => update(index, 'label', event.target.value)}
                placeholder="@channel"
                className="mt-1 w-full rounded-lg border border-white/10 bg-card px-2.5 py-2 text-sm text-white outline-none focus:border-accent"
              />
            </label>
            <label className="sm:col-span-2 text-xs text-muted">
              Ссылка
              <input
                required
                type="url"
                value={item.url}
                onChange={(event) => update(index, 'url', event.target.value)}
                placeholder="https://…"
                className="mt-1 w-full rounded-lg border border-white/10 bg-card px-2.5 py-2 text-sm text-white outline-none focus:border-accent"
              />
            </label>
            <button
              type="button"
              onClick={() => remove(index)}
              aria-label="Удалить ссылку"
              className="absolute right-2 top-2 rounded-md p-1.5 text-muted hover:bg-white/10 hover:text-white"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
      {value.length === 0 && (
        <button type="button" onClick={add} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-accent">
          <Link2 size={16} /> Добавить соцсеть
        </button>
      )}
    </section>
  )
}
