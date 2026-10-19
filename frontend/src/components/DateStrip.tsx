import { ruWeekdayShort } from '../lib/format'

interface DateStripProps {
  days: Date[]
  selected: Date
  onSelect: (d: Date) => void
}

export function DateStrip({ days, selected, onSelect }: DateStripProps) {
  return (
    <div className="max-md:-mx-4 max-md:overflow-x-hidden md:mx-0">
      <div className="flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-hide md:px-0">
        {days.map((d) => {
          const active =
            d.getDate() === selected.getDate() &&
            d.getMonth() === selected.getMonth() &&
            d.getFullYear() === selected.getFullYear()
          const weekday = ruWeekdayShort[d.getDay()]
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onSelect(d)}
              aria-pressed={active}
              className={`relative flex min-w-[56px] shrink-0 flex-col items-center rounded-2xl px-3 py-2.5 transition-colors ${
                active
                  ? 'bg-chip text-[#151b1f] shadow-[0_7px_18px_rgba(0,0,0,0.22)]'
                  : 'border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]'
              }`}
            >
              <span className={`text-[11px] font-semibold ${active ? 'text-muted' : 'text-muted'}`}>{weekday}</span>
              <span className="mt-0.5 text-lg font-bold leading-none">{d.getDate()}</span>
              {active && <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-accent" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
