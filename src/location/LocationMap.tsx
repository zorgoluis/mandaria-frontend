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
  presentation = 'embedded',
}: {
  sample: Sample
  stale: boolean
  presentation?: 'embedded' | 'public'
}) {
  const host = useRef<HTMLDivElement>(null)
  const latest = useRef({ sample, stale, presentation })
  const movement = useRef(0)
  const pulseFrame = useRef(0)
  const displayed = useRef<{ lat: number; lng: number } | null>(null)
  const instance = useRef<{
    sdk: MapsSdk
    map: MapInstance
    point: CircleInstance
    accuracy: CircleInstance
    pulse?: CircleInstance
  } | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    env.googleMapsApiKey ? 'loading' : 'error',
  )
  function update() {
    const current = instance.current
    if (!current) return
    const { sample: s, stale: old } = latest.current
    const center = { lat: s.latitude, lng: s.longitude }
    const publicMap = latest.current.presentation === 'public'
    const color = publicMap
      ? old
        ? '#8a9894'
        : '#156b5c'
      : old
        ? '#936214'
        : '#087f73'
    const radius = publicMap
      ? (8 * 156543.03392 * Math.cos((s.latitude * Math.PI) / 180)) /
        2 ** (current.map.getZoom?.() ?? 16)
      : 3
    if (!publicMap || !current.map.getBounds?.()?.contains(center))
      current.map.setCenter(center)
    cancelAnimationFrame(movement.current)
    const paint = (position: { lat: number; lng: number }) => {
      displayed.current = position
      current.point.setOptions({
        center: position,
        radius,
        fillColor: color,
        strokeColor: '#ffffff',
      })
      current.accuracy.setOptions({
        center: position,
        radius: s.accuracyMeters,
        strokeColor: color,
        fillColor: color,
      })
      current.pulse?.setOptions({ center: position })
    }
    const from = displayed.current
    const reduced = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (
      publicMap &&
      from &&
      !old &&
      !reduced &&
      (from.lat !== center.lat || from.lng !== center.lng)
    ) {
      let start: number | undefined
      const animate = (time: number) => {
        start ??= time
        const t = Math.min(1, Math.max(0, (time - start) / 300))
        paint({
          lat: from.lat + (center.lat - from.lat) * t,
          lng: from.lng + (center.lng - from.lng) * t,
        })
        if (t < 1) movement.current = requestAnimationFrame(animate)
      }
      movement.current = requestAnimationFrame(animate)
    } else paint(center)
    cancelAnimationFrame(pulseFrame.current)
    if (current.pulse) {
      current.pulse.setOptions({ fillOpacity: 0, strokeOpacity: 0 })
      if (!old && !reduced) {
        const pulse = (time: number) => {
          const t = (time % 2000) / 2000
          current.pulse?.setOptions({
            radius: radius * (1 + 1.2 * t),
            fillOpacity: 0.35 * (1 - t),
          })
          pulseFrame.current = requestAnimationFrame(pulse)
        }
        pulseFrame.current = requestAnimationFrame(pulse)
      }
    }
  }

  useLayoutEffect(() => {
    latest.current = { sample, stale, presentation }
    update()
  }, [sample, stale, presentation])
  useEffect(() => {
    if (!env.googleMapsApiKey) return
    let active = true
    const element = host.current
    const clear = () => {
      cancelAnimationFrame(movement.current)
      cancelAnimationFrame(pulseFrame.current)
      displayed.current = null
      const current = instance.current
      if (current) {
        for (const overlay of [
          current.point,
          current.accuracy,
          ...(current.pulse ? [current.pulse] : []),
        ]) {
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
          fullscreenControl: latest.current.presentation === 'public',
          zoomControl: true,
          ...(latest.current.presentation === 'public'
            ? {
                styles: [{ stylers: [{ saturation: -65 }] }],
                zoomControlOptions: {
                  position: sdk.ControlPosition?.RIGHT_BOTTOM,
                },
                fullscreenControlOptions: {
                  position: sdk.ControlPosition?.RIGHT_BOTTOM,
                },
              }
            : {}),
          clickableIcons: false,
          gestureHandling: 'cooperative',
          keyboardShortcuts: true,
        })
        const accuracy = new sdk.Circle({
          map,
          clickable: false,
          fillOpacity: latest.current.presentation === 'public' ? 0.18 : 0.12,
          strokeOpacity: 0.6,
          strokeWeight: 1.5,
        })
        const point = new sdk.Circle({
          map,
          clickable: false,
          radius: 3,
          fillOpacity: 1,
          strokeWeight: latest.current.presentation === 'public' ? 3 : 2,
          zIndex: 2,
        })
        const pulse =
          latest.current.presentation === 'public'
            ? new sdk.Circle({
                map,
                clickable: false,
                fillColor: '#156b5c',
                fillOpacity: 0,
                strokeOpacity: 0,
                zIndex: 1,
              })
            : undefined
        instance.current = { sdk, map, point, accuracy, pulse }
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
      {presentation !== 'public' && (
        <p className="muted">
          Mapa de Google · Punto: última posición. Círculo: precisión
          aproximada. {stale ? 'Señal desactualizada.' : 'Señal reciente.'}
        </p>
      )}
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
        aria-label={
          presentation === 'public'
            ? 'Mapa con la última posición del envío'
            : 'Mapa de la última posición autorizada'
        }
      />
    </div>
  )
}
