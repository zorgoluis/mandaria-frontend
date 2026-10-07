import { useEffect, useState } from 'react'
import { ApiError } from '../services/errors'
import { LocationSequence, terminalLocation, withoutSample } from './snapshot'
import type { LocationView } from './types'
const isHidden = () => document.visibilityState === 'hidden'
export function pollDelay(
  failures: number,
  retryAfterMs = 0,
  random = Math.random(),
) {
  return Math.max(
    retryAfterMs,
    Math.min(300_000, 15_000 * 2 ** Math.min(failures, 5)) * (1 + random * 0.2),
  )
}
/** One observed detail, one request in flight. Coordinates live only in component memory. */
export function useLocationPoll(
  read: (signal: AbortSignal) => Promise<LocationView>,
  stop = false,
) {
  const [view, setView] = useState<LocationView>()
  const [error, setError] = useState<unknown>()
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    let active = true,
      busy = false,
      failures = 0,
      terminal = stop,
      blocked = false
    let snapshot: LocationView | undefined
    const sequence = new LocationSequence()
    let nextAt = 0
    let controller: AbortController | undefined
    let timer: ReturnType<typeof setTimeout>
    function schedule(delay: number) {
      clearTimeout(timer)
      timer = setTimeout(() => void run(), delay)
    }
    async function run() {
      if (!active || busy || terminal || blocked || isHidden()) return
      if (Date.now() < nextAt) {
        schedule(nextAt - Date.now())
        return
      }
      busy = true
      controller = new AbortController()
      try {
        const incoming = await read(controller.signal)
        if (!active) return
        snapshot = sequence.accept(incoming)
        terminal = terminalLocation(snapshot)
        if (terminal || isHidden()) {
          sequence.erase()
          snapshot = withoutSample(snapshot)
        }
        setView(snapshot)
        setError(undefined)
        failures = 0
        nextAt = Date.now() + pollDelay(0)
      } catch (e) {
        if (!active) return
        if (snapshot) {
          sequence.erase()
          snapshot = withoutSample(snapshot)
          setView(snapshot)
        }
        setError(e)
        failures++
        blocked = e instanceof ApiError && [401, 403, 404].includes(e.status)
        nextAt =
          Date.now() +
          pollDelay(failures, e instanceof ApiError ? e.retryAfterMs : 0)
      } finally {
        busy = false
        if (active && !terminal && !blocked)
          schedule(Math.max(0, nextAt - Date.now()))
      }
    }
    const visibility = () => {
      setNow(Date.now())
      if (isHidden()) {
        clearTimeout(timer)
        if (snapshot) {
          sequence.erase()
          snapshot = withoutSample(snapshot)
          setView(snapshot)
        }
      } else {
        // Revalidate on return without bypassing a backoff/Retry-After budget.
        if (!failures) nextAt = 0
        void run()
      }
    }
    document.addEventListener('visibilitychange', visibility)
    const clock = setInterval(() => {
      const time = Date.now()
      setNow(time)
      if (
        snapshot?.location.sample &&
        time >= Date.parse(snapshot.location.sample.eraseAfter)
      ) {
        sequence.erase()
        snapshot = withoutSample(snapshot, 'EXPIRED_SAMPLE')
        setView(snapshot)
      }
    }, 1000)
    void run()
    return () => {
      active = false
      controller?.abort()
      clearTimeout(timer)
      clearInterval(clock)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [read, stop])
  return { view: stop && view ? withoutSample(view) : view, error, now }
}
