import { Heart, UserPlus, X } from 'lucide-react'

export function SwipeControls({
  mode,
  disabled,
  onSkip,
  onPrimary,
}: {
  mode: 'users' | 'teams'
  disabled?: boolean
  onSkip: () => void
  onPrimary: () => void
}) {
  return (
    <div className="flex items-center justify-center gap-10 pt-2">
      <button
        type="button"
        disabled={disabled}
        onClick={onSkip}
        aria-label="Пропустить"
        className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-warning/60 bg-card text-warning shadow-lg transition-transform hover:scale-105 disabled:opacity-50"
      >
        <X size={26} />
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onPrimary}
        aria-label={mode === 'users' ? 'Лайк' : 'Вступить'}
        className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-accent bg-accent text-white shadow-[0_10px_28px_rgba(0,174,239,0.35)] transition-transform hover:scale-105 disabled:opacity-50"
      >
        {mode === 'users' ? <Heart size={28} /> : <UserPlus size={28} />}
      </button>
    </div>
  )
}
