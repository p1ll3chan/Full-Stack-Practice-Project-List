import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import { subscribeContentEvents } from '../api/contentEvents'
import type { ListMeta } from '../api/types'

interface ApiState<T> {
  path: string
  tick: number
  data: T | null
  loading: boolean
  error: Error | null
}

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

function freshState<T>(path: string, tick: number): ApiState<T> {
  return { path, tick, data: null, loading: true, error: null }
}

function freshListState<T>(path: string, tick: number): ListState<T> {
  return { path, tick, data: [], meta: null, loading: true, error: null }
}

function useRefresh(): { tick: number; refetch: () => void } {
  const [tick, setTick] = useState(0)
  useEffect(() => subscribeContentEvents(() => setTick((t) => t + 1)), [])
  const refetch = useCallback(() => setTick((t) => t + 1), [])
  return { tick, refetch }
}

export function useApi<T>(path: string): UseApiState<T> & { refetch: () => void } {
  const [state, setState] = useState<ApiState<T>>(() => ({ path, tick: 0, data: null, loading: true, error: null }))
  const { tick, refetch } = useRefresh()

  useEffect(() => {
    let cancelled = false
    api
      .get<T>(path)
      .then((data) => {
        if (!cancelled) setState({ path, tick, data, loading: false, error: null })
      })
      .catch((err: Error) => {
        if (cancelled) return
        setState((prev) =>
          prev.path === path && prev.data !== null
            ? { path, tick, data: prev.data, loading: false, error: null }
            : { path, tick, data: null, loading: false, error: err },
        )
      })
    return () => {
      cancelled = true
    }
  }, [path, tick])

  const current =
    state.path === path && (state.tick === tick || state.data !== null) ? state : freshState<T>(path, tick)

  return { data: current.data, loading: current.loading, error: current.error, refetch }
}

interface ListState<T> {
  path: string
  tick: number
  data: T[]
  meta: ListMeta | null
  loading: boolean
  error: Error | null
}

interface UseApiListState<T> {
  data: T[]
  meta: ListMeta | null
  loading: boolean
  error: Error | null
}

export function useApiList<T>(path: string): UseApiListState<T> & { refetch: () => void } {
  const [state, setState] = useState<ListState<T>>(() => ({
    path,
    tick: 0,
    data: [],
    meta: null,
    loading: true,
    error: null,
  }))
  const { tick, refetch } = useRefresh()

  useEffect(() => {
    let cancelled = false
    api
      .list<T>(path)
      .then((result) => {
        if (!cancelled) setState({ path, tick, data: result.data, meta: result.meta, loading: false, error: null })
      })
      .catch((err: Error) => {
        if (cancelled) return
        setState((prev) =>
          prev.path === path && prev.meta !== null
            ? { path, tick, data: prev.data, meta: prev.meta, loading: false, error: null }
            : { path, tick, data: [], meta: null, loading: false, error: err },
        )
      })
    return () => {
      cancelled = true
    }
  }, [path, tick])

  const current =
    state.path === path && (state.tick === tick || state.meta !== null) ? state : freshListState<T>(path, tick)

  return { data: current.data, meta: current.meta, loading: current.loading, error: current.error, refetch }
}
