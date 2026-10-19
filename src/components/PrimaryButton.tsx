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
    'rounded-2xl px-5 py-3.5 text-sm font-semibold transition disabled:opacity-50'
  const styles =
    variant === 'primary'
      ? 'bg-accent text-white hover:bg-accent-hover'
      : 'border border-accent text-accent bg-transparent hover:bg-accent/10'

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
