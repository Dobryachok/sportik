import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline'
  fullWidth?: boolean
}

export function PrimaryButton({
  variant = 'primary',
  fullWidth,
  className = '',
  type = 'button',
  children,
  ...rest
}: Props) {
  const base =
    'min-h-12 rounded-2xl px-5 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50'
  const styles =
    variant === 'primary'
      ? 'bg-accent text-white shadow-[0_8px_20px_rgba(0,174,239,0.22)] hover:bg-accent-hover'
      : 'border border-accent/75 bg-transparent text-accent hover:bg-accent/10'

  return (
    <button
      type={type}
      className={`${base} ${styles} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
