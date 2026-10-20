import { useRef } from 'react'
import { CalendarCheck, Check, ChevronRight, MapPin, Sprout, UserCheck } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { PageHeader } from '../components/PageHeader'
import { hasStartEvent, hasStartProfile } from '../lib/startQuest'

interface QuestStep {
  title: string
  description: string
  complete: boolean
  to: string
  action: string
  icon: typeof MapPin
}

export function TamagotchiPage() {
  const { city, currentUser, state } = useAppData()
  const completedBeforeVisit = useRef(Boolean(currentUser?.startCompleted))
  const hasProfile = hasStartProfile(currentUser)
  const hasFirstEvent = hasStartEvent(state, currentUser?.id)
  if (completedBeforeVisit.current) return <Navigate to="/sportik" replace />
  const steps: QuestStep[] = [
    {
      title: 'Выберите город',
      description: 'Покажем встречи рядом с вами.',
      complete: Boolean(city),
      to: '/',
      action: 'Выбрать город',
      icon: MapPin,
    },
    {
      title: 'Заполните профиль',
      description: 'Пара строк о вас помогут другим спортсменам познакомиться.',
      complete: hasProfile,
      to: '/profile',
      action: 'Заполнить профиль',
      icon: UserCheck,
    },
    {
      title: 'Запишитесь на событие',
      description: 'Выберите занятие по душе и получите первое место в своей команде.',
      complete: hasFirstEvent,
      to: '/events',
      action: 'Найти событие',
      icon: CalendarCheck,
    },
  ]
  const completeCount = steps.filter((step) => step.complete).length
  const isComplete = completeCount === steps.length
  const nextStep = steps.find((step) => !step.complete)

  return (
    <div className="page-frame pb-5">
      <PageHeader title="Старт" back />
      <section className="overflow-hidden rounded-[1.7rem] border border-accent/20 bg-card shadow-[0_16px_44px_rgba(10,64,96,0.1)]">
        <div className="relative overflow-hidden bg-accent px-5 py-6 text-white sm:px-7 sm:py-8">
          <div className="absolute -right-8 -top-12 h-44 w-44 rounded-full bg-white/15" aria-hidden />
          <div className="relative flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white/20 shadow-inner">
              <Sprout size={33} strokeWidth={2.1} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white/80">Ваш спортивный старт</p>
              <h1 className="mt-1 text-2xl font-bold tracking-[-0.035em] text-white">{isComplete ? 'Вы в игре!' : 'Выращиваем привычку'}</h1>
            </div>
          </div>
          <div className="relative mt-6">
            <div className="flex items-end justify-between text-sm"><span className="font-semibold text-white">{completeCount} из {steps.length} шагов</span><span className="text-white/80">{Math.round((completeCount / steps.length) * 100)}%</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white transition-[width]" style={{ width: `${(completeCount / steps.length) * 100}%` }} /></div>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <p className="mb-4 text-sm leading-6 text-muted">Несколько простых действий — и вы окажетесь на первой тренировке или игре.</p>
          <div className="space-y-3">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <article key={step.title} className={`flex gap-3 rounded-2xl border p-3.5 ${step.complete ? 'border-accent/20 bg-accent/5' : 'border-white/[0.1] bg-bg/45'}`}>
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${step.complete ? 'bg-accent text-white' : 'bg-card-elevated text-accent'}`}>
                    {step.complete ? <Check size={20} strokeWidth={2.8} /> : <Icon size={20} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white">{index + 1}. {step.title}</p>
                    <p className="mt-1 text-sm leading-5 text-muted">{step.description}</p>
                    {!step.complete && <Link to={step.to} className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-accent">{step.action} <ChevronRight size={16} /></Link>}
                    {step.complete && <p className="mt-1.5 text-sm font-semibold text-accent">Готово</p>}
                  </div>
                </article>
              )
            })}
          </div>
          {nextStep && <Link to={nextStep.to} className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-sm font-bold text-white transition-colors hover:bg-accent-hover">{nextStep.action} <ChevronRight size={17} /></Link>}
          {isComplete && <Link to="/sportik?shop=1" className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-sm font-bold text-white transition-colors hover:bg-accent-hover">Открыть магазин Спортика <ChevronRight size={17} /></Link>}
        </div>
      </section>
    </div>
  )
}
