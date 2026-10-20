import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../app/ThemeContext'

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'
  const label = dark ? 'Включить светлую тему' : 'Включить тёмную тему'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-card text-muted transition-colors hover:border-accent hover:text-accent ${compact ? 'h-10 w-10' : 'min-h-11 px-3 text-sm font-semibold'}`}
    >
      {dark ? <Sun size={compact ? 18 : 17} /> : <Moon size={compact ? 18 : 17} />}
      {!compact && <span>{dark ? 'Светлая тема' : 'Тёмная тема'}</span>}
    </button>
  )
}
