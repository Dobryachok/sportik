import { ADMIN_EMAIL, ADMIN_PASSWORD_HASH } from './auth'
import type { AppState } from './types'

const avatar = (n: number) =>
  `https://i.pravatar.cc/150?img=${n}`

export function createSeedState(): AppState {
  const users = [
    {
      id: 'u-vitya',
      name: 'Витя',
      age: 20,
      city: 'Красноярск',
      role: 'user' as const,
      avatarUrl: avatar(12),
      stats: { events: 58, subscriptions: 7, followers: 5 },
    },
    {
      id: 'u-anya',
      name: 'Аня',
      city: 'Красноярск',
      role: 'user' as const,
      avatarUrl: avatar(5),
      stats: { events: 42, subscriptions: 12, followers: 18 },
    },
    {
      id: 'u-admin',
      name: 'Админ',
      city: 'Красноярск',
      role: 'admin' as const,
      avatarUrl: avatar(8),
    },
    {
      id: 'u-org',
      name: 'Клуб «Север»',
      city: 'Красноярск',
      role: 'organization' as const,
      avatarUrl: avatar(15),
    },
    ...Array.from({ length: 14 }, (_, i) => ({
      id: `u-p${i + 1}`,
      name: ['Максутбек', 'Андрей', 'Наиль', 'Полина', 'Игорь', 'Катя'][i % 6] + (i > 5 ? ` ${i}` : ''),
      city: 'Красноярск',
      role: 'user' as const,
      avatarUrl: avatar((i + 20) % 70),
    })),
  ]

  const sports = [
    { id: 'sp-vb', name: 'Волейбол', slug: 'volleyball', eventCount: 41 },
    { id: 'sp-run', name: 'Бег', slug: 'running', eventCount: 12 },
    { id: 'sp-chess', name: 'Шахматы', slug: 'chess', eventCount: 6 },
    { id: 'sp-foot', name: 'Футбол', slug: 'football', eventCount: 18 },
  ]

  const baseDate = new Date('2026-10-19T18:30:00+07:00')

  const events = [
    {
      id: 'ev-korneeva',
      sportId: 'sp-vb',
      organizerUserId: 'u-anya',
      title: 'волейбол на Корнеева 2* и выше',
      description:
        'Игра для любителей уровня 2* и выше. Приносите форму и воду. На площадке есть раздевалка.',
      address: 'Корнеева, д. 50',
      district: 'левый берег',
      city: 'Красноярск',
      startsAt: new Date('2026-09-27T20:00:00+07:00').toISOString(),
      price: 450,
      discountedPrice: 400,
      capacity: 14,
      joinMode: 'open' as const,
      status: 'published' as const,
      level: 2,
      minAge: 16,
      imageUrl: '/images/hero.png',
      gallery: ['/images/hero.png', '/images/hero.png'],
      rating: 4.2,
      distanceKm: 4.2,
      eventType: 'game' as const,
    },
    {
      id: 'ev-tsimlyanskaya',
      sportId: 'sp-vb',
      organizerUserId: 'u-anya',
      title: 'Волейбол на Цимлянской 2* и выше',
      description:
        '!!! На игру допускаются участники от 16 лет, с распиской от родителей. Уровень 2* и выше.',
      address: 'г. Красноярск, Цимлянская улица, д. 35А',
      district: 'левый берег',
      city: 'Красноярск',
      startsAt: baseDate.toISOString(),
      price: 350,
      capacity: 14,
      joinMode: 'open' as const,
      status: 'published' as const,
      level: 2,
      minAge: 16,
      imageUrl: '/images/hero.png',
      gallery: ['/images/hero.png', '/images/hero.png'],
      rating: 4.5,
      distanceKm: 630.9,
      eventType: 'game' as const,
    },
    {
      id: 'ev-application',
      sportId: 'sp-vb',
      organizerUserId: 'u-anya',
      title: 'Волейбол: тренировка с тренером',
      description: 'Запись по заявке. Тренер подтверждает уровень игроков.',
      address: 'Спорткомплекс, ул. Мира 12',
      district: 'правый берег',
      city: 'Красноярск',
      startsAt: new Date('2026-10-22T19:00:00+07:00').toISOString(),
      price: 500,
      capacity: 8,
      joinMode: 'application' as const,
      status: 'published' as const,
      level: 3,
      imageUrl: '/images/hero.png',
      rating: 5,
      eventType: 'training' as const,
    },
    {
      id: 'ev-run',
      sportId: 'sp-run',
      organizerUserId: 'u-vitya',
      title: 'Утренний забег 5 км',
      description: 'Лёгкий темп, подходит начинающим.',
      address: 'Набережная Енисея',
      city: 'Красноярск',
      startsAt: new Date('2026-10-20T07:00:00+07:00').toISOString(),
      price: 0,
      capacity: 30,
      joinMode: 'open' as const,
      status: 'published' as const,
      level: 1,
      rating: 4.8,
      eventType: 'game' as const,
    },
    {
      id: 'ev-chess',
      sportId: 'sp-chess',
      organizerUserId: 'u-vitya',
      title: 'Шахматный кружок: встреча в субботу',
      description: 'Партии по швейцарской системе, 5 раундов.',
      address: 'Библиотека, пр. Мира 15',
      city: 'Красноярск',
      startsAt: new Date('2026-10-25T14:00:00+07:00').toISOString(),
      price: 200,
      capacity: 16,
      joinMode: 'application' as const,
      status: 'published' as const,
      level: 2,
      rating: 4.6,
      eventType: 'game' as const,
    },
    {
      id: 'ev-foot',
      sportId: 'sp-foot',
      organizerUserId: 'u-org',
      organizationId: 'org-sever',
      title: 'Футбол 5×5 на искусственном поле',
      description: 'Клубное мероприятие после допуска организации.',
      address: 'Стадион «Север»',
      city: 'Красноярск',
      startsAt: new Date('2026-10-21T20:00:00+07:00').toISOString(),
      price: 600,
      capacity: 10,
      joinMode: 'open' as const,
      status: 'published' as const,
      level: 2,
      rating: 4.0,
      eventType: 'game' as const,
    },
    {
      id: 'ev-past',
      sportId: 'sp-vb',
      organizerUserId: 'u-anya',
      title: 'Волейбол на Корнеева (прошедшее)',
      description: 'Архивное событие для вкладки «Прошедшие».',
      address: 'Корнеева, д. 50',
      district: 'левый берег',
      city: 'Красноярск',
      startsAt: new Date('2026-08-15T20:00:00+07:00').toISOString(),
      price: 450,
      capacity: 14,
      joinMode: 'open' as const,
      status: 'published' as const,
      level: 2,
      rating: 4.3,
      eventType: 'game' as const,
    },
    {
      id: 'ev-unpublished',
      sportId: 'sp-vb',
      organizerUserId: 'u-anya',
      title: 'Снятое с публикации (демо)',
      description: 'Недоступно для записи.',
      address: 'Скрытая площадка',
      city: 'Красноярск',
      startsAt: new Date('2026-11-01T18:00:00+07:00').toISOString(),
      price: 300,
      capacity: 12,
      joinMode: 'open' as const,
      status: 'unpublished' as const,
      level: 2,
      rating: 3,
      eventType: 'game' as const,
    },
  ]

  const korneevaParticipants = users
    .filter((u) => u.id.startsWith('u-p'))
    .slice(0, 14)
    .map((u, i) => ({
      id: `part-k-${i}`,
      eventId: 'ev-korneeva',
      userId: u.id,
      status: 'confirmed' as const,
      createdAt: new Date('2026-09-20T10:00:00Z').toISOString(),
    }))

  const participations = [
    ...korneevaParticipants,
    {
      id: 'part-tsim-1',
      eventId: 'ev-tsimlyanskaya',
      userId: 'u-p1',
      status: 'confirmed' as const,
      createdAt: new Date().toISOString(),
    },
  ]

  const comments = [
    {
      id: 'c1',
      eventId: 'ev-tsimlyanskaya',
      authorId: 'u-p2',
      text: 'Можно прийти с другом, если места останутся?',
      createdAt: new Date('2026-10-18T12:00:00+07:00').toISOString(),
    },
    {
      id: 'c2',
      eventId: 'ev-tsimlyanskaya',
      authorId: 'u-anya',
      text: 'Да, если запись открыта — присоединяйтесь обоими.',
      createdAt: new Date('2026-10-18T13:00:00+07:00').toISOString(),
    },
  ]

  const notifications = [
    {
      id: 'n1',
      createdAt: '2026-10-15T14:35:00+07:00',
      title: 'Нужен новый мяч?🏐',
      body: 'В чате волейбола обсуждают закупку инвентаря.',
      linkText: 'Открыть чат',
      linkUrl: '/sport/volleyball',
    },
    {
      id: 'n2',
      createdAt: '2026-10-14T09:00:00+07:00',
      title: 'Напоминание о игре',
      body: 'Завтра волейбол на Цимлянской — не забудьте форму.',
      eventTag: 'Волейбол',
      eventDate: '18 октября 14:00',
      linkUrl: '/events/ev-tsimlyanskaya',
    },
  ]

  const accounts = [
    {
      id: 'acc-admin',
      userId: 'u-admin',
      email: ADMIN_EMAIL,
      passwordHash: ADMIN_PASSWORD_HASH,
    },
  ]

  return {
    version: 3,
    currentUserId: null,
    accounts,
    city: 'Красноярск',
    users,
    organizations: [
      {
        id: 'org-sever',
        name: 'Клуб «Север»',
        description: 'Любительский футбол и волейбол на левом берегу.',
        sports: ['Футбол', 'Волейбол'],
        status: 'approved',
        ownerUserId: 'u-org',
      },
      {
        id: 'org-pending',
        name: 'Шахматный кружок «Гамбит»',
        description: 'Заявка на допуск (демо фазы 2).',
        sports: ['Шахматы'],
        status: 'pending',
        ownerUserId: 'u-vitya',
      },
    ],
    sports,
    events,
    participations,
    comments,
    notifications,
    favorites: ['ev-korneeva'],
    likedEvents: [],
  }
}
