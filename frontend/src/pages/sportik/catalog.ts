import type { SportikStage } from './progress'
import { sportikModelPath, STAGE_MODEL_FILES, stageModelUrl } from './models'

export type ShopCategory = 'outfit' | 'champion' | 'case' | 'sport'

export type ShopItem = {
  id: string
  title: string
  description: string
  category: ShopCategory
  price: number
  modelFile?: string
  minStage?: SportikStage
  badge?: string
}

export type CaseLoot = {
  id: string
  title: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  chance: number
  modelFile?: string
}

export type LootCase = {
  id: string
  title: string
  description: string
  price: number
  loot: CaseLoot[]
}

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'street-hoodie',
    title: 'Оверсайз-худи',
    description: 'Street Sport: уютный капюшон для городских тренировок.',
    category: 'outfit',
    price: 120,
    modelFile: 'turtleneck hoodie.glb',
    badge: 'Стрит',
  },
  {
    id: 'slender-tee',
    title: 'Базовый худощавый',
    description: 'Лёгкий силуэт новичка — альтернативная стартовая форма.',
    category: 'outfit',
    price: 0,
    modelFile: 'slender turtleneck.glb',
    badge: 'Бесплатно',
  },
  {
    id: 'tennis-slim',
    title: 'Кортовый стиль',
    description: 'Облегчённая теннисная экипировка.',
    category: 'sport',
    price: 180,
    modelFile: 'slim tennis player.glb',
    minStage: 'medium',
    badge: 'Теннис',
  },
  {
    id: 'volleyball-thin',
    title: 'Волейболист',
    description: 'Форма для пляжного и классического волейбола.',
    category: 'sport',
    price: 200,
    modelFile: 'thin volleyball player.glb',
    minStage: 'medium',
    badge: 'Волейбол',
  },
  {
    id: 'hockey-slender',
    title: 'Хоккейный комплект',
    description: 'Стройный силуэт на льду.',
    category: 'sport',
    price: 220,
    modelFile: 'slender hockey player.glb',
    minStage: 'medium',
    badge: 'Хоккей',
  },
  {
    id: 'boxer-skinny',
    title: 'Боксёрский ринг',
    description: 'Лёгкий вес, быстрые ноги.',
    category: 'sport',
    price: 240,
    modelFile: 'skinny boxer.glb',
    minStage: 'medium',
    badge: 'Бокс',
  },
  {
    id: 'champion-tennis',
    title: 'Триумфатор корта',
    description: 'Полная турнирная форма — только для тех, кто тянет график.',
    category: 'champion',
    price: 450,
    modelFile: 'tennis full version.glb',
    minStage: 'hight',
    badge: 'Чемпион',
  },
  {
    id: 'champion-volleyball',
    title: 'Команда мечты',
    description: 'Полный комплект волейбольного матча.',
    category: 'champion',
    price: 500,
    modelFile: 'full volleyball match.glb',
    minStage: 'hight',
    badge: 'Чемпион',
  },
  {
    id: 'champion-golf',
    title: 'Гольф-классик',
    description: 'Спокойная уверенность курса.',
    category: 'champion',
    price: 480,
    modelFile: 'full golf.glb',
    minStage: 'hight',
    badge: 'Чемпион',
  },
  {
    id: 'titan-boxer',
    title: 'Титан ринга',
    description: 'Мощная мускулатура — элитный облик ветерана.',
    category: 'champion',
    price: 600,
    modelFile: 'muscular boxer.glb',
    minStage: 'hight',
    badge: 'Титан',
  },
]

export const LOOT_CASES: LootCase[] = [
  {
    id: 'street-crate',
    title: 'Street Sport Crate',
    description: 'Гранж и уличный спорт: худи, банданы, скейт-вайб.',
    price: 150,
    loot: [
      { id: 'street-bandana', title: 'Спортивная бандана', rarity: 'common', chance: 60, modelFile: 'slender turtleneck.glb' },
      { id: 'street-hoodie-loot', title: 'Рваный худи-лут', rarity: 'rare', chance: 28, modelFile: 'turtleneck hoodie.glb' },
      { id: 'street-skate', title: 'Трюковой скейт', rarity: 'epic', chance: 10, modelFile: 'volleyball, slender.glb' },
      { id: 'street-boombox', title: 'Бумбокс 90-х', rarity: 'legendary', chance: 2, modelFile: 'muscular hockey player.glb' },
    ],
  },
  {
    id: 'cyber-crate',
    title: 'Cyber Athlete Crate',
    description: 'Неон, экзо-колени и high-tech акценты.',
    price: 200,
    loot: [
      { id: 'cyber-glasses', title: 'Кибер-очки', rarity: 'common', chance: 55, modelFile: 'skinny hockey player.glb' },
      { id: 'cyber-knees', title: 'Экзо-наколенники', rarity: 'rare', chance: 32, modelFile: 'slender box.glb' },
      { id: 'cyber-vest', title: 'Тактический жилет', rarity: 'epic', chance: 10, modelFile: 'muscular basketball player.glb' },
      { id: 'cyber-drone', title: 'Дрон-тренер', rarity: 'legendary', chance: 3, modelFile: 'hight.glb' },
    ],
  },
]

export function shopItemModelUrl(item: ShopItem | CaseLoot) {
  return item.modelFile ? sportikModelPath(item.modelFile) : null
}

export const STAGE_ORDER: SportikStage[] = ['default', 'medium', 'hight']

export function stageMeetsRequirement(stage: SportikStage, minStage?: SportikStage) {
  if (!minStage) return true
  return STAGE_ORDER.indexOf(stage) >= STAGE_ORDER.indexOf(minStage)
}

export function findShopItem(id: string) {
  return SHOP_ITEMS.find((item) => item.id === id)
}

export function findOwnedItem(id: string) {
  const shop = findShopItem(id)
  if (shop) return shop
  for (const crate of LOOT_CASES) {
    const loot = crate.loot.find((entry) => entry.id === id)
    if (loot) return { id: loot.id, title: loot.title, modelFile: loot.modelFile }
  }
  return undefined
}

export function rollCaseLoot(crate: LootCase) {
  const roll = Math.random() * 100
  let cursor = 0
  for (const entry of crate.loot) {
    cursor += entry.chance
    if (roll <= cursor) return entry
  }
  return crate.loot[crate.loot.length - 1]
}

export function resolveDisplayModelUrl(stage: SportikStage, equippedId: string | null) {
  const equipped = equippedId ? findOwnedItem(equippedId) : undefined
  if (equipped?.modelFile) return sportikModelPath(equipped.modelFile)
  return stageModelUrl(stage)
}

export function allModelUrls() {
  const files = new Set<string>()
  Object.values(STAGE_MODEL_FILES).forEach((file) => files.add(sportikModelPath(file)))
  SHOP_ITEMS.forEach((item) => {
    if (item.modelFile) files.add(sportikModelPath(item.modelFile))
  })
  LOOT_CASES.forEach((crate) => {
    crate.loot.forEach((loot) => {
      if (loot.modelFile) files.add(sportikModelPath(loot.modelFile))
    })
  })
  return [...files]
}
