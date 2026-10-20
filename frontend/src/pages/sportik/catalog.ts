import { sportikModelPath } from './models'

export type ShopCategory = 'outfit' | 'champion' | 'case'

export type ShopItem = {
  id: string
  title: string
  description: string
  category: ShopCategory
  price: number
  modelFile: string
  badge?: string
}

export type CaseLoot = {
  id: string
  title: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  chance: number
  modelFile: string
}

export type LootCase = {
  id: string
  title: string
  description: string
  price: number
  loot: CaseLoot[]
}

/** Только складские предметы — не тела по видам спорта. */
export const WAREHOUSE_SHOP: ShopItem[] = [
  {
    id: 'wh-hoodie',
    title: 'Оверсайз-худи',
    description: 'Street Sport: уютный капюшон для городских тренировок.',
    category: 'outfit',
    price: 120,
    modelFile: '0turtleneck hoodie.glb',
    badge: 'Стрит',
  },
  {
    id: 'wh-turtleneck',
    title: 'Базовый лонгслив',
    description: 'Повседневный верх для прогулок и разминки.',
    category: 'outfit',
    price: 80,
    modelFile: '0slender turtleneck.glb',
    badge: 'Стрит',
  },
]

export const LOOT_CASES: LootCase[] = [
  {
    id: 'street-crate',
    title: 'Street Sport Crate',
    description: 'Гранж и уличный спорт.',
    price: 150,
    loot: [
      { id: 'loot-bandana', title: 'Спортивная бандана', rarity: 'common', chance: 60, modelFile: '0slender turtleneck.glb' },
      { id: 'loot-hoodie', title: 'Рваный худи-лут', rarity: 'rare', chance: 28, modelFile: '0turtleneck hoodie.glb' },
      { id: 'loot-skate', title: 'Трюковой скейт', rarity: 'epic', chance: 10, modelFile: '0volleyball, slender.glb' },
      { id: 'loot-boombox', title: 'Бумбокс 90-х', rarity: 'legendary', chance: 2, modelFile: '1muscular hockey player.glb' },
    ],
  },
  {
    id: 'cyber-crate',
    title: 'Cyber Athlete Crate',
    description: 'Неон и high-tech акценты.',
    price: 200,
    loot: [
      { id: 'loot-cyber-glasses', title: 'Кибер-очки', rarity: 'common', chance: 55, modelFile: '1skinny hockey player.glb' },
      { id: 'loot-cyber-knees', title: 'Экзо-наколенники', rarity: 'rare', chance: 32, modelFile: '1slender box.glb' },
      { id: 'loot-cyber-vest', title: 'Тактический жилет', rarity: 'epic', chance: 10, modelFile: '1muscular basketball player.glb' },
      { id: 'loot-cyber-drone', title: 'Дрон-тренер', rarity: 'legendary', chance: 3, modelFile: '1muscular boxer.glb' },
    ],
  },
]

export function findShopItem(id: string) {
  return WAREHOUSE_SHOP.find((item) => item.id === id)
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

export function shopItemModelUrl(item: { modelFile?: string }) {
  return item.modelFile ? sportikModelPath(item.modelFile) : null
}

export const SHOP_TABS: { id: ShopCategory | 'case'; label: string }[] = [
  { id: 'outfit', label: 'Стрит' },
  { id: 'champion', label: 'Трофеи' },
  { id: 'case', label: 'Кейсы' },
]
