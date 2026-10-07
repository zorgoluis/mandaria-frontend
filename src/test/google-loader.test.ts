import { afterEach, expect, it, vi } from 'vitest'
import { captureTrackingFragment } from '../location/fragment'
afterEach(() => {
  vi.useRealTimers()
  document
    .querySelectorAll('script[src*="maps.googleapis.com"]')
    .forEach((e) => e.remove())
  delete window.google
  delete window.mandariaMapsReady
  delete window.gm_authFailure
  history.replaceState(null, '', '/')
})
it('loads once, after fragment removal, without Mandaria data or headers', async () => {
  vi.resetModules()
  const { loadMaps } = await import('../location/googleMaps')
  history.replaceState(
    null,
    '',
    '/track#t=' + 'a'.repeat(22) + '.' + 'b'.repeat(43),
  )
  captureTrackingFragment()
  const promise = loadMaps('synthetic-key')
  expect(loadMaps('synthetic-key')).toBe(promise)
  const scripts = document.querySelectorAll<HTMLScriptElement>(
    'script[src*="maps.googleapis.com"]',
  )
  expect(scripts).toHaveLength(1)
  const script = scripts[0],
    url = new URL(script.src)
  expect(location.hash).toBe('')
  expect(script.referrerPolicy).toBe('origin')
  expect([...url.searchParams.keys()].sort()).toEqual([
    'auth_referrer_policy',
    'callback',
    'key',
    'language',
    'loading',
    'region',
    'v',
  ])
  expect(url.hash).toBe('')
  expect(url.search).not.toContain('Tracking')
  expect(url.search).not.toContain('bbbb')
  expect(localStorage.length).toBe(0)
  window.google = {
    maps: { Map: class {}, Circle: class {} },
  } as unknown as NonNullable<Window['google']>
  window.mandariaMapsReady?.()
  await promise
})
it('refuses loading while fragment exists', async () => {
  vi.resetModules()
  const { loadMaps } = await import('../location/googleMaps')
  history.replaceState(null, '', '/track#private')
  await expect(loadMaps('synthetic-key')).rejects.toThrow('Map unavailable')
  expect(
    document.querySelector('script[src*="maps.googleapis.com"]'),
  ).toBeNull()
})
it('times out once and late callback cannot recover or retry', async () => {
  vi.useFakeTimers()
  vi.resetModules()
  const { loadMaps, onMapsFailure } = await import('../location/googleMaps')
  const fail = vi.fn()
  onMapsFailure(fail)
  const p = loadMaps('synthetic-key')
  const rejected = expect(p).rejects.toThrow('Map unavailable')
  await vi.advanceTimersByTimeAsync(15001)
  await rejected
  window.mandariaMapsReady?.()
  expect(fail).toHaveBeenCalledTimes(1)
  await expect(loadMaps('synthetic-key')).rejects.toThrow('Map unavailable')
  await expect(p).rejects.toThrow()
  expect(
    document.querySelectorAll('script[src*="maps.googleapis.com"]'),
  ).toHaveLength(1)
})

it('authentication failure after load blocks later consumers without another script', async () => {
  vi.resetModules()
  const { loadMaps, onMapsFailure } = await import('../location/googleMaps')
  const p = loadMaps('synthetic-key')
  window.google = {
    maps: { Map: class {}, Circle: class {} },
  } as unknown as NonNullable<Window['google']>
  window.mandariaMapsReady?.()
  await p
  const fail = vi.fn()
  onMapsFailure(fail)
  window.gm_authFailure?.()
  expect(fail).toHaveBeenCalledTimes(1)
  await expect(loadMaps('synthetic-key')).rejects.toThrow('Map unavailable')
  expect(
    document.querySelectorAll('script[src*="maps.googleapis.com"]'),
  ).toHaveLength(1)
})
