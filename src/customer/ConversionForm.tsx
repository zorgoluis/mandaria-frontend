import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Check, Info } from 'lucide-react'
import { ActionForm, Field } from '../components/ui'
import { ApiError } from '../services/errors'
import { date } from '../utils/format'
import { OriginContact } from './OriginContact'
import { SuggestedAddress } from './SuggestedAddress'
import {
  conversionErrors,
  quoteExpired,
  type ConversionValues,
} from './conversion-form'
import type { DirectPrequoteResponse } from './contract'
import './quote.css'
import './conversion.css'

export function ConversionForm({
  quote: p,
  onSubmit,
  onBack,
}: {
  quote: DirectPrequoteResponse
  onSubmit: (data: FormData) => Promise<void>
  onBack: (addresses: string[]) => void
}) {
  const [entered, setValues] = useState<ConversionValues>({
    mode: 'PREPAID',
    capacity: 'REQUESTER',
  })
  // An absent payer value follows origin; even an empty edit overrides the suggestion.
  const values: ConversionValues = {
    ...entered,
    payerName: entered.payerName ?? entered.name0 ?? '',
    payerPhone: entered.payerPhone ?? entered.phone0 ?? '',
  }
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const update = useCallback(
    (key: string, value: string) =>
      setValues((old) => (old[key] === value ? old : { ...old, [key]: value })),
    [],
  )
  const originName = useCallback(
    (value: string) => update('name0', value),
    [update],
  )
  const originPhone = useCallback(
    (value: string) => update('phone0', value),
    [update],
  )
  const errors = conversionErrors(values, p)
  const error = (key: string) => (touched[key] ? errors[key] : undefined)
  const expired = quoteExpired(p, now)
  const requester = p.shippingTerms?.payer === 'REQUESTER'
  const back = () => onBack([values.address0 ?? '', values.address1 ?? ''])
  const field = (
    name: string,
    label: string,
    placeholder: string,
    phone = false,
  ) => (
    <Field label={label}>
      <input
        name={name}
        value={values[name] ?? ''}
        onChange={(e) => update(name, e.target.value)}
        required
        maxLength={phone ? 30 : name === 'description' ? 500 : 100}
        type={phone ? 'tel' : 'text'}
        inputMode={phone ? 'tel' : 'text'}
        placeholder={placeholder}
        aria-invalid={!!error(name)}
        aria-describedby={error(name) ? `${name}-error` : undefined}
      />
      {error(name) && (
        <small className="conversion-error" id={`${name}-error`}>
          {error(name)}
        </small>
      )}
    </Field>
  )
  const segments = (
    name: string,
    label: string,
    options: [string, string][],
  ) => (
    <fieldset className="quote-choice">
      <legend>{label}</legend>
      <div role="radiogroup" aria-label={label} className="quote-segments">
        {options.map(([key, text]) => (
          <label key={key}>
            <input
              name={name}
              type="radio"
              required
              value={key}
              checked={values[name] === key}
              onChange={() => update(name, key)}
            />
            <span>{text}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
  return (
    <section
      className="quote-page conversion-page"
      aria-label="Detalles de la solicitud"
    >
      <header className="quote-header">
        <div>
          <button
            type="button"
            className="quote-back conversion-back"
            onClick={back}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Volver a la cotización
          </button>
          <h1>{p.publicId}</h1>
          <div className="conversion-tags">
            <span>Vigencia: {date(p.expiresAt)}</span>
            <span>No reserva disponibilidad</span>
          </div>
        </div>
        <ol className="quote-steps" aria-label="Pasos del envío">
          <li className="completed">
            <span>
              <Check size={15} aria-hidden="true" />
            </span>
            Cotizar
          </li>
          <li aria-current="step">
            <span>2</span>Detalles
          </li>
          <li>
            <span>3</span>Confirmar
          </li>
        </ol>
      </header>
      <p className="conversion-required-note">* Campos obligatorios.</p>
      <div
        onBlurCapture={(e) => {
          const target = e.target
          if (target instanceof HTMLInputElement && target.name)
            setTouched((old) => ({ ...old, [target.name]: true }))
        }}
      >
        <ActionForm
          initialDirty
          submitLabel="Crear solicitud y revisar términos"
          submitDisabled={expired || Object.keys(errors).length > 0}
          onSubmit={async (data) => {
            if (quoteExpired(p, Date.now()))
              throw new ApiError(
                409,
                'La precotización venció. Vuelve a cotizar antes de crear la solicitud.',
              )
            const snapshot = Object.fromEntries(
              [...data.entries()].map(([k, v]) => [k, String(v)]),
            )
            const invalid = conversionErrors(snapshot, p)
            if (Object.keys(invalid).length) {
              setTouched(
                Object.fromEntries(
                  Object.keys(invalid).map((key) => [key, true]),
                ),
              )
              throw new ApiError(400, 'Revisa los campos indicados.')
            }
            await onSubmit(data)
          }}
          submitPlacement={(controls) => (
            <aside
              className="conversion-sidebar"
              aria-label="Resumen de la solicitud"
            >
              <section
                className="conversion-price"
                aria-label="Precio cotizado"
              >
                <span>Total cotizado</span>
                <div>
                  <strong>${p.amount}</strong> <b>{p.currency}</b>
                </div>
                <p>Vigente hasta {date(p.expiresAt)}</p>
                {expired && (
                  <div className="conversion-expired" role="alert">
                    La precotización ha vencido.
                    <button type="button" onClick={back}>
                      Volver a cotizar
                    </button>
                  </div>
                )}
              </section>
              <section className="quote-card quote-summary conversion-summary">
                <h2>Resumen</h2>
                <div className="quote-mini-route">
                  {['Origen', 'Destino'].map((label, i) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>
                        {values[`address${i}`] || 'Completa la dirección'}
                      </strong>
                    </div>
                  ))}
                </div>
                <dl>
                  <div>
                    <dt>Pago de mercancía</dt>
                    <dd>
                      {values.mode === 'PREPAID'
                        ? 'Mercancía prepagada'
                        : 'Adelanto por repartidor'}
                    </dd>
                  </div>
                  {requester && (
                    <div>
                      <dt>Presente en recogida</dt>
                      <dd>
                        {values.capacity === 'REQUESTER'
                          ? 'Solicitante'
                          : 'Representante autorizado'}
                      </dd>
                    </div>
                  )}
                </dl>
                {controls}
                <p className="quote-disclaimer">
                  Revisarás los términos antes de confirmar.
                </p>
              </section>
            </aside>
          )}
        >
          <div className="quote-left">
            {['Origen', 'Destino'].map((label, i) => (
              <section
                className="quote-card conversion-card"
                key={label}
                aria-labelledby={`conversion-${i}`}
              >
                <h2 id={`conversion-${i}`} className="conversion-stop-title">
                  <span
                    className={i === 0 ? 'origin' : 'destination'}
                    aria-hidden="true"
                  />
                  {label}
                </h2>
                <SuggestedAddress
                  key={`${p.publicId}:${i}:${p.conditions.stops[i]?.latitude}:${p.conditions.stops[i]?.longitude}`}
                  label={`Dirección de ${label.toLowerCase()}`}
                  name={`address${i}`}
                  latitude={p.conditions.stops[i]?.latitude}
                  longitude={p.conditions.stops[i]?.longitude}
                  onValueChange={(value) => update(`address${i}`, value)}
                  error={error(`address${i}`)}
                />
                <div className="conversion-row">
                  {i === 0 ? (
                    <OriginContact
                      onNameChange={originName}
                      onPhoneChange={originPhone}
                      nameError={error('name0')}
                      phoneError={error('phone0')}
                      showRestore
                    />
                  ) : (
                    <>
                      {field(
                        'name1',
                        'Contacto de destino',
                        'Nombre de quien recibe',
                      )}
                      {field(
                        'phone1',
                        'Teléfono de destino',
                        '10 dígitos',
                        true,
                      )}
                    </>
                  )}
                </div>
              </section>
            ))}
            <section
              className="quote-card conversion-card"
              aria-labelledby="goods-title"
            >
              <h2 id="goods-title">Paquete y mercancía</h2>
              {field(
                'description',
                'Descripción del paquete',
                'Ej. Caja con 2 pasteles',
              )}
              <div className="conversion-row conversion-goods">
                {segments('mode', 'Pago de mercancía', [
                  ['PREPAID', 'Mercancía prepagada'],
                  ['COURIER_ADVANCE', 'Adelanto por repartidor'],
                ])}
                <Field label="Valor de mercancía en MXN">
                  <span className="conversion-money">
                    <span>$</span>
                    <input
                      name="goodsValue"
                      aria-label="Valor de mercancía en MXN"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={values.goodsValue ?? ''}
                      onChange={(e) => update('goodsValue', e.target.value)}
                      required={values.mode === 'COURIER_ADVANCE'}
                      aria-invalid={!!error('goodsValue')}
                      aria-describedby={
                        error('goodsValue') ? 'goodsValue-error' : undefined
                      }
                    />
                    <span>MXN</span>
                  </span>
                  {error('goodsValue') && (
                    <small className="conversion-error" id="goodsValue-error">
                      {error('goodsValue')}
                    </small>
                  )}
                </Field>
              </div>
              <p className="conversion-info">
                <Info size={20} aria-hidden="true" />
                <span>
                  El adelanto exige valor de mercancía positivo. Mercancía
                  prepagada no significa envío pagado.
                </span>
              </p>
            </section>
            {requester && (
              <section
                className="quote-card conversion-card"
                aria-labelledby="payer-title"
              >
                <div>
                  <h2 id="payer-title">
                    Persona que pagará el envío en recogida
                  </h2>
                  <p className="conversion-subtitle">
                    Puede ser distinta del contacto de origen.
                  </p>
                </div>
                <div className="conversion-row">
                  {field('payerName', 'Nombre del pagador', 'Nombre completo')}
                  {field(
                    'payerPhone',
                    'Teléfono del pagador',
                    '10 dígitos',
                    true,
                  )}
                </div>
                {segments('capacity', 'Quién estará presente', [
                  ['REQUESTER', 'Solicitante'],
                  ['AUTHORIZED_REPRESENTATIVE', 'Representante autorizado'],
                ])}
              </section>
            )}
          </div>
        </ActionForm>
      </div>
    </section>
  )
}
