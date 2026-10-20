import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bounds, Center, OrbitControls, useGLTF } from '@react-three/drei'
import { TOUCH } from 'three'
import { SportikModel } from './sportik/SportikModel'
import { ChevronDown, ChevronLeft, ChevronUp, Palette, ShoppingBag, Trophy } from 'lucide-react'
import { useAppData } from '../app/AppDataContext'
import {
  readClosedChallenges,
  sportikChallenges,
  writeClosedChallenges,
  type SportikChallenge,
} from './sportik/challenges'
import {
  countVisits,
  nextProgress,
  progressPoints,
  resolveStage,
  STAGE_LABELS,
  STAGE_MODELS,
  type SportikStage,
} from './sportik/progress'

const hintsStorageKey = (userId: string) => `sportik-hints-seen:${userId}`

const hints = [
  {
    title: 'Это Спортик',
    body: 'Виртуальный персонаж, которого ты развиваешь, ходя на события. Чем чаще участвуешь в евентах, тем сильнее растёт Спортик.',
  },
  {
    title: 'Покрути персонажа',
    body: 'Перетащи пальцем или мышью, чтобы рассмотреть Спортика со всех сторон.',
  },
  {
    title: 'Меню внизу',
    body: 'Челенжи, магазин и кастомизация — задания, вещи и внешний вид. Панель можно скрыть, чтобы сцена заняла весь экран.',
  },
] as const

const menuCards = [
  {
    id: 'challenges',
    title: 'Челенжи',
    subtitle: 'Задания и награды',
    icon: Trophy,
  },
  {
    id: 'shop',
    title: 'Магазин',
    subtitle: 'Скины и вещи',
    icon: ShoppingBag,
  },
  {
    id: 'customize',
    title: 'Кастомизация',
    subtitle: 'Внешний вид',
    icon: Palette,
  },
] as const

type PanelView = 'home' | 'challenges' | 'challenge-detail'

