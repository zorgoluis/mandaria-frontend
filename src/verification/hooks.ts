import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useFeedback } from '../components/feedback-context'
import { ApiError } from '../services/errors'
import { message } from './format'
import { useAuth } from '../auth/context'
import { runVerification, useMarkers } from './pending'
import type { Operation } from './types'
export function useCommand() {
  const { user } = useAuth()
  const client = useQueryClient()
  const notify = useFeedback()
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const markers = useMarkers()
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ['verification', user?.id] })
    await client.refetchQueries(
      { queryKey: ['verification', user?.id], type: 'active', stale: true },
      { throwOnError: true },
    )
    await client.invalidateQueries({ queryKey: ['driver-portal'] })
  }
  return {
    busy,
    blocked: markers.unavailable || markers.items.length > 0,
    refresh,
    send: async <O extends Operation>(
      operation: O,
      target: string,
      path: string,
      body: unknown,
      method = 'POST',
    ) => {
      if (!user || lock.current)
        throw new Error('La operación ya está en curso.')
      lock.current = true
      setBusy(true)
      try {
        return await runVerification(
          user.id,
          operation,
          target,
          path,
          body,
          refresh,
          method,
        )
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) notify(message(e), true)
        throw e
      } finally {
        lock.current = false
        setBusy(false)
      }
    },
  }
}
