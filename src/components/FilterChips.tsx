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
      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-1 md:px-0">
        {items.map((item) => {
          const active = item.id === activeId
          const light = variant === 'light'
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange?.(item.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                active
                  ? light
                    ? 'bg-accent text-white'
                    : 'bg-accent text-white'
                  : light
                    ? 'bg-white text-black'
                    : 'border border-accent/60 text-accent'
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
