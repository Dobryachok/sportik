import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bounds, Center, OrbitControls } from '@react-three/drei'
import { TOUCH } from 'three'
import { SportikModel } from './sportik/SportikModel'
import { ChevronLeft, Lock, Palette, ShoppingBag, Trophy } from 'lucide-react'
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
import { buildUnlockedKeySet, resolveDisplayModelUrl } from './sportik/displayModel'
import { preloadSportikFile, preloadSportikGlb, preloadSportRowForStage, preloadSportRowVariants } from './sportik/modelLoader'
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
  sportBodyModelUrl,
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
  const [sheetExpanded, setSheetExpanded] = useState(true)
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
      setSheetExpanded(true)
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

  useEffect(() => {
    preloadSportikGlb(modelUrl)
  }, [modelUrl])

  useEffect(() => {
    if (!currentUser) return
    const storageKey = `sportik-preloaded-sports:${currentUser.id}`
    let known = new Set<SportBodyKey>()
    try {
      known = new Set(JSON.parse(sessionStorage.getItem(storageKey) || '[]') as SportBodyKey[])
    } catch { /* ignore */ }
    let changed = false
    for (const row of unlockedRows) {
      if (known.has(row.key)) continue
      known.add(row.key)
      changed = true
      preloadSportRowForStage(row, stage)
    }
    if (changed) {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify([...known]))
      } catch { /* ignore */ }
    }
  }, [currentUser, unlockedRows, stage])

  const titanVariantsLoaded = useRef(false)
  useEffect(() => {
    if (stage !== 'hight') {
      titanVariantsLoaded.current = false
      return
    }
    if (titanVariantsLoaded.current) return
    titanVariantsLoaded.current = true
    for (const row of unlockedRows) preloadSportRowVariants(row)
  }, [stage, unlockedRows])

  useEffect(() => {
    if (!currentUser) return
    const storageKey = `sportik-preloaded-owned:${currentUser.id}`
    let known = new Set<string>()
    try {
      known = new Set(JSON.parse(sessionStorage.getItem(storageKey) || '[]'))
    } catch { /* ignore */ }
    let changed = false
    for (const id of ownedIds) {
      if (known.has(id)) continue
      known.add(id)
      changed = true
      const item = findOwnedItem(id)
      if (item?.modelFile) preloadSportikFile(item.modelFile)
    }
    if (changed) {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify([...known]))
      } catch { /* ignore */ }
    }
  }, [currentUser, ownedIds])

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
    preloadSportikFile(item.modelFile)
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
    preloadSportikFile(loot.modelFile)
    setShopMessage(`Выпало: «${loot.title}» (${loot.rarity}).`)
  }

  const equipWarehouse = (itemId: string | null) => {
    if (itemId) {
      const item = findOwnedItem(itemId)
      if (item?.modelFile) preloadSportikFile(item.modelFile)
    }
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
    const url = sportBodyModelUrl(row, canPick ? variantIndex : allowed)
    preloadSportikGlb(url)
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

  const sheetOpen = sheetExpanded || hintsOpen
  const panelTitle =
    panel === 'shop' ? 'Магазин' : panel === 'customize' ? 'Кастом' : panel === 'challenges' ? 'Челленжи' : panel === 'challenge-detail' ? 'Челлендж' : null

  const expandSheet = () => setSheetExpanded(true)
  const collapseSheet = () => {
    if (hintsOpen) return
    setSheetExpanded(false)
    setPanel('home')
    setSelectedChallengeId(null)
  }
  const challengeHint =
    goal.challengesNeeded > 0
      ? `закрой ещё ${goal.challengesNeeded} ${goal.challengesNeeded === 1 ? 'челленж' : 'челленжа'}`
      : null

  const canvasBottomClass = sheetExpanded
    ? 'max-md:bottom-[min(58vh,24rem)]'
    : 'max-md:bottom-11'

  return (
    <div
      className="relative min-h-[calc(100dvh-var(--app-nav-height)-env(safe-area-inset-bottom,0px))] w-full flex-1 overflow-hidden md:min-h-[32rem] md:rounded-[1.35rem]"
      style={{ ['--sportik-nav' as string]: 'calc(var(--app-nav-height) + env(safe-area-inset-bottom, 0px))' }}
    >
      <Canvas
        className={`absolute inset-x-0 top-0 bottom-0 transition-[bottom] duration-300 ease-out md:inset-0 ${canvasBottomClass}`}
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

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 md:top-3 md:px-3">
        <div className="w-full border-b border-white/10 bg-card/95 px-4 py-2.5 backdrop-blur-xl md:mx-auto md:max-w-lg md:rounded-2xl md:border md:shadow-[0_10px_24px_rgba(0,0,0,0.2)]">
          <div className="flex items-center justify-between gap-3 text-sm">
            <p className="font-semibold text-white">{STAGE_LABELS[stage]}</p>
            <p className="text-xs font-semibold text-accent">{points} очк.</p>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${visitRatio * 100}%` }} />
          </div>
          <p className="mt-1.5 truncate text-[11px] leading-4 text-muted">
            {visits}/{goal.visitTarget} посещений{goal.nextLabel ? ` → «${goal.nextLabel}»` : ''}{challengeHint ? ` · ${challengeHint}` : ''}
          </p>
        </div>
      </div>

      <div
        className={`pointer-events-auto absolute inset-x-0 z-20 flex flex-col overflow-hidden border-t border-white/10 bg-card/98 shadow-[0_-16px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl transition-[max-height] duration-300 ease-out max-md:bottom-0 md:bottom-3 md:left-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:rounded-t-[1.35rem] md:border md:border-b-0 ${
          sheetExpanded
            ? 'max-h-[min(calc(100dvh-var(--sportik-nav)-3.25rem),42rem)] md:max-h-[min(72vh,34rem)]'
            : 'max-h-11 md:max-h-12'
        }`}
      >
        <button
          type="button"
          onClick={() => (sheetExpanded ? collapseSheet() : expandSheet())}
          disabled={hintsOpen}
          className="flex w-full shrink-0 flex-col items-center gap-1 border-b border-white/5 py-2.5 disabled:opacity-60"
          aria-label={sheetExpanded ? 'Свернуть меню' : 'Развернуть меню'}
        >
          <span className="h-1 w-12 rounded-full bg-white/25" />
          {!sheetExpanded && <span className="text-[11px] font-medium text-muted">Меню</span>}
        </button>

        {sheetOpen && (
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-2 pt-1 max-md:max-h-[calc(100dvh-var(--sportik-nav)-4.5rem)]">
            <div className="relative mb-2 flex min-h-8 shrink-0 items-center justify-center">
              {panel !== 'home' && !hintsOpen ? (
                <>
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
                    className="absolute left-0 flex h-8 items-center gap-0.5 rounded-lg px-1 text-sm font-medium text-muted hover:text-white"
                  >
                    <ChevronLeft size={18} />
                    Назад
                  </button>
                  {panelTitle && <p className="text-sm font-semibold text-white">{panelTitle}</p>}
                </>
              ) : (
                <p className="text-sm font-semibold text-white">Меню Спортика</p>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {panel === 'home' && (
              <div className="grid grid-cols-3 gap-2 pb-1">
                {menuCards.map((card) => {
                  const Icon = card.icon
                  const shopLocked = card.id === 'shop' && !shopUnlocked
                  const customizeLocked = card.id === 'customize' && !shopUnlocked
                  const locked = shopLocked || customizeLocked
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => {
                        expandSheet()
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
                          if (customizeLocked) {
                            navigate('/tamagotchi')
                            return
                          }
                          setShopMessage('')
                          setPanel('customize')
                        }
                      }}
                      className={`flex min-h-[4.75rem] flex-col items-center justify-center gap-1.5 rounded-xl border px-1 py-2.5 text-center transition-colors ${
                        locked
                          ? 'border-white/10 bg-card-elevated/60 opacity-70'
                          : 'border-white/10 bg-card-elevated hover:border-accent/40'
                      }`}
                    >
                      <span className="sportik-menu-tile-icon relative flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
                        <Icon size={18} />
                        {locked && <Lock size={10} className="absolute -right-0.5 -top-0.5 text-muted" />}
                      </span>
                      <span className="text-xs font-semibold text-white">{card.title}</span>
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
          </div>
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
    <div className="space-y-2.5 pb-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">Баланс</p>
        <p className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] font-bold text-accent">{balance} очков</p>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
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
            <div key={crate.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-card-elevated px-3 py-2.5">
              <p className="text-sm font-semibold text-white">{crate.title}</p>
              <button
                type="button"
                onClick={() => onOpenCase(crate.id)}
                className="shrink-0 rounded-lg bg-accent px-3 py-2 text-[11px] font-bold text-white hover:bg-accent-hover"
              >
                {crate.price} очк.
              </button>
            </div>
          ))}
        </div>
      ) : shopTab === 'champion' ? (
        <p className="py-6 text-center text-xs text-muted">Трофеи чемпиона — скоро</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const owned = ownedIds.includes(item.id)
            return (
              <div key={item.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-card-elevated px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-[11px] font-semibold text-accent">{item.price} очков</p>
                </div>
                <button
                  type="button"
                  disabled={owned}
                  onClick={() => onBuy(item.id)}
                  className="shrink-0 rounded-lg bg-accent px-3 py-2 text-[11px] font-bold text-white disabled:bg-white/10 disabled:text-muted"
                >
                  {owned ? '✓' : 'Купить'}
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
    <div className="space-y-3 pb-1">
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
        <p className="text-center text-xs text-muted py-2">Нет открытых видов спорта</p>
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

      <div className="border-t border-white/10 pt-3">
        <p className="text-xs font-semibold text-white">Склад</p>
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