export function SportikPage() {
  const { currentUser, state } = useAppData()
  const [menuOpen, setMenuOpen] = useState(true)
  const [hintStep, setHintStep] = useState<number | null>(null)
  const [panel, setPanel] = useState<PanelView>('home')
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null)
  const [closedIds, setClosedIds] = useState<string[]>([])

  const hintsOpen = hintStep !== null
  const currentHint = hintsOpen ? hints[hintStep] : null
  const isLastHint = hintStep === hints.length - 1

  useEffect(() => {
    if (!currentUser) return
    setClosedIds(readClosedChallenges(currentUser.id))
    try {
      const seen = localStorage.getItem(hintsStorageKey(currentUser.id))
      if (!seen) setHintStep(0)
    } catch {
      setHintStep(0)
    }
  }, [currentUser])

  const visits = currentUser ? countVisits(state, currentUser.id) : 0
  const closedCount = closedIds.length
  const points = progressPoints(visits, closedCount)
  const stage = resolveStage(visits, closedCount)
  const goal = nextProgress(closedCount, stage)
  const visitRatio = Math.min(1, visits / goal.visitTarget)
  const modelUrl = STAGE_MODELS[stage]
  const selectedChallenge = sportikChallenges.find((item) => item.id === selectedChallengeId) ?? null

  const markHintsSeen = () => {
    if (!currentUser) return
    try {
      localStorage.setItem(hintsStorageKey(currentUser.id), '1')
    } catch {
      /* storage is optional */
    }
  }

  const closeHints = () => {
    markHintsSeen()
    setHintStep(null)
  }

  const nextHint = () => {
    if (isLastHint) {
      closeHints()
      return
    }
    setHintStep((step) => (step === null ? null : step + 1))
  }

  const closeChallenge = (id: string) => {
    if (!currentUser || closedIds.includes(id)) return
    const next = [...closedIds, id]
    setClosedIds(next)
    writeClosedChallenges(currentUser.id, next)
  }

  const showMenu = menuOpen || hintsOpen
  const challengeHint =
    goal.challengesNeeded > 0
      ? `закрой ещё ${goal.challengesNeeded} ${goal.challengesNeeded === 1 ? 'челленж' : 'челленжа'}`
      : null

  return (
    <div className="relative h-full min-h-[100dvh] w-full">
      <Canvas
        className="absolute inset-0"
        camera={{ position: [0, 1.15, 3.1], fov: 40 }}
        gl={{ antialias: true }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#0d0f11']} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 6, 4]} intensity={1.3} />
        <directionalLight position={[-3, 2, -2]} intensity={0.35} />
        <Suspense fallback={null}>
          <Bounds key={modelUrl} fit margin={1.15}>
            <Center>
              <SportikModel url={modelUrl} />
            </Center>
          </Bounds>
        </Suspense>
        <OrbitControls
          enabled={!hintsOpen}
          enablePan={false}
          enableZoom={false}
          enableDamping
          dampingFactor={0.08}
          minPolarAngle={0.35}
          maxPolarAngle={Math.PI / 1.7}
          touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.ROTATE }}
        />
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-3 md:top-5">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-card/90 px-4 py-3 shadow-[0_10px_24px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 text-sm">
            <p className="font-semibold text-white">{STAGE_LABELS[stage]}</p>
            <p className="text-muted">
              {points} {points % 10 === 1 && points % 100 !== 11 ? 'очко' : points % 10 >= 2 && points % 10 <= 4 && (points % 100 < 10 || points % 100 >= 20) ? 'очка' : 'очков'}
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${visitRatio * 100}%` }} />
          </div>
          <p className="mt-2 text-xs leading-4 text-muted">
            Посещения {visits} / {goal.visitTarget}
            {goal.nextLabel ? ` до формы «${goal.nextLabel}»` : ' — максимальная форма'}
            {challengeHint ? ` · ${challengeHint}` : ''}
          </p>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-[calc(var(--app-nav-height)+env(safe-area-inset-bottom,0px))] z-10 flex justify-center px-3 py-3 md:bottom-0">
        {showMenu ? (
          <div className="pointer-events-auto w-full max-w-lg rounded-[1.35rem] border border-white/10 bg-card/95 p-3 shadow-[0_-12px_28px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="relative mb-3 flex min-h-9 items-center justify-center">
              {panel !== 'home' && !hintsOpen ? (
                <button
                  type="button"
                  onClick={() => {
                    if (panel === 'challenge-detail') {
                      setPanel('challenges')
                      return
                    }
                    setPanel('home')
                    setSelectedChallengeId(null)
                  }}
                  className="absolute left-0 top-1/2 flex h-9 items-center gap-1 -translate-y-1/2 rounded-full px-2 text-sm font-medium text-muted transition-colors hover:bg-white/5 hover:text-white"
                >
                  <ChevronLeft size={18} />
                  Назад
                </button>
              ) : (
                <span className="h-1 w-10 rounded-full bg-white/20" aria-hidden />
              )}
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                disabled={hintsOpen}
                className="absolute right-0 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40"
                aria-label="Скрыть меню"
              >
                <ChevronDown size={20} />
              </button>
            </div>
            {panel === 'home' && (
              <div className="grid grid-cols-3 gap-2">
                {menuCards.map((card) => {
                  const Icon = card.icon
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => {
                        if (card.id === 'challenges') setPanel('challenges')
                      }}
                      className="flex min-h-[6.5rem] flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-card-elevated px-2 py-3 text-center transition-colors hover:border-accent/40 hover:bg-white/5"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                        <Icon size={20} />
                      </span>
                      <span className="text-sm font-semibold text-white">{card.title}</span>
                      <span className="text-[11px] leading-tight text-muted">{card.subtitle}</span>
                    </button>
                  )
                })}
              </div>
            )}
            {panel === 'challenges' && (
              <ChallengeList
                closedIds={closedIds}
                onOpen={(challenge) => {
                  setSelectedChallengeId(challenge.id)
                  setPanel('challenge-detail')
                }}
              />
            )}
            {panel === 'challenge-detail' && selectedChallenge && (
              <ChallengeDetail
                challenge={selectedChallenge}
                closed={closedIds.includes(selectedChallenge.id)}
                onClose={() => closeChallenge(selectedChallenge.id)}
              />
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-card/95 px-4 py-2 text-sm font-medium text-white shadow-[0_-8px_20px_rgba(0,0,0,0.24)] backdrop-blur-xl"
            aria-label="Открыть меню"
          >
            Меню
            <ChevronUp size={16} />
          </button>
        )}
      </div>

      {currentHint && (
        <div className="absolute inset-0 z-40 flex items-end justify-center px-4 pb-[calc(var(--app-nav-height)+env(safe-area-inset-bottom,0px)+11rem)] md:items-center md:pb-0">
          <div className="absolute inset-0 bg-black/55" aria-hidden />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sportik-hint-title"
            className="relative w-full max-w-md rounded-[1.35rem] border border-white/10 bg-card p-5 shadow-[0_16px_40px_rgba(0,0,0,0.4)]"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              {(hintStep ?? 0) + 1} из {hints.length}
            </p>
            <h2 id="sportik-hint-title" className="mt-2 text-xl font-bold text-white">
              {currentHint.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">{currentHint.body}</p>
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={closeHints}
                className="min-h-11 flex-1 rounded-xl border border-white/10 px-4 text-sm font-semibold text-muted transition-colors hover:bg-white/5 hover:text-white"
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={nextHint}
                className="min-h-11 flex-1 rounded-xl bg-accent px-4 text-sm font-bold text-white transition-colors hover:bg-accent-hover"
              >
                {isLastHint ? 'Понятно' : 'Далее'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ChallengeList({
  closedIds,
  onOpen,
}: {
  closedIds: string[]
  onOpen: (challenge: SportikChallenge) => void
}) {
  return (
    <div className="max-h-64 space-y-2 overflow-y-auto">
      {sportikChallenges.map((challenge) => {
        const closed = closedIds.includes(challenge.id)
        return (
          <button
            key={challenge.id}
            type="button"
            onClick={() => onOpen(challenge)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-card-elevated px-3 py-3 text-left transition-colors hover:border-accent/40"
          >
            <span>
              <span className="block text-sm font-semibold text-white">{challenge.title}</span>
              <span className="mt-0.5 block text-[11px] text-muted">{challenge.reward}</span>
            </span>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${closed ? 'bg-accent/15 text-accent' : 'bg-white/8 text-muted'}`}>
              {closed ? 'Закрыт' : `+${challenge.points}`}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function ChallengeDetail({
  challenge,
  closed,
  onClose,
}: {
  challenge: SportikChallenge
  closed: boolean
  onClose: () => void
}) {
  return (
    <div className="px-1 pb-1">
      <h3 className="text-base font-bold text-white">{challenge.title}</h3>
      <p className="mt-2 text-sm leading-5 text-muted">{challenge.description}</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-card-elevated px-3 py-2">
          <dt className="text-[11px] text-muted">Баллы</dt>
          <dd className="font-semibold text-accent">+{challenge.points} к прогрессии</dd>
        </div>
        <div className="rounded-xl bg-card-elevated px-3 py-2">
          <dt className="text-[11px] text-muted">Награда</dt>
          <dd className="font-semibold text-white">{challenge.reward}</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={onClose}
        disabled={closed}
        className="mt-3 flex min-h-11 w-full items-center justify-center rounded-xl bg-accent px-4 text-sm font-bold text-white transition-colors hover:bg-accent-hover disabled:bg-white/10 disabled:text-muted"
      >
        {closed ? 'Челленж уже закрыт' : 'Закрыть челленж'}
      </button>
    </div>
  )
}

;(Object.keys(STAGE_MODELS) as SportikStage[]).forEach((stage) => {
  useGLTF.preload(STAGE_MODELS[stage])
})
