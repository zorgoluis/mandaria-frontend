import { useEffect, useRef, useState } from 'react'
import { LocateFixed, MapPin, Search } from 'lucide-react'
import { Field } from '../components/ui'
import { env } from '../config/env'
import {
  loadMaps,
  onMapsFailure,
  type MapInstance,
} from '../location/googleMaps'

import { validPosition, type SelectedLocation } from './location-selection'

export function LocationPicker({
  label,
  value,
  onChange,
}: {
  label: 'Origen' | 'Destino'
  value: SelectedLocation | null
  onChange: (value: SelectedLocation | null) => void
}) {
  const [address, setAddress] = useState('')
  const [results, setResults] = useState<SelectedLocation[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const host = useRef<HTMLDivElement>(null)
  const map = useRef<MapInstance | null>(null)
  const active = useRef(true)
  const sequence = useRef(0)
  const working = useRef(false)
  const latest = useRef({ value, onChange })
  useEffect(() => {
    latest.current = { value, onChange }
  }, [value, onChange])
  useEffect(() => {
    active.current = true
    sequence.current++
    return () => {
      active.current = false
    }
  }, [])

  function select(point: SelectedLocation) {
    if (!active.current || !validPosition(point)) return
    sequence.current++
    working.current = false
    setBusy(false)
    setResults([])
    setAddress('')
    setMessage('')
    latest.current.onChange(point)
    map.current?.setCenter(point)
    map.current?.setZoom?.(17)
  }
  const selectRef = useRef(select)
  useEffect(() => {
    selectRef.current = select
  })

  useEffect(() => {
    if (!open || !env.googleMapsApiKey) return
    let live = true
    let cleanup = () => {}
    const element = host.current
    const unsubscribe = onMapsFailure(() => {
      if (live) {
        setMapStatus('error')
        cleanup()
      }
    })
    void loadMaps(env.googleMapsApiKey)
      .then((sdk) => {
        if (!live || !element) return
        const instance = new sdk.Map(element, {
          center: latest.current.value ?? { lat: 23.6, lng: -102.5 },
          zoom: latest.current.value ? 17 : 5,
          mapTypeId: 'roadmap',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: 'cooperative',
          keyboardShortcuts: true,
        })
        map.current = instance
        const point = new sdk.Circle({
          map: instance,
          center: latest.current.value ?? undefined,
          radius: 12,
          visible: !!latest.current.value,
          fillColor: '#12796a',
          fillOpacity: 0.85,
          strokeColor: '#fff',
          strokeWeight: 2,
          clickable: false,
        })
        const listener = instance.addListener?.('click', (event) => {
          if (event.latLng)
            selectRef.current({
              lat: event.latLng.lat(),
              lng: event.latLng.lng(),
              label: 'Punto seleccionado en el mapa',
            })
        })
        cleanup = () => {
          listener?.remove()
          point.setMap(null)
          point.unbindAll()
          sdk.event.clearInstanceListeners(point)
          sdk.event.clearInstanceListeners(instance)
          instance.unbindAll()
          map.current = null
          element.replaceChildren()
        }
        overlay.current = point
        setMapStatus('ready')
      })
      .catch(() => {
        if (live) {
          cleanup()
          setMapStatus('error')
        }
      })
    return () => {
      live = false
      unsubscribe()
      cleanup()
      overlay.current = null
    }
  }, [open])
  const overlay = useRef<{
    setOptions(options: Record<string, unknown>): void
  } | null>(null)
  useEffect(() => {
    overlay.current?.setOptions({
      center: value ?? undefined,
      visible: !!value,
    })
    if (value) {
      map.current?.setCenter(value)
      map.current?.setZoom?.(17)
    }
  }, [value])

  async function search() {
    if (!address.trim() || working.current) return
    const ticket = ++sequence.current
    working.current = true
    setBusy(true)
    setMessage('')
    setResults([])
    latest.current.onChange(null)
    try {
      const sdk = await loadMaps(env.googleMapsApiKey)
      if (!sdk.importLibrary) throw new Error('Unavailable')
      const { Geocoder } = await sdk.importLibrary('geocoding')
      const response = await new Geocoder().geocode({
        address: address.trim(),
        region: 'MX',
      })
      if (!active.current || ticket !== sequence.current) return
      const options = response.results
        .map((result) => ({
          label: result.formatted_address,
          lat: result.geometry.location.lat(),
          lng: result.geometry.location.lng(),
        }))
        .filter(validPosition)
      setResults(options)
      setMessage(
        options.length
          ? 'Selecciona una dirección para confirmar el punto.'
          : 'No encontramos esa dirección. Agrega calle, número y ciudad, o elige un punto en el mapa.',
      )
    } catch {
      if (active.current && ticket === sequence.current)
        setMessage(
          'No se pudo buscar la dirección. Revisa el texto o selecciona la ubicación en el mapa o desde tu dispositivo.',
        )
    } finally {
      if (active.current && ticket === sequence.current) {
        working.current = false
        setBusy(false)
      }
    }
  }
  function locate() {
    if (working.current) return
    if (!navigator.geolocation) {
      setMessage(
        'Este navegador no permite obtener tu ubicación. Busca una dirección o usa el mapa.',
      )
      return
    }
    const ticket = ++sequence.current
    working.current = true
    setBusy(true)
    setMessage('Obteniendo tu ubicación…')
    setResults([])
    latest.current.onChange(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!active.current || ticket !== sequence.current) return
        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: 'Ubicación actual del dispositivo',
        }
        if (validPosition(point)) {
          select(point)
          setMessage(
            `Precisión aproximada: ${Math.round(position.coords.accuracy)} m. Comprueba el punto antes de cotizar.`,
          )
        } else {
          working.current = false
          setBusy(false)
          setMessage('El dispositivo no devolvió una ubicación válida.')
        }
      },
      (error) => {
        if (!active.current || ticket !== sequence.current) return
        working.current = false
        setBusy(false)
        setMessage(
          error.code === 1
            ? 'Permiso de ubicación denegado. Puedes buscar una dirección o usar el mapa.'
            : 'No fue posible obtener tu ubicación. Intenta de nuevo o busca una dirección.',
        )
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    )
  }

  return (
    <fieldset className="customer-location-picker">
      <legend>
        <MapPin size={18} aria-hidden="true" />
        {label}
      </legend>
      <p>
        {label === 'Origen'
          ? '¿Dónde recogemos el envío?'
          : '¿Dónde lo entregamos?'}
      </p>
      <Field label={`Buscar dirección de ${label.toLowerCase()}`}>
        <input
          value={address}
          placeholder="Calle, número, colonia y ciudad"
          autoComplete="off"
          maxLength={300}
          onChange={(event) => {
            sequence.current++

            working.current = false
            setBusy(false)
            setAddress(event.target.value)
            setResults([])
            setMessage('')
            onChange(null)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void search()
            }
          }}
        />
      </Field>
      <div className="location-picker-actions">
        <button
          type="button"
          className="button secondary"
          disabled={busy || !address.trim() || !env.googleMapsApiKey}
          onClick={() => void search()}
        >
          <Search size={16} aria-hidden="true" />
          Buscar dirección
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={locate}
        >
          <LocateFixed size={16} aria-hidden="true" />
          Usar mi ubicación
        </button>
      </div>
      <p role="status">{message || (busy ? 'Buscando…' : '')}</p>
      {!!results.length && (
        <ul
          className="location-picker-results"
          aria-label={`Direcciones de ${label.toLowerCase()}`}
        >
          {results.map((point, index) => (
            <li key={index}>
              <button type="button" onClick={() => select(point)}>
                {point.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {env.googleMapsApiKey ? (
        <>
          {!open && (
            <button
              type="button"
              className="button secondary"
              onClick={() => setOpen(true)}
            >
              Elegir en el mapa
            </button>
          )}
          {open && (
            <>
              <p>
                Haz clic en el punto exacto o mueve el mapa con el teclado y
                confirma su centro.
              </p>
              {mapStatus !== 'ready' && (
                <p role="status">
                  {mapStatus === 'loading'
                    ? 'Cargando mapa…'
                    : 'Google Maps no está disponible. Puedes usar la ubicación de tu dispositivo.'}
                </p>
              )}
              <div
                ref={host}
                className="location-picker-map"
                aria-label={`Mapa de ${label.toLowerCase()}`}
                hidden={mapStatus === 'error'}
              />
              <button
                type="button"
                className="button secondary"
                disabled={mapStatus !== 'ready'}
                onClick={() => {
                  const center = map.current?.getCenter?.()
                  if (center)
                    select({
                      lat: center.lat(),
                      lng: center.lng(),
                      label: 'Punto seleccionado en el mapa',
                    })
                }}
              >
                Usar el centro del mapa
              </button>
            </>
          )}
        </>
      ) : (
        <p className="muted">
          La búsqueda y el mapa no están configurados en este entorno. Puedes
          usar tu ubicación actual.
        </p>
      )}
      <div className="location-picker-selection" aria-live="polite">
        <strong>
          {value
            ? `${label} seleccionado`
            : `Selecciona ${label.toLowerCase()} para continuar`}
        </strong>
        {value && (
          <>
            <p>{value.label}</p>
            <small>
              {value.lat.toFixed(6)}, {value.lng.toFixed(6)} · Revisa que
              corresponda al punto de{' '}
              {label === 'Origen' ? 'recogida' : 'entrega'}.
            </small>
          </>
        )}
      </div>
      <small className="muted">
        La búsqueda de direcciones y el mapa utilizan Google Maps. La ubicación
        del dispositivo se solicita sólo al pulsar el botón.
      </small>
    </fieldset>
  )
}
