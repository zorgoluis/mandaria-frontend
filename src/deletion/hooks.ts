import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useActorId, useAuth } from '../auth/context'
import { env } from '../config/env'
import {
  begin,
  accept,
  reject,
  confirmedRejection,
  useMarkers,
  type Marker,
} from './pending'
import { type Snapshot, newer, known, terminal } from './contract'
export const dkey = (actor: string, ...parts: string[]) => [
  'document-deletion',
  env.apiUrl,
  actor,
  ...parts,
]
// Informational clock only: never completes steps or grants business authority.
export function useLocalNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}
export function useRead<T>(
  part: string,
  fn: (signal: AbortSignal) => Promise<T>,
  enabled = true,
  poll = false,
) {
  const actor = useActorId()
  return useQuery({
    queryKey: dkey(actor ?? 'anonymous', part),
    queryFn: ({ signal }) => fn(signal),
    enabled: !!actor && enabled,
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: (query) => {
      if (!poll || query.state.error) return false
      if (Array.isArray(query.state.data))
        return query.state.data.some(
          (item: {
            nextReviewAt?: string
            watchUntil?: string
            status?: string
            incidentCode?: string
          }) =>
            item.incidentCode ||
            (item.nextReviewAt &&
              (!item.watchUntil || Date.parse(item.watchUntil) > Date.now())) ||
            ['OPEN', 'PENDING', 'ACKNOWLEDGED'].includes(item.status ?? ''),
        )
          ? 30000
          : false
      const s = query.state.data as Snapshot | undefined
      if (!s || !known(s) || !s.cleanupPolicy) return false
      return !terminal(s) ||
        s.incidentPending ||
        (s.surveillanceEndsAt &&
          Date.parse(s.surveillanceEndsAt) > Date.now()) ||
        s.blockingReason === 'RESTRICTIONS_UNDER_REVIEW'
        ? 30000
        : false
    },
    structuralSharing: (old, next) => {
      const a = old as Snapshot | undefined,
        b = next as Snapshot
      return b && typeof b.revision === 'number' ? newer(a, b) : next
    },
  })
}
export function useSend() {
  const { revalidate } = useAuth()
  const actor = useActorId(),
    client = useQueryClient(),
    markers = useMarkers()
  const [busy, setBusy] = useState(false)
  const [canRetry, setCanRetry] = useState(false)
  const alive = useRef(true)
  const lock = useRef(false)
  const retry = useRef<null | (() => Promise<Snapshot | undefined>)>(null)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      retry.current = null
    }
  }, [])
  const refresh = async () => {
    if (!alive.current) return
    await revalidate?.()
    if (!alive.current) return
    await client.cancelQueries()
    if (!alive.current) return
    client.removeQueries({
      predicate: (q) => q.queryKey[0] !== 'document-deletion',
    })
    await client.invalidateQueries({ queryKey: dkey(actor!) })
  }
  async function execute(
    m: Marker,
    fn: () => Promise<Snapshot | undefined>,
    replay = false,
  ) {
    if (lock.current) throw Error('En curso')
    lock.current = true
    setBusy(true)
    try {
      const result = await fn()
      accept(m, result?.id)
      retry.current = null
      if (alive.current) setCanRetry(false)
      await refresh()
      return result
    } catch (e) {
      if (!replay && confirmedRejection(e)) {
        reject(m)
        retry.current = null
        if (alive.current) setCanRetry(false)
        await refresh()
      }
      throw e
    } finally {
      lock.current = false
      if (alive.current) setBusy(false)
    }
  }
  return {
    busy,
    blocked:
      markers.unavailable ||
      markers.items.some((m) => m.actor === actor && !m.accepted),
    retry: () => retry.current?.(),
    canRetry,
    send: async (
      op: string,
      id: string | undefined,
      fn: (key: string) => Promise<Snapshot | undefined>,
    ) => {
      if (!actor || lock.current) throw Error('En curso')
      const m = begin(actor, op, id)
      const run = () => execute(m, () => fn(m.key), true)
      if (op === 'cancel') {
        retry.current = run
        setCanRetry(true)
      }
      return execute(m, () => fn(m.key))
    },
    refresh,
  }
}
