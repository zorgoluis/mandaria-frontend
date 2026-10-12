import { useEffect, useId, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { Field } from '../components/ui'
import { env } from '../config/env'
import { loadMaps, type PlacePrediction } from '../location/googleMaps'
import { validPosition, type SelectedLocation } from './location-selection'

export function AddressAutocomplete({
  label,
  selected,
  onSelect,
  onClear,
}: {
  label: 'Origen' | 'Destino'
  selected: SelectedLocation | null
  onSelect: (point: SelectedLocation) => void
  onClear: () => void
}) {
  const id = useId()
  const [text, setText] = useState('')
  const [options, setOptions] = useState<PlacePrediction[]>([])
  const [highlight, setHighlight] = useState(-1)
  const [message, setMessage] = useState('')
  const sequence = useRef(0)
  const session = useRef<object | null>(null)
  const active = useRef(true)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  useEffect(() => {
    sequence.current++
  }, [selected])
  useEffect(() => {
    if (selected || text.trim().length < 3 || !env.googleMapsApiKey) return
    const ticket = ++sequence.current
    let cancelled = false
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const sdk = await loadMaps(env.googleMapsApiKey)
          if (cancelled || !active.current || ticket !== sequence.current)
            return
          if (!sdk.importLibrary) throw new Error('Unavailable')
          const library = await sdk.importLibrary('places')
          if (!('AutocompleteSuggestion' in library))
            throw new Error('Unavailable')
          session.current ??= new library.AutocompleteSessionToken()
          const result =
            await library.AutocompleteSuggestion.fetchAutocompleteSuggestions({
              input: text.trim(),
              sessionToken: session.current,
              language: 'es',
              region: 'mx',
            })
          if (cancelled || !active.current || ticket !== sequence.current)
            return
          const predictions = result.suggestions.flatMap((s) =>
            s.placePrediction ? [s.placePrediction] : [],
          )
          setOptions(predictions)
          setHighlight(-1)
          setMessage(
            predictions.length
              ? 'Selecciona una dirección para confirmar el punto.'
              : 'No encontramos direcciones. Puedes elegir el punto en el mapa.',
          )
        } catch {
          if (!cancelled && active.current && ticket === sequence.current)
            setMessage(
              'No se pudo buscar la dirección. Usa el mapa o tu ubicación.',
            )
        }
      })()
    }, 350)
    return () => {
      clearTimeout(timer)
      cancelled = true
    }
  }, [text, selected])
  async function choose(prediction: PlacePrediction) {
    const ticket = ++sequence.current
    setOptions([])
    setMessage('Confirmando dirección…')
    try {
      const place = prediction.toPlace()
      await place.fetchFields({ fields: ['formattedAddress', 'location'] })
      if (!active.current || ticket !== sequence.current) return
      session.current = null
      if (!place.location) throw new Error('No location')
      const point = {
        lat: place.location.lat(),
        lng: place.location.lng(),
        label: place.formattedAddress || prediction.text.toString(),
      }
      if (!validPosition(point)) throw new Error('Invalid location')
      setText(point.label)
      setMessage('')
      onSelect(point)
    } catch {
      if (active.current && ticket === sequence.current)
        setMessage(
          'No pudimos confirmar ese punto. Elige otra dirección o usa el mapa.',
        )
    }
  }
  return (
    <div className="quote-autocomplete">
      <Field label={`Buscar dirección de ${label.toLowerCase()}`}>
        <Search className="quote-search-icon" size={18} aria-hidden="true" />
        <input
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={options.length > 0}
          aria-controls={id}
          aria-activedescendant={
            highlight >= 0 && options[highlight]
              ? `${id}-${highlight}`
              : undefined
          }
          placeholder={`Buscar dirección de ${label.toLowerCase()}: calle, número, colonia y ciudad`}
          autoComplete="off"
          maxLength={300}
          value={selected?.label ?? text}
          onChange={(e) => {
            sequence.current++
            setText(e.target.value)
            setOptions([])
            setHighlight(-1)
            setMessage('')
            onClear()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              sequence.current++
              setOptions([])
              setHighlight(-1)
              e.preventDefault()
            }
            if (
              (e.key === 'ArrowDown' || e.key === 'ArrowUp') &&
              options.length
            ) {
              e.preventDefault()
              setHighlight((i) =>
                e.key === 'ArrowDown'
                  ? (i + 1) % options.length
                  : i <= 0
                    ? options.length - 1
                    : i - 1,
              )
            }
            if (e.key === 'Enter') {
              e.preventDefault()
              if (highlight >= 0 && options[highlight])
                void choose(options[highlight])
            }
          }}
        />
      </Field>
      {!!options.length && (
        <>
          <ul
            id={id}
            role="listbox"
            aria-label={`Direcciones de ${label.toLowerCase()}`}
          >
            {options.map((p, i) => (
              <li
                role="option"
                id={`${id}-${i}`}
                aria-selected={highlight === i}
                key={i}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void choose(p)}
              >
                {p.text.toString()}
              </li>
            ))}
          </ul>
          <small className="quote-google-attribution" translate="no">
            Google Maps
          </small>
        </>
      )}
      {message && <small role="status">{message}</small>}
      {!env.googleMapsApiKey && (
        <small>
          La búsqueda no está configurada. Puedes usar tu ubicación.
        </small>
      )}
    </div>
  )
}
