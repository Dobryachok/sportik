import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchDiscoveryTeams,
  fetchDiscoveryUsers,
  joinTeamRequest,
  likeDiscoveryUser,
  skipDiscoveryTeam,
  skipDiscoveryUser,
} from '../api/discovery'
import type { DiscoveryTeamCard, DiscoveryUserCard } from '../data/discoveryTypes'

type Mode = 'users' | 'teams'

export function useDiscovery(mode: Mode) {
  const [items, setItems] = useState<(DiscoveryUserCard | DiscoveryTeamCard)[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const prefetching = useRef(false)

  const loadMore = useCallback(async (reset = false) => {
    if (prefetching.current && !reset) return
    prefetching.current = true
    setError('')
    if (reset) {
      setLoading(true)
      setCursor(null)
    }
    try {
      const response =
        mode === 'users'
          ? await fetchDiscoveryUsers(reset ? undefined : cursor ?? undefined)
          : await fetchDiscoveryTeams(reset ? undefined : cursor ?? undefined)
      setItems((current) => (reset ? response.items : [...current, ...response.items]))
      setCursor(response.nextCursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить рекомендации.')
    } finally {
      setLoading(false)
      prefetching.current = false
    }
  }, [cursor, mode])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setItems([])
    setCursor(null)
    const fetcher = mode === 'users' ? fetchDiscoveryUsers : fetchDiscoveryTeams
    void fetcher()
      .then((response) => {
        if (cancelled) return
        setItems(response.items)
        setCursor(response.nextCursor)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить рекомендации.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [mode])

  const ensureBuffer = useCallback(() => {
    if (items.length <= 2 && cursor && !prefetching.current) void loadMore(false)
  }, [cursor, items.length, loadMore])

  const dismissCurrent = useCallback(() => {
    setItems((current) => current.slice(1))
    ensureBuffer()
  }, [ensureBuffer])

  const actOnUser = useCallback(
    async (userId: string, action: 'like' | 'skip') => {
      if (action === 'like') await likeDiscoveryUser(userId)
      else await skipDiscoveryUser(userId)
      dismissCurrent()
    },
    [dismissCurrent],
  )

  const actOnTeam = useCallback(
    async (teamId: string, action: 'join' | 'skip') => {
      if (action === 'join') await joinTeamRequest(teamId)
      else await skipDiscoveryTeam(teamId)
      dismissCurrent()
    },
    [dismissCurrent],
  )

  return {
    items,
    loading,
    error,
    reload: () => loadMore(true),
    actOnUser,
    actOnTeam,
    current: items[0] ?? null,
    next: items[1] ?? null,
  }
}
