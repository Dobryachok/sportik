import { Star } from 'lucide-react'

interface StarRatingProps {
  value: number
  max?: number
  size?: number
}

export function StarRating({ value, max = 5, size = 16 }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Рейтинг ${value}`}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i < Math.round(value)
        return (
          <Star
            key={i}
            size={size}
            className={filled ? 'fill-star text-star' : 'text-muted'}
            strokeWidth={1.5}
          />
        )
      })}
    </div>
  )
}
