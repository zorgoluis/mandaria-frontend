import { useRef, useState } from 'react'
import { Field } from '../components/ui'
import { vehicleTypes } from '../logistics/types'
import { labels as operationalLabels } from '../utils/format'
import { Form } from './common'
import { labels } from './format'
import { useCommand } from './hooks'
import {
  motorTypes,
  type VerificationCase,
  type IdentityData,
  type UnitData,
  type Ownership,
} from './types'
const text = (d: FormData, k: string) => String(d.get(k) || '').trim()
const utc = (s: string) => new Date(s).toISOString()
const local = (s?: string) =>
  s
    ? new Date(new Date(s).getTime() - new Date(s).getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : ''
export function CaseForm({
  record,
  disabled = false,
  designed = false,
}: {
  designed?: boolean
  record: VerificationCase
  disabled?: boolean
}) {
  const original = useRef<string | null>(null)
  const [validChange, setValidChange] = useState(false)
  const command = useCommand()
  const [license, setLicense] = useState(!!record.data.license)
  const [ownership, setOwnership] = useState<Ownership>(
    record.data.ownershipEvidenceType || 'OWNED',
  )
  const identity = record.subjectType === 'DRIVER_IDENTITY'
  return (
    <section
      className={'panel panel-body' + (designed ? ' identity-draft' : '')}
      id={designed ? 'datos-expediente' : undefined}
      tabIndex={designed ? -1 : undefined}
      ref={(node) => {
        const form = node?.querySelector('form')
        if (form && original.current === null)
          original.current = JSON.stringify([...new FormData(form).entries()])
      }}
      onChange={(e) => {
        const form = (e.target as HTMLElement).closest('form')
        if (form)
          setValidChange(
            form.checkValidity() &&
              JSON.stringify([...new FormData(form).entries()]) !==
                original.current,
          )
      }}
    >
      <h2>
        {designed && <span className="documentary-step">1</span>}Datos del
        borrador
      </h2>
      <Form
        label="Guardar datos"
        disabled={
          disabled ||
          command.blocked ||
          command.busy ||
          (designed && !validChange)
        }
        onSubmit={async (d) => {
          const data: IdentityData | UnitData = identity
            ? {
                fullName: text(d, 'fullName'),
                contactPhone: text(d, 'contactPhone'),
                documentType: 'INE',
                ...(license
                  ? {
                      license: {
                        category: text(d, 'category'),
                        expiresAt:
                          text(d, 'expiresAt') ===
                          local(record.data.license?.expiresAt).slice(0, 10)
                            ? record.data.license!.expiresAt
                            : utc(text(d, 'expiresAt') + 'T23:59:59.999'),
                        vehicleTypes: motorTypes.filter((t) =>
                          d.getAll('vehicleTypes').includes(t),
                        ),
                      },
                    }
                  : {}),
              }
            : {
                declaredOwnerName: text(d, 'declaredOwnerName'),
                serialNumber: text(d, 'serialNumber')
                  .replace(/\s/g, '')
                  .toUpperCase(),
                ownershipEvidenceType: ownership,
                ...(text(d, 'authorizationExpiresAt')
                  ? {
                      authorizationExpiresAt:
                        text(d, 'authorizationExpiresAt') ===
                        local(record.data.authorizationExpiresAt).slice(0, 10)
                          ? record.data.authorizationExpiresAt!
                          : utc(
                              text(d, 'authorizationExpiresAt') +
                                'T23:59:59.999',
                            ),
                    }
                  : {}),
              }
          if (
            identity &&
            license &&
            !(data as IdentityData).license?.vehicleTypes.length
          )
            throw new Error(
              'Selecciona al menos un tipo motorizado de la licencia.',
            )
          if (!identity && !(data as UnitData).serialNumber)
            throw new Error('Indica un número de serie válido.')
          await command.send(
            'UPDATE_CASE',
            record.id,
            '/verification-cases/' + record.id,
            { expectedVersion: record.revision, data },
            'PATCH',
          )
        }}
      >
        {identity ? (
          <>
            <Field label="Nombre completo *">
              <input
                name="fullName"
                placeholder="Como aparece en tu INE"
                required
                maxLength={150}
                defaultValue={record.data.fullName}
              />
            </Field>
            <Field label="Teléfono de contacto *">
              <input
                name="contactPhone"
                inputMode="tel"
                placeholder="10 dígitos"
                required
                minLength={5}
                maxLength={30}
                defaultValue={record.data.contactPhone}
              />
            </Field>
            <p>
              Identificación: INE. La fotografía de rostro y ambos lados se
              cargan por separado.
            </p>
            <label className="verification-check">
              <input
                type="checkbox"
                checked={license}
                onChange={(e) => {
                  setLicense(e.target.checked)
                  if (e.target.checked) setValidChange(false)
                }}
              />
              Declarar licencia del conductor (necesaria para tipos motorizados)
            </label>
            {license && (
              <fieldset>
                <legend>Licencia personal</legend>
                <Field label="Categoría *">
                  <input
                    name="category"
                    required
                    maxLength={150}
                    defaultValue={record.data.license?.category}
                  />
                </Field>
                <Field label="Fecha de vencimiento *">
                  <input
                    name="expiresAt"
                    type="date"
                    required
                    defaultValue={local(record.data.license?.expiresAt).slice(
                      0,
                      10,
                    )}
                  />
                </Field>
                <p>El vencimiento se registra al final de la fecha elegida.</p>
                {motorTypes.map((t) => (
                  <label className="verification-check" key={t}>
                    <input
                      name="vehicleTypes"
                      type="checkbox"
                      value={t}
                      defaultChecked={record.data.license?.vehicleTypes.includes(
                        t,
                      )}
                    />
                    {operationalLabels[t] || t}
                  </label>
                ))}
              </fieldset>
            )}
          </>
        ) : (
          <>
            <Field label="Nombre del titular declarado *">
              <input
                name="declaredOwnerName"
                placeholder="Como aparece en la tarjeta de circulación"
                required
                maxLength={150}
                defaultValue={record.data.declaredOwnerName}
              />
            </Field>
            <Field label="Número de serie *">
              <input
                name="serialNumber"
                placeholder="VIN o número de serie"
                required
                maxLength={150}
                defaultValue={record.data.serialNumber}
              />
            </Field>
            {designed ? (
              <fieldset className="field unit-ownership-field">
                <legend>
                  Propiedad o uso autorizado <span aria-hidden="true">*</span>
                </legend>
                <div
                  role="radiogroup"
                  aria-label="Propiedad o uso autorizado"
                  className="unit-ownership"
                >
                  {(['OWNED', 'RENTED', 'BORROWED'] as const).map((v) => (
                    <label key={v}>
                      <input
                        type="radio"
                        name="ownershipEvidenceType"
                        value={v}
                        checked={ownership === v}
                        onChange={() => setOwnership(v)}
                      />
                      {labels[v]}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : (
              <Field label="Propiedad o uso autorizado *">
                <select
                  value={ownership}
                  onChange={(e) => setOwnership(e.target.value as Ownership)}
                >
                  {(['OWNED', 'RENTED', 'BORROWED'] as const).map((v) => (
                    <option key={v} value={v}>
                      {labels[v]}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field
              hint={
                ownership !== 'OWNED'
                  ? 'Indica hasta cuándo puedes usar esta unidad. Recomendado.'
                  : undefined
              }
              label="Vencimiento de autorización (opcional)"
            >
              <input
                name="authorizationExpiresAt"
                type="date"
                defaultValue={local(record.data.authorizationExpiresAt).slice(
                  0,
                  10,
                )}
              />
            </Field>
            <p>
              {record.registrationCardRequired === false
                ? 'Bicicleta: no requiere tarjeta de circulación.'
                : 'Tarjeta de circulación.'}
              {ownership === 'RENTED'
                ? ' ' + labels.RENTAL_CONTRACT + '.'
                : ownership === 'BORROWED'
                  ? ' ' + labels.OWNER_AUTHORIZATION + '.'
                  : ''}{' '}
              En flotilla la unidad no necesita pertenecer al conductor.
            </p>
          </>
        )}
      </Form>
    </section>
  )
}
export function NewUnit({ disabled = false }: { disabled?: boolean }) {
  const command = useCommand()
  const [done, setDone] = useState(false)
  return (
    <details className="panel panel-body">
      <summary>Registrar unidad independiente</summary>
      <Form
        label="Crear unidad pendiente"
        disabled={disabled || command.blocked || command.busy}
        onSubmit={async (d) => {
          await command.send(
            'CREATE_VEHICLE',
            'SELF',
            '/driver/onboarding/vehicles',
            {
              identifier: text(d, 'identifier'),
              type: text(d, 'type'),
              ...Object.fromEntries(
                ['brand', 'model', 'color', 'plate']
                  .filter((k) => text(d, k))
                  .map((k) => [k, text(d, k)]),
              ),
              ...(text(d, 'year') ? { year: Number(text(d, 'year')) } : {}),
            },
          )
          setDone(true)
        }}
      >
        <Field label="Identificador *">
          <input
            name="identifier"
            required
            pattern="[A-Za-z0-9][A-Za-z0-9_-]{0,29}"
            maxLength={30}
          />
        </Field>
        <Field label="Tipo *">
          <select name="type">
            {vehicleTypes.map((t) => (
              <option key={t} value={t}>
                {operationalLabels[t] || t}
              </option>
            ))}
          </select>
        </Field>
        {[
          ['brand', 'Marca', 50],
          ['model', 'Modelo', 50],
          ['color', 'Color', 30],
          ['plate', 'Placa', 15],
        ].map(([name, label, max]) => (
          <Field key={name} label={String(label)}>
            <input name={String(name)} maxLength={Number(max)} />
          </Field>
        ))}
        <Field label="Año">
          <input name="year" type="number" min={1900} max={2100} />
        </Field>
        <p>
          Se crea INACTIVE; requiere expediente propio. OTHER necesita
          clasificación. Placa no obligatoria en el alta; el backend verifica
          requisitos al revisar.
        </p>
      </Form>
      {done && (
        <p role="status">
          Unidad creada. Selecciónala para preparar su expediente.
        </p>
      )}
    </details>
  )
}
