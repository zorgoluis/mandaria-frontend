import { useState } from 'react'
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
export function CaseForm({ record }: { record: VerificationCase }) {
  const command = useCommand()
  const [license, setLicense] = useState(!!record.data.license)
  const [ownership, setOwnership] = useState<Ownership>(
    record.data.ownershipEvidenceType || 'OWNED',
  )
  const identity = record.subjectType === 'DRIVER_IDENTITY'
  return (
    <section className="panel panel-body">
      <h2>Datos del borrador</h2>
      <Form
        label="Guardar datos"
        disabled={command.blocked || command.busy}
        onSubmit={async (d) => {
          const data: IdentityData | UnitData = identity
            ? {
                fullName: text(d, 'fullName'),
                contactPhone: text(d, 'contactPhone'),
                operatingCity: text(d, 'operatingCity'),
                documentType: 'INE',
                ...(license
                  ? {
                      license: {
                        issuer: text(d, 'issuer'),
                        category: text(d, 'category'),
                        expiresAt: utc(text(d, 'expiresAt')),
                        vehicleTypes: motorTypes.filter((t) =>
                          d.getAll('vehicleTypes').includes(t),
                        ),
                      },
                    }
                  : {}),
              }
            : {
                declaredOwnerName: text(d, 'declaredOwnerName'),
                serialNumber: text(d, 'serialNumber'),
                ownershipEvidenceType: ownership,
                ...(text(d, 'authorizationExpiresAt')
                  ? {
                      authorizationExpiresAt: utc(
                        text(d, 'authorizationExpiresAt'),
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
                required
                maxLength={150}
                defaultValue={record.data.fullName}
              />
            </Field>
            <Field label="Teléfono de contacto *">
              <input
                name="contactPhone"
                required
                minLength={5}
                maxLength={30}
                defaultValue={record.data.contactPhone}
              />
            </Field>
            <Field label="Ciudad de operación *">
              <input
                name="operatingCity"
                required
                maxLength={150}
                defaultValue={record.data.operatingCity}
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
                onChange={(e) => setLicense(e.target.checked)}
              />
              Declarar licencia del conductor (necesaria para tipos motorizados)
            </label>
            {license && (
              <fieldset>
                <legend>Licencia personal</legend>
                <Field label="Emisor *">
                  <input
                    name="issuer"
                    required
                    maxLength={150}
                    defaultValue={record.data.license?.issuer}
                  />
                </Field>
                <Field label="Categoría *">
                  <input
                    name="category"
                    required
                    maxLength={150}
                    defaultValue={record.data.license?.category}
                  />
                </Field>
                <Field label="Vencimiento, hora local *">
                  <input
                    name="expiresAt"
                    type="datetime-local"
                    required
                    defaultValue={local(record.data.license?.expiresAt)}
                  />
                </Field>
                <p>
                  Se envía el instante UTC. Sin equivalencias jurídicas
                  automáticas ni gracia.
                </p>
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
                required
                maxLength={150}
                defaultValue={record.data.declaredOwnerName}
              />
            </Field>
            <Field label="Número de serie *">
              <input
                name="serialNumber"
                required
                maxLength={150}
                defaultValue={record.data.serialNumber}
              />
            </Field>
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
            <Field label="Vencimiento de autorización, hora local (opcional)">
              <input
                name="authorizationExpiresAt"
                type="datetime-local"
                defaultValue={local(record.data.authorizationExpiresAt)}
              />
            </Field>
            <p>
              Tarjeta de circulación y{' '}
              {
                labels[
                  ownership === 'OWNED'
                    ? 'OWNERSHIP_PROOF'
                    : ownership === 'RENTED'
                      ? 'RENTAL_CONTRACT'
                      : 'OWNER_AUTHORIZATION'
                ]
              }
              . En flotilla la unidad no necesita pertenecer al conductor.
            </p>
          </>
        )}
      </Form>
    </section>
  )
}
export function NewUnit() {
  const command = useCommand()
  const [done, setDone] = useState(false)
  return (
    <details className="panel panel-body">
      <summary>Registrar unidad independiente</summary>
      <Form
        label="Crear unidad pendiente"
        disabled={command.blocked || command.busy}
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
