import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { env } from '../config/env'
import {
  loadMaps,
  onMapsFailure,
  type MapsSdk,
  type MapInstance,
  type CircleInstance,
} from './googleMaps'
import type { LocationView } from './types'
type Sample = NonNullable<LocationView['location']['sample']>
export function LocationMap({
  sample,
  stale,
}: {
  sample: Sample
  stale: boolean
}) {
  const host = useRef<HTMLDivElement>(null)
  const latest = useRef({ sample, stale })
  const instance = useRef<{
    sdk: MapsSdk
    map: MapInstance
    point: CircleInstance
    accuracy: CircleInstance
  } | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    env.googleMapsApiKey ? 'loading' : 'error',
  )
  function update() {
    const current = instance.current
    if (!current) return
    const { sample: s, stale: old } = latest.current
    const center = { lat: s.latitude, lng: s.longitude }
    const color = old ? '#936214' : '#087f73'
    current.map.setCenter(center)
    current.point.setOptions({
      center,
      fillColor: color,
      strokeColor: '#ffffff',
    })
    current.accuracy.setOptions({
      center,
      radius: s.accuracyMeters,
      strokeColor: color,
      fillColor: color,
    })
  }
  useLayoutEffect(() => {
    latest.current = { sample, stale }
    update()
  }, [sample, stale])
  useEffect(() => {
    if (!env.googleMapsApiKey) return
    let active = true
    const element = host.current
    const clear = () => {
      const current = instance.current
      if (current) {
        for (const overlay of [current.point, current.accuracy]) {
          overlay.setMap(null)
          overlay.unbindAll()
          current.sdk.event.clearInstanceListeners(overlay)
        }
        current.sdk.event.clearInstanceListeners(current.map)
        current.map.unbindAll()
        instance.current = null
      }
      element?.replaceChildren()
    }
    const fail = () => {
      if (active) {
        clear()
        setStatus('error')
      }
    }
    const unsubscribe = onMapsFailure(fail)
    void loadMaps(env.googleMapsApiKey).then((sdk) => {
      if (!active || !element) return
      try {
        const s = latest.current.sample
        const map = new sdk.Map(element, {
          center: { lat: s.latitude, lng: s.longitude },
          zoom: 16,
          mapTypeId: 'roadmap',
          renderingType: 'RASTER',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: 'cooperative',
          keyboardShortcuts: true,
        })
        const accuracy = new sdk.Circle({
          map,
          clickable: false,
          fillOpacity: 0.12,
          strokeOpacity: 0.6,
          strokeWeight: 1,
        })
        const point = new sdk.Circle({
          map,
          clickable: false,
          radius: 3,
          fillOpacity: 1,
          strokeWeight: 2,
          zIndex: 2,
        })
        instance.current = { sdk, map, point, accuracy }
        update()
        setStatus('ready')
      } catch {
        fail()
      }
    }, fail)
    return () => {
      active = false
      unsubscribe()
      clear()
    }
  }, [])
  return (
    <div className="location-map-panel">
      <p className="muted">
        Mapa de Google · Punto: última posición. Círculo: precisión aproximada.{' '}
        {stale ? 'Señal desactualizada.' : 'Señal reciente.'}
      </p>
      {status !== 'ready' && (
        <p role="status">
          {status === 'loading'
            ? 'Cargando mapa…'
            : 'Mapa no disponible. El seguimiento textual sigue disponible.'}
        </p>
      )}
      <div
        ref={host}
        className="location-map"
        hidden={status === 'error'}
        aria-label="Mapa de la última posición autorizada"
      />
    </div>
  )
}
