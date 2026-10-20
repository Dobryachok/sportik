import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bounds, Center, OrbitControls, useGLTF } from '@react-three/drei'
import { TOUCH } from 'three'
import { SportikModel } from './sportik/SportikModel'
import { ChevronDown, ChevronLeft, ChevronUp, Lock, Palette, ShoppingBag, Trophy } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppData } from '../app/AppDataContext'
import { useTheme } from '../app/ThemeContext'
import {
  LOOT_CASES,
  SHOP_TABS,
  WAREHOUSE_SHOP,
  findOwnedItem,
  rollCaseLoot,
  type ShopCategory,
} from './sportik/catalog'
import {
  readClosedChallenges,
  sportikChallenges,
  type SportikChallenge,
} from './sportik/challenges'
import { allBodyAndWarehouseUrls, buildUnlockedKeySet, resolveDisplayModelUrl } from './sportik/displayModel'
import {
  availableBalance,
  readEquip,
  readOwnedIds,
  readSpentPoints,
  writeEquip,
  writeOwnedIds,
  writeSpentPoints,
  type StoredEquip,
} from './sportik/loadout'
import {
  profileBodyGender,
  stageVariantIndex,
  unlockedSportRows,
  type SportBodyKey,
  type SportBodyRow,
} from './sportik/sportBodies'
import {
  countVisits,
  nextProgress,
  progressPoints,
  resolveStage,
  STAGE_LABELS,
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

type PanelView = 'home' | 'challenges' | 'challenge-detail' | 'shop' | 'customize'

export function SportikPage() {
  const { currentUser, state } = useAppData()
  const { theme } = useTheme()
  const sceneBackground = theme === 'dark' ? '#0d0f11' : '#ffffff'
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [menuOpen, setMenuOpen] = useState(true)
  const [hintStep, setHintStep] = useState<number | null>(null)
  const [panel, setPanel] = useState<PanelView>('home')
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null)
  const [closedIds, setClosedIds] = useState<string[]>([])
  const [ownedIds, setOwnedIds] = useState<string[]>([])
  const [equip, setEquip] = useState<StoredEquip>({ sportKey: null, variantIndex: null, warehouseId: null })
  const [shopTab, setShopTab] = useState<ShopCategory | 'case'>('outfit')
  const [shopMessage, setShopMessage] = useState('')
  const shopUnlocked = Boolean(currentUser?.startCompleted)
  const wasShopUnlocked = useRef(shopUnlocked)

  const hintsOpen = hintStep !== null
  const currentHint = hintsOpen ? hints[hintStep] : null
  const isLastHint = hintStep === hints.length - 1

  useEffect(() => {
    if (!currentUser) return
    setClosedIds(readClosedChallenges(currentUser.id))
    setOwnedIds(readOwnedIds(currentUser.id))
    setEquip(readEquip(currentUser.id))
    try {
      const seen = localStorage.getItem(hintsStorageKey(currentUser.id))
      if (!seen && searchParams.get('shop') !== '1') setHintStep(0)
    } catch {
      setHintStep(0)
    }
  }, [currentUser, searchParams])

  useEffect(() => {
    const openFromQuery = searchParams.get('shop') === '1'
    const justUnlocked = shopUnlocked && !wasShopUnlocked.current
    if (shopUnlocked && (openFromQuery || justUnlocked)) {
      setMenuOpen(true)
      setPanel('shop')
    }
    wasShopUnlocked.current = shopUnlocked
  }, [searchParams, shopUnlocked])

  const visits = currentUser ? countVisits(state, currentUser.id) : 0
  const closedCount = closedIds.length
  const points = progressPoints(visits, closedCount)
  const stage = resolveStage(visits, closedCount)
  const goal = nextProgress(closedCount, stage)
  const visitRatio = Math.min(1, visits / goal.visitTarget)
  const unlockedKeys = currentUser ? buildUnlockedKeySet(state, currentUser.id) : new Set<SportBodyKey>()
  const unlockedRows = currentUser ? unlockedSportRows(state, currentUser.id) : []
  const modelUrl = resolveDisplayModelUrl(stage, currentUser, equip, unlockedKeys)
  const balance = currentUser ? availableBalance(points, currentUser.id) : 0
  const bodyGender = profileBodyGender(currentUser)

  const persistOwned = (ids: string[]) => {
    if (!currentUser) return
    writeOwnedIds(currentUser.id, ids)
    setOwnedIds(ids)
  }

  const spendPoints = (amount: number) => {
    if (!currentUser) return false
    if (amount <= 0) return true
    const nextSpent = readSpentPoints(currentUser.id) + amount
    if (points < nextSpent) return false
    writeSpentPoints(currentUser.id, nextSpent)
    return true
  }

  const persistEquip = (next: StoredEquip) => {
    if (!currentUser) return
    writeEquip(currentUser.id, next)
    setEquip(next)
  }

  const purchaseItem = (itemId: string) => {
    if (!currentUser) return
    const item = WAREHOUSE_SHOP.find((entry) => entry.id === itemId)
    if (!item) return
    if (ownedIds.includes(item.id)) {
      setShopMessage('Предмет уже на складе.')
      return
    }
    if (item.price > 0 && !spendPoints(item.price)) {
      setShopMessage('Не хватает очков активности.')
      return
    }
    persistOwned([...ownedIds, item.id])
    setShopMessage(`«${item.title}» добавлен на склад.`)
  }

  const openCase = (caseId: string) => {
    if (!currentUser) return
    const crate = LOOT_CASES.find((entry) => entry.id === caseId)
    if (!crate) return
    if (!spendPoints(crate.price)) {
      setShopMessage('Не хватает очков для кейса.')
      return
    }
    const loot = rollCaseLoot(crate)
    const nextOwned = ownedIds.includes(loot.id) ? ownedIds : [...ownedIds, loot.id]
    persistOwned(nextOwned)
    setShopMessage(`Выпало: «${loot.title}» (${loot.rarity}).`)
  }

  const equipWarehouse = (itemId: string | null) => {
    persistEquip({ sportKey: null, variantIndex: null, warehouseId: itemId })
    setShopMessage(itemId ? 'Предмет со склада надет.' : 'Склад снят.')
  }

  const equipBaseBody = () => {
    persistEquip({ sportKey: null, variantIndex: null, warehouseId: null })
  }

  const equipSportBody = (sportKey: SportBodyKey, variantIndex: number) => {
    const row = unlockedRows.find((entry) => entry.key === sportKey)
    if (!row) return
    const canPick = stage === 'hight'
    const allowed = canPick ? variantIndex : stageVariantIndex(stage, row.gender)
    if (!canPick && variantIndex !== allowed) return
    persistEquip({ sportKey, variantIndex: canPick ? variantIndex : null, warehouseId: null })
  }
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

  const showMenu = menuOpen || hintsOpen
  const challengeHint =
    goal.challengesNeeded > 0
      ? `закрой ещё ${goal.challengesNeeded} ${goal.challengesNeeded === 1 ? 'челленж' : 'челленжа'}`
      : null

  return (
    <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-[1.35rem]">
      <Canvas
        className="absolute inset-0"
        camera={{ position: [0, 1.15, 3.1], fov: 40 }}
        gl={{ antialias: true }}
        dpr={[1, 2]}
      >
        <color attach="background" args={[sceneBackground]} />
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

      <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-3">
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

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-3 py-3">
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
                  const shopLocked = card.id === 'shop' && !shopUnlocked
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => {
                        if (card.id === 'challenges') setPanel('challenges')
                        if (card.id === 'shop') {
                          if (shopLocked) {
                            navigate('/tamagotchi')
                            return
                          }
                          setShopMessage('')
                          setPanel('shop')
                        }
                        if (card.id === 'customize') {
                          if (shopLocked) {
                            navigate('/tamagotchi')
                            return
                          }
                          setShopMessage('')
                          setPanel('customize')
                        }
                      }}
                      className={`flex min-h-[6.5rem] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-center transition-colors ${
                        shopLocked
                          ? 'border-white/10 bg-card-elevated/70 opacity-70'
                          : 'border-white/10 bg-card-elevated hover:border-accent/40 hover:bg-white/5'
                      }`}
                    >
                      <span className="sportik-menu-tile-icon relative flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                        <Icon size={20} />
                        {shopLocked && (
                          <Lock size={12} className="absolute -right-1 -top-1 rounded-full bg-card text-white" />
                        )}
                      </span>
                      <span className="text-sm font-semibold text-white">{card.title}</span>
                      <span className="text-[11px] leading-tight text-muted">
                        {shopLocked ? 'Пройдите Старт' : card.subtitle}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
            {panel === 'shop' && (
              <ShopPanel
                balance={balance}
                ownedIds={ownedIds}
                shopTab={shopTab}
                message={shopMessage}
                onTab={setShopTab}
                onBuy={purchaseItem}
                onOpenCase={openCase}
              />
            )}
            {panel === 'customize' && (
              <CustomizePanel
                stage={stage}
                gender={bodyGender}
                equip={equip}
                unlockedRows={unlockedRows}
                ownedIds={ownedIds}
                onEquipBase={equipBaseBody}
                onEquipSport={equipSportBody}
                onEquipWarehouse={equipWarehouse}
              />
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
              <ChallengeDetail challenge={selectedChallenge} closed={closedIds.includes(selectedChallenge.id)} />
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="sportik-menu-open-btn pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-card/95 px-4 py-2 text-sm font-medium text-white shadow-[0_-8px_20px_rgba(0,0,0,0.24)] backdrop-blur-xl"
            aria-label="Открыть меню"
          >
            Меню
            <ChevronUp size={16} />
          </button>
        )}
      </div>

      {currentHint && (
        <div className="absolute inset-0 z-40 flex items-end justify-center px-3 pb-4 md:items-center md:pb-0">
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

function ShopPanel({
  balance,
  ownedIds,
  shopTab,
  message,
  onTab,
  onBuy,
  onOpenCase,
}: {
  balance: number
  ownedIds: string[]
  shopTab: ShopCategory | 'case'
  message: string
  onTab: (tab: ShopCategory | 'case') => void
  onBuy: (id: string) => void
  onOpenCase: (id: string) => void
}) {
  const items = shopTab === 'case' ? [] : WAREHOUSE_SHOP.filter((item) => item.category === shopTab)

  return (
    <div className="max-h-[min(22rem,50vh)] space-y-3 overflow-y-auto px-1 pb-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">Магазин → склад</p>
        <p className="rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-bold text-accent">{balance} очков</p>
      </div>
      <p className="text-xs leading-5 text-muted">
        Формы по видам спорта открываются после посещения события и настраиваются в кастомизации. Здесь — только складские вещи и кейсы.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {SHOP_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTab(tab.id)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
              shopTab === tab.id ? 'bg-accent text-white' : 'bg-white/8 text-muted hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {message && <p className="rounded-xl border border-accent/25 bg-accent/10 px-3 py-2 text-xs text-accent">{message}</p>}
      {shopTab === 'case' ? (
        <div className="space-y-2">
          {LOOT_CASES.map((crate) => (
            <div key={crate.id} className="rounded-2xl border border-white/10 bg-card-elevated p-3">
              <p className="text-sm font-semibold text-white">{crate.title}</p>
              <p className="mt-1 text-[11px] leading-4 text-muted">{crate.description}</p>
              <button
                type="button"
                onClick={() => onOpenCase(crate.id)}
                className="mt-3 w-full rounded-xl bg-accent py-2.5 text-xs font-bold text-white hover:bg-accent-hover"
              >
                Открыть за {crate.price} очков
              </button>
            </div>
          ))}
        </div>
      ) : shopTab === 'champion' ? (
        <p className="rounded-xl border border-dashed border-white/15 px-3 py-4 text-xs text-muted">
          Трофеи за 1–2–3 место на турнирах (токены чемпиона) появятся в следующем обновлении.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {items.map((item) => {
            const owned = ownedIds.includes(item.id)
            return (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-card-elevated p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  {item.badge && <span className="shrink-0 rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-semibold text-muted">{item.badge}</span>}
                </div>
                <p className="mt-1 text-[11px] leading-4 text-muted">{item.description}</p>
                <p className="mt-2 text-xs font-semibold text-accent">{item.price} очков</p>
                <button
                  type="button"
                  disabled={owned}
                  onClick={() => onBuy(item.id)}
                  className="mt-2 w-full rounded-xl border border-white/10 py-2 text-[11px] font-bold text-white disabled:opacity-40"
                >
                  {owned ? 'На складе' : 'Купить'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CustomizePanel({
  stage,
  gender,
  equip,
  unlockedRows,
  ownedIds,
  onEquipBase,
  onEquipSport,
  onEquipWarehouse,
}: {
  stage: SportikStage
  gender: 'male' | 'female'
  equip: StoredEquip
  unlockedRows: SportBodyRow[]
  ownedIds: string[]
  onEquipBase: () => void
  onEquipSport: (sportKey: SportBodyKey, variantIndex: number) => void
  onEquipWarehouse: (id: string | null) => void
}) {
  const ownedItems = ownedIds
    .map((id) => findOwnedItem(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
  const canPickVariant = stage === 'hight'
  const baseActive = !equip.warehouseId && !equip.sportKey

  return (
    <div className="max-h-[min(22rem,50vh)] space-y-4 overflow-y-auto px-1 pb-1">
      <p className="text-sm font-semibold text-white">Кастомизация</p>
      <p className="text-xs leading-5 text-muted">
        Уровень тамагочи: <span className="font-semibold text-white">{STAGE_LABELS[stage]}</span>.
        {canPickVariant ? ' Можно выбрать любую фигуру в открытом виде спорта.' : ' Телосложение подстраивается под уровень автоматически.'}
      </p>

      <button
        type="button"
        onClick={onEquipBase}
        className={`w-full rounded-2xl border px-3 py-3 text-left text-sm ${
          baseActive ? 'border-accent/50 bg-accent/10 text-white' : 'border-white/10 bg-card-elevated text-muted'
        }`}
      >
        <span className="font-semibold">Базовая модель</span>
        <span className="mt-0.5 block text-[11px]">{gender === 'female' ? 'Женская, полная форма' : 'Мужская, тощая форма'}</span>
      </button>

      {unlockedRows.length === 0 ? (
        <p className="text-xs text-muted">Сходите на одно прошедшее мероприятие по виду спорта — здесь появится строка из трёх моделей.</p>
      ) : (
        <div className="space-y-3">
          {unlockedRows.map((row) => {
            const activeSport = equip.sportKey === row.key && !equip.warehouseId
            const forcedIndex = stageVariantIndex(stage, row.gender)
            return (
              <div key={row.key}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{row.label}</p>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {row.variantLabels.map((label, index) => {
                    const locked = !canPickVariant && index !== forcedIndex
                    const selected = activeSport && (canPickVariant ? equip.variantIndex === index : index === forcedIndex)
                    return (
                      <button
                        key={label}
                        type="button"
                        disabled={locked}
                        onClick={() => onEquipSport(row.key, index)}
                        className={`rounded-xl border px-1 py-2.5 text-center text-[10px] font-semibold leading-tight transition-colors ${
                          selected ? 'border-accent/60 bg-accent/15 text-accent' : 'border-white/10 bg-card-elevated text-muted'
                        } disabled:opacity-35`}
                      >
                        {label}
                        {locked && <Lock size={10} className="mx-auto mt-1 opacity-70" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Склад</p>
        {ownedItems.length === 0 ? (
          <p className="mt-2 text-xs text-muted">Купите вещи в магазине или откройте кейс.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {ownedItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onEquipWarehouse(item.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left ${
                  equip.warehouseId === item.id ? 'border-accent/50 bg-accent/10' : 'border-white/10 bg-card-elevated'
                }`}
              >
                <span>
                  <span className="block text-sm font-semibold text-white">{item.title}</span>
                  <span className="block text-[11px] text-muted">{'badge' in item && item.badge ? item.badge : 'Склад'}</span>
                </span>
                {equip.warehouseId === item.id && <span className="text-[11px] font-bold text-accent">Надето</span>}
              </button>
            ))}
            {equip.warehouseId && (
              <button type="button" onClick={() => onEquipWarehouse(null)} className="text-[11px] font-semibold text-muted underline">
                Снять предмет со склада
              </button>
            )}
          </div>
        )}
      </div>
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
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-card-elevated px-3 py-3 text-left"
          >
            <span>
              <span className="block text-sm font-semibold text-white">{challenge.title}</span>
              <span className="mt-0.5 block text-[11px] text-muted">{challenge.reward}</span>
            </span>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${closed ? 'bg-accent/15 text-accent' : 'bg-white/8 text-muted'}`}>
              {closed ? 'Закрыт' : 'Просмотр'}
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
}: {
  challenge: SportikChallenge
  closed: boolean
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
      <p className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm leading-5 text-muted">
        {closed ? 'Челленж уже закрыт.' : 'Только просмотр: закрыть челленж самостоятельно нельзя.'}
      </p>
    </div>
  )
}

allBodyAndWarehouseUrls(WAREHOUSE_SHOP.map((item) => item.modelFile)).forEach((url) => {
  useGLTF.preload(url)
})
