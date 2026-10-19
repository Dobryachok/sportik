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
    <header className="mb-4 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        {back && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card"
            aria-label="Назад"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        <h1 className="truncate text-xl font-bold md:text-2xl">{title}</h1>
      </div>
      {right}
    </header>
  )
}
