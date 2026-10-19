import { ruWeekdayShort } from '../lib/format'

interface DateStripProps {
  days: Date[]
  selected: Date
  onSelect: (d: Date) => void
}

export function DateStrip({ days, selected, onSelect }: DateStripProps) {
  return (
    <div className="max-md:-mx-4 max-md:overflow-x-hidden md:mx-0">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-2 md:px-0">
      {days.map((d) => {
        const active =
          d.getDate() === selected.getDate() &&
          d.getMonth() === selected.getMonth() &&
          d.getFullYear() === selected.getFullYear()
        const wd = ruWeekdayShort[d.getDay()]
        return (
          <button
            key={d.toISOString()}
            type="button"
            onClick={() => onSelect(d)}
            className="relative flex min-w-[52px] shrink-0 flex-col items-center rounded-xl bg-white px-3 py-2 text-black"
          >
            <span className="text-xs text-muted">{wd}</span>
            <span className="text-lg font-semibold">{d.getDate()}</span>
            {active && (
              <span className="absolute bottom-1 left-2 right-2 h-0.5 rounded bg-emerald-500" />
            )}
          </button>
        )
      })}
      </div>
    </div>
  )
}
