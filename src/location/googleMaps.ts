/** Minimal Maps surface, shared by tracking and customer location selection. */
export interface MapInstance {
  setCenter(position: Position): void
  setZoom?(zoom: number): void
  getCenter?(): { lat(): number; lng(): number } | undefined
  addListener?(
    event: 'click',
    callback: (event: {
      latLng?: { lat(): number; lng(): number } | null
    }) => void,
  ): { remove(): void }
  unbindAll(): void
}
export interface Position {
  lat: number
  lng: number
}
export interface CircleInstance {
  setOptions(options: Record<string, unknown>): void
  setMap(map: MapInstance | null): void
  unbindAll(): void
}
export interface MapsSdk {
  importLibrary?(name: 'geocoding'): Promise<GeocodingLibrary>
  Map: new (
    element: HTMLElement,
    options: Record<string, unknown>,
  ) => MapInstance
  Circle: new (options: Record<string, unknown>) => CircleInstance
  event: { clearInstanceListeners(instance: object): void }
}
export interface GeocodingLibrary {
  Geocoder: new () => {
    geocode(request: { address: string; region: string }): Promise<{
      results: {
        formatted_address: string
        geometry: { location: { lat(): number; lng(): number } }
      }[]
    }>
  }
}
declare global {
  interface Window {
    google?: { maps: MapsSdk }
    mandariaMapsReady?: () => void
    gm_authFailure?: () => void
  }
}
let loading: Promise<MapsSdk> | undefined
let failed = false
const failures = new Set<() => void>()
export function onMapsFailure(listener: () => void) {
  failures.add(listener)
  if (failed) listener()
  return () => {
    failures.delete(listener)
  }
}
/** Single attempt per document, including failure; never feed Mandaria data to the loader. */
export function loadMaps(key: string): Promise<MapsSdk> {
  if (!key || window.location.hash || failed)
    return Promise.reject(new Error('Map unavailable'))
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    const fail = () => {
      failed = true
      clearTimeout(timer)
      failures.forEach((listener) => listener())
      reject(new Error('Map unavailable'))
    }
    const timer = setTimeout(fail, 15000)
    window.gm_authFailure = fail
    window.mandariaMapsReady = () => {
      clearTimeout(timer)
      if (failed) return
      const sdk = window.google?.maps
      if (!sdk?.Map || !sdk.Circle) {
        fail()
        return
      }
      resolve(sdk)
    }
    const url = new URL('https://maps.googleapis.com/maps/api/js')
    url.search = new URLSearchParams({
      key,
      v: 'quarterly',
      loading: 'async',
      callback: 'mandariaMapsReady',
      auth_referrer_policy: 'origin',
      language: 'es',
      region: 'MX',
    }).toString()
    script.src = url.toString()
    script.async = true
    script.referrerPolicy = 'origin'
    script.onerror = fail
    document.head.append(script)
  })
  return loading
}
