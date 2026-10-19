interface Chip {
  id: string
  label: string
}

interface FilterChipsProps {
  items: Chip[]
  activeId?: string
  onChange?: (id: string) => void
  variant?: 'light' | 'dark'
}

export function FilterChips({
  items,
  activeId,
  onChange,
  variant = 'light',
}: FilterChipsProps) {
  return (
    <div className="max-md:-mx-4 max-md:overflow-x-hidden md:mx-0">
      <div className="flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-hide md:px-0">
        {items.map((item) => {
          const active = item.id === activeId
          const isLight = variant === 'light'
          const inactive = isLight
            ? 'bg-chip text-[#1a2025] hover:bg-white'
            : 'border border-white/15 bg-white/[0.025] text-white/75 hover:border-white/30 hover:bg-white/[0.06]'

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange?.(item.id)}
              aria-pressed={active}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                active ? 'bg-accent text-white shadow-[0_6px_18px_rgba(0,174,239,0.22)]' : inactive
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
