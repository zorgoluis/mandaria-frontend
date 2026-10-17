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
import { type Snapshot, newer } from './contract'
export const dkey = (actor: string, ...parts: string[]) => [
  'document-deletion',
  env.apiUrl,
  actor,
  ...parts,
]
export function useRead<T>(
  part: string,
  fn: (signal: AbortSignal) => Promise<T>,
  enabled = true,
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
