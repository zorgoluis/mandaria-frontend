import { useEffect, useId, useRef, useState } from 'react'
import { Field } from '../components/ui'
import { env } from '../config/env'
import { loadMaps } from '../location/googleMaps'
import { validPosition } from './location-selection'

/** A suggestion only: the conversion always keeps the server's original coordinates. */
export function SuggestedAddress({
  label,
  name,
  latitude,
  longitude,
  onValueChange,
  error,
}: {
  label: string
  name: string
  latitude?: number
  longitude?: number
  onValueChange?: (value: string) => void
  error?: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const edited = useRef(false)
  const notify = useRef(onValueChange)
  useEffect(() => {
    notify.current = onValueChange
  }, [onValueChange])
  const hint = useId()
  const available =
    !!env.googleMapsApiKey &&
    latitude !== undefined &&
    longitude !== undefined &&
    validPosition({ lat: latitude, lng: longitude })
  const [message, setMessage] = useState(
    available
      ? 'Buscando dirección del punto seleccionado… Puedes escribir mientras tanto.'
      : 'Escribe la dirección del punto seleccionado.',
  )
  useEffect(() => {
    if (!available || latitude === undefined || longitude === undefined) return
    let active = true
    const fail = () => {
      if (!active) return
      active = false
      setMessage(
        'No se pudo sugerir una dirección. Puedes escribirla manualmente.',
      )
    }
    const timer = setTimeout(fail, 15000)
    void (async () => {
      try {
        const sdk = await loadMaps(env.googleMapsApiKey)
        if (!active) return
        if (!sdk.importLibrary) throw new Error('Unavailable')
        const library = await sdk.importLibrary('geocoding')
        if (!('Geocoder' in library)) throw new Error('Unavailable')
        const { Geocoder } = library
        if (!active) return
        const response = await new Geocoder().geocode({
          location: { lat: latitude, lng: longitude },
        })
        if (!active) return
        const address = response.results
          .find((r) => r.formatted_address.trim())
          ?.formatted_address.trim()
        if (!address || address.length > 300) {
          fail()
          return
        }
        if (input.current && !edited.current && input.current.value === '') {
          input.current.value = address
          notify.current?.(address)
          setMessage(
            'Dirección sugerida por Google. Revísala y completa número o interior.',
          )
        } else {
          setMessage('Se conservó la dirección que escribiste.')
        }
      } catch {
        fail()
      } finally {
        clearTimeout(timer)
      }
    })()
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [available, latitude, longitude])
  return (
    <Field label={label}>
      <input
        ref={input}
        name={name}
        required
        maxLength={300}
        aria-describedby={`${hint}${error ? ` ${hint}-error` : ''}`}
        aria-invalid={!!error}
        onChange={(e) => {
          edited.current = true
          notify.current?.(e.target.value)
        }}
      />
      {error && (
        <small id={`${hint}-error`} className="conversion-error">
          {error}
        </small>
      )}
      <small id={hint} role="status">
        {message} Editar este texto no cambia las coordenadas cotizadas.
      </small>
    </Field>
  )
}
