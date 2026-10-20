/** Curated interests for profile tags (third-revision spec). */
export const INTEREST_CATALOG = [
  'Бег',
  'Футбол',
  'Волейбол',
  'Баскетбол',
  'Теннис',
  'Плавание',
  'Йога',
  'Фитнес',
  'Кроссфит',
  'Велоспорт',
  'Лыжи',
  'Сноуборд',
  'Скалолазание',
  'Бокс',
  'Единоборства',
  'Шахматы',
  'Настольный теннис',
  'Бадминтон',
  'Хоккей',
  'Регби',
  'Гандбол',
  'Танцы',
  'Пилатес',
  'Стретчинг',
  'Туризм',
  'Скейтборд',
  'Ролики',
  'Гольф',
  'Дартс',
  'Петанк',
  'Киберспорт',
  'Силовые тренировки',
  'Функциональный тренинг',
  'Триатлон',
  'Марафон',
  'Скандинавская ходьба',
  'Паркур',
  'Сёрфинг',
  'Дайвинг',
  'Карате',
] as const

export type InterestTag = (typeof INTEREST_CATALOG)[number]

export const GENDER_OPTIONS = [
  { value: '', label: 'Не выбрано' },
  { value: 'male', label: 'Мужской' },
  { value: 'female', label: 'Женский' },
  { value: 'unknown', label: 'Не знаю' },
] as const

export function genderLabel(value: string | null | undefined) {
  return GENDER_OPTIONS.find((item) => item.value === value)?.label ?? 'Не указано'
}
