import { Star } from 'lucide-react'

interface StarRatingProps {
  value: number
  max?: number
  size?: number
}

interface StarPickerProps extends StarRatingProps {
  onChange: (value: number) => void
  disabled?: boolean
}

function StarGlyph({ fill, size }: { fill: number; size: number }) {
  const percent = Math.max(0, Math.min(1, fill)) * 100
  return (
    <span className="relative block" style={{ width: size, height: size }} aria-hidden>
      <Star size={size} className="absolute inset-0 text-muted" strokeWidth={1.5} />
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${percent}%` }}>
        <Star size={size} className="fill-star text-star" strokeWidth={1.5} />
      </span>
    </span>
  )
}

export function StarRating({ value, max = 5, size = 16 }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Уровень ${value} из ${max} звёзд`}>
      {Array.from({ length: max }, (_, index) => (
        <StarGlyph key={index} fill={value - index} size={size} />
      ))}
    </div>
  )
}

/** A five-star control where each half-star is an explicit selectable target. */
export function StarPicker({ value, max = 5, size = 30, onChange, disabled = false }: StarPickerProps) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Уровень события">
      {Array.from({ length: max }, (_, index) => {
        const half = index + 0.5
        const full = index + 1
        return (
          <span key={index} className="relative block" style={{ width: size, height: size }}>
            <StarGlyph fill={value - index} size={size} />
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(half)}
              className="absolute inset-y-0 left-0 w-1/2 rounded-l-sm outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed"
              aria-label={`${half} ${half === 1 ? 'звезда' : half < 5 ? 'звезды' : 'звёзд'}`}
              aria-pressed={value === half}
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(full)}
              className="absolute inset-y-0 right-0 w-1/2 rounded-r-sm outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed"
              aria-label={`${full} ${full === 1 ? 'звезда' : full < 5 ? 'звезды' : 'звёзд'}`}
              aria-pressed={value === full}
            />
          </span>
        )
      })}
      <span className="ml-2 text-sm font-semibold text-white">{value.toFixed(1)}</span>
    </div>
  )
}
