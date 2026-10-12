import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Minus, Plus } from 'lucide-react'
import { ActionForm, Field } from '../components/ui'
import { LocationPicker } from './LocationPicker'
import { validPosition, type SelectedLocation } from './location-selection'
import {
  packageCategories,
  type PackageCategory,
} from '../delivery-requests/types'
import { categoryLabels } from '../delivery-requests/format'
import type { DirectPrequoteDto } from './contract'
import type { Capabilities } from './service'
import './quote.css'

export function QuoteForm({
  capabilities,
  initial,
  onSubmit,
}: {
  initial?: {
    conditions: DirectPrequoteDto['conditions']
    payer?: 'REQUESTER' | 'RECIPIENT'
    addresses: string[]
  }
  capabilities: Capabilities
  onSubmit: (
    conditions: DirectPrequoteDto['conditions'],
    payer: 'REQUESTER' | 'RECIPIENT',
  ) => Promise<void>
}) {
  const point = (index: number): SelectedLocation | null => {
    const stop = initial?.conditions.stops[index]
    return stop
      ? {
          lat: stop.latitude,
          lng: stop.longitude,
          label:
            initial?.addresses[index] ||
            (index === 0 ? 'Origen cotizado' : 'Destino cotizado'),
        }
      : null
  }
  const [origin, setOrigin] = useState<SelectedLocation | null>(() => point(0))
  const [destination, setDestination] = useState<SelectedLocation | null>(() =>
    point(1),
  )
  const [category, setCategory] = useState<PackageCategory>(
    initial?.conditions.packages[0]?.category ?? 'FOOD',
  )
  const [quantity, setQuantity] = useState(
    String(initial?.conditions.packages[0]?.quantity ?? 1),
  )
  const [weight, setWeight] = useState(
    initial?.conditions.packages[0]?.weightKg?.toString() ?? '',
  )
  const [fragile, setFragile] = useState(
    initial?.conditions.packages[0]?.isFragile ?? false,
  )
  const [selectedPayer, setPayer] = useState<'REQUESTER' | 'RECIPIENT'>(
    initial?.payer ?? capabilities.defaultShippingPayer,
  )
  const payer = capabilities.allowedShippingPayers.includes(selectedPayer)
    ? selectedPayer
    : capabilities.allowedShippingPayers[0]
  const ready =
    !!origin &&
    !!destination &&
    validPosition(origin) &&
    validPosition(destination) &&
    !!payer
  return (
    <section className="quote-page" aria-labelledby="quote-title">
      <header className="quote-header">
        <div>
          <Link className="quote-back" to="/customer">
            <ArrowLeft size={16} aria-hidden="true" />
            Volver
          </Link>
          <h1 id="quote-title">Cotizar envío</h1>
          <p>
            Servicio local inmediato. El precio se confirma al cotizar y no
            reserva repartidor ni cupo.
          </p>
        </div>
        <ol className="quote-steps" aria-label="Pasos del envío">
          {['Cotizar', 'Detalles', 'Confirmar'].map((step, i) => (
            <li key={step} aria-current={i === 0 ? 'step' : undefined}>
              <span>{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </header>
      <ActionForm
        initialDirty
        submitLabel="Obtener precotización"
        submitDisabled={!ready}
        onSubmit={async () => {
          if (!ready || !origin || !destination || !payer) return
          await onSubmit(
            {
              conditionsVersion: 1,
              serviceType: 'LOCAL_DELIVERY',
              stops: [
                {
                  type: 'PICKUP',
                  sequence: 1,
                  latitude: Number(origin.lat.toFixed(6)),
                  longitude: Number(origin.lng.toFixed(6)),
                },
                {
                  type: 'DROPOFF',
                  sequence: 2,
                  latitude: Number(destination.lat.toFixed(6)),
                  longitude: Number(destination.lng.toFixed(6)),
                },
              ],
              packages: [
                {
                  category,
                  quantity: Number(quantity),
                  isFragile: fragile,
                  ...(weight ? { weightKg: Number(weight) } : {}),
                },
              ],
            },
            payer,
          )
        }}
        submitPlacement={(controls) => (
          <aside
            className="quote-card quote-summary"
            aria-label="Resumen de cotización"
          >
            <h2>Resumen</h2>
            <div className="quote-mini-route">
              {[
                ['Origen', origin],
                ['Destino', destination],
              ].map(([label, point]) => (
                <div key={String(label)}>
                  <span>{String(label)}</span>
                  <strong className={!point ? 'unselected' : ''}>
                    {typeof point === 'object' && point
                      ? point.label
                      : 'Sin seleccionar'}
                  </strong>
                </div>
              ))}
            </div>
            <dl>
              <div>
                <dt>Categoría</dt>
                <dd>{categoryLabels[category]}</dd>
              </div>
              <div>
                <dt>Cantidad</dt>
                <dd>{quantity || '—'}</dd>
              </div>
              <div>
                <dt>Frágil</dt>
                <dd>{fragile ? 'Sí' : 'No'}</dd>
              </div>
              <div>
                <dt>Pagador</dt>
                <dd>
                  {payer === 'REQUESTER'
                    ? 'Solicitante'
                    : payer === 'RECIPIENT'
                      ? 'Destinatario'
                      : 'No disponible'}
                </dd>
              </div>
            </dl>
            {controls}
            <p className="quote-disclaimer">
              El precio no reserva repartidor ni cupo.
            </p>
          </aside>
        )}
      >
        <div className="quote-left">
          <section
            className="quote-card quote-route"
            aria-labelledby="route-title"
          >
            <h2 className="quote-kicker" id="route-title">
              Ruta
            </h2>
            <div className="quote-timeline">
              <LocationPicker
                autocomplete
                label="Origen"
                value={origin}
                onChange={setOrigin}
              />
              <LocationPicker
                autocomplete
                label="Destino"
                value={destination}
                onChange={setDestination}
              />
            </div>
            <p className="quote-note">
              La búsqueda de direcciones y el mapa utilizan Google Maps. La
              ubicación del dispositivo se solicita sólo al pulsar el botón.
            </p>
          </section>
          <section
            className="quote-card quote-package"
            aria-labelledby="package-title"
          >
            <h2 className="quote-kicker" id="package-title">
              Paquete
            </h2>
            <fieldset className="quote-choice">
              <legend>Categoría</legend>
              <div
                role="radiogroup"
                aria-label="Categoría"
                className="quote-chips"
              >
                {packageCategories.map((c) => (
                  <label key={c}>
                    <input
                      type="radio"
                      name="category"
                      value={c}
                      checked={category === c}
                      onChange={() => setCategory(c)}
                    />
                    <span>{categoryLabels[c]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="quote-numbers">
              <Field label="Cantidad">
                <div className="quote-quantity">
                  <button
                    type="button"
                    aria-label="Reducir cantidad"
                    disabled={Number(quantity) <= 1}
                    onClick={() =>
                      setQuantity(String(Math.max(1, Number(quantity) - 1)))
                    }
                  >
                    <Minus size={18} aria-hidden="true" />
                  </button>
                  <input
                    aria-label="Cantidad"
                    name="quantity"
                    type="number"
                    min={1}
                    max={10000}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label="Aumentar cantidad"
                    disabled={Number(quantity) >= 10000}
                    onClick={() =>
                      setQuantity(String(Math.min(10000, Number(quantity) + 1)))
                    }
                  >
                    <Plus size={18} aria-hidden="true" />
                  </button>
                </div>
              </Field>
              <Field label="Peso en kg (opcional)">
                <span className="quote-weight">
                  <input
                    aria-label="Peso en kg (opcional)"
                    name="weight"
                    type="number"
                    min="0.001"
                    step="0.001"
                    placeholder="0.0"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                  <span>kg</span>
                </span>
              </Field>
            </div>
            <label className="quote-fragile">
              <span>
                <strong>Frágil</strong>
                <small>Indica al repartidor que manipule con cuidado.</small>
              </span>
              <input
                aria-label="Frágil"
                role="switch"
                aria-checked={fragile}
                type="checkbox"
                name="fragile"
                checked={fragile}
                onChange={(e) => setFragile(e.target.checked)}
              />
              <span className="quote-toggle" aria-hidden="true" />
            </label>
            <fieldset className="quote-choice">
              <legend>Pagador del envío</legend>
              <div
                role="radiogroup"
                aria-label="Pagador del envío"
                className="quote-segments"
              >
                {capabilities.allowedShippingPayers.map((p) => (
                  <label key={p}>
                    <input
                      type="radio"
                      name="payer"
                      value={p}
                      checked={payer === p}
                      onChange={() => setPayer(p)}
                    />
                    <span>
                      {p === 'REQUESTER' ? 'Solicitante' : 'Destinatario'}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </section>
        </div>
      </ActionForm>
    </section>
  )
}
