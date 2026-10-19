import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface PageHeaderProps {
  title: string
  back?: boolean
  right?: React.ReactNode
}

export function PageHeader({ title, back, right }: PageHeaderProps) {
  const navigate = useNavigate()
  return (
    <header className="mb-5 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {back && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-card text-white transition-colors hover:bg-card-elevated"
            aria-label="Назад"
          >
            <ChevronLeft size={21} />
          </button>
        )}
        <h1 className="truncate text-[1.45rem] font-bold leading-none tracking-[-0.03em] text-white md:text-3xl">{title}</h1>
      </div>
      {right}
    </header>
  )
}
