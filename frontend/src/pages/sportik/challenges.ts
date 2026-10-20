export interface SportikChallenge {
  id: string
  title: string
  description: string
  reward: string
  points: 2
}

export const sportikChallenges: SportikChallenge[] = [
  {
    id: 'first-steps',
    title: 'Первые шаги',
    description: 'Выйди на любое мероприятие и отметь, что Спортик тоже был в деле. Награда за старт пути.',
    reward: 'Кепка новичка',
    points: 2,
  },
  {
    id: 'morning-run',
    title: 'Утренняя зарядка',
    description: 'Сходи на пробежку или утреннюю тренировку. Спортик учится не просыпать разминку.',
    reward: 'Кроссовки «Рассвет»',
    points: 2,
  },
  {
    id: 'team-game',
    title: 'Командная игра',
    description: 'Поучаствуй в командной встрече: футбол, волейбол или любая игра с партнёрами.',
    reward: 'Худи клуба',
    points: 2,
  },
  {
    id: 'fair-play',
    title: 'Честная игра',
    description: 'Заверши событие без срывов и поддержи атмосферу. Спортик получает знак уважения.',
    reward: 'Медаль fair play',
    points: 2,
  },
  {
    id: 'weekend-hero',
    title: 'Герой выходных',
    description: 'Проведи спортивный уикенд: тренировка или игра в субботу либо воскресенье.',
    reward: 'Повязка чемпиона',
    points: 2,
  },
]

const storageKey = (userId: string) => `sportik-challenges:${userId}`

export function readClosedChallenges(userId: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === 'string')
  } catch {
    return []
  }
}

export function writeClosedChallenges(userId: string, ids: string[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(ids))
  } catch {
    /* storage is optional */
  }
}
