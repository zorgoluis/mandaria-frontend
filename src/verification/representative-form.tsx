import { useState } from 'react'
import { Field } from '../components/ui'
import { Form } from './common'
import { useCommand } from './hooks'
import type { RepresentativeData, VerificationCase } from './types'

const local = (value?: string) =>
  value
    ? new Date(
        new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16)
    : ''
const text = (d: FormData, name: string) => String(d.get(name) || '').trim()
export function RepresentativeForm({
  record,
  disabled,
}: {
  record: VerificationCase
  disabled: boolean
}) {
  const command = useCommand()
  const [capacity, setCapacity] = useState<RepresentativeData['capacity']>(
    record.data.capacity || 'SELF',
  )
  const available = record.attachments
    .filter(
      (a) =>
        a.category === 'REPRESENTATION_AUTHORITY_PAGE' &&
        a.status === 'VALIDATED',
    )
    .map((a) => a.id)
  const [pages, setPages] = useState([
    ...new Set([
      ...(record.data.authorityPages || []).filter((id) =>
        available.includes(id),
      ),
      ...available,
    ]),
  ])
  const move = (index: number, delta: number) => {
    const next = [...pages]
    ;[next[index], next[index + delta]] = [next[index + delta], next[index]]
    setPages(next)
  }
  return (
    <section className="panel panel-body">
      <h2>Identidad y facultades declaradas</h2>
      <p>
        Guarda los datos antes de cargar. Después de añadir páginas, revisa y
        guarda su orden. Un nombramiento suficiente no requiere otro poder.
      </p>
      <Form
        label="Guardar representación"
        disabled={disabled || command.blocked || command.busy}
        onSubmit={async (d) => {
          if (capacity === 'SELF' && available.length)
            throw new Error(
              'La actuación por derecho propio no admite páginas de poderes. Revisa las referencias del borrador.',
            )
          const data: RepresentativeData = {
            fullName: text(d, 'fullName'),
            representedName:
              capacity === 'SELF'
                ? text(d, 'fullName')
                : text(d, 'representedName'),
            capacity,
            representedPersonType:
              capacity === 'SELF'
                ? 'NATURAL_PERSON'
                : (text(
                    d,
                    'representedPersonType',
                  ) as RepresentativeData['representedPersonType']),
            declarationCurrent: true,
            identityValidUntil: new Date(
              text(d, 'identityValidUntil'),
            ).toISOString(),
            authorityValidFrom: new Date(
              text(d, 'authorityValidFrom'),
            ).toISOString(),
            ...(text(d, 'authorityValidUntil')
              ? {
                  authorityValidUntil: new Date(
                    text(d, 'authorityValidUntil'),
                  ).toISOString(),
                }
              : {}),
            limits: text(d, 'limits'),
            jointSignatureRequired:
              capacity !== 'SELF' && d.get('jointSignatureRequired') === 'on',
            authorityPages: capacity === 'SELF' ? [] : pages,
          }
          if (d.get('declarationCurrent') !== 'on')
            throw new Error('Confirma la declaración de vigencia.')
          if (
            data.authorityValidUntil &&
            Date.parse(data.authorityValidUntil) <=
              Date.parse(data.authorityValidFrom)
          )
            throw new Error(
              'El vencimiento debe ser posterior al inicio de vigencia.',
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
        <Field label="Forma de actuación">
          <select
            value={capacity}
            onChange={(e) =>
              setCapacity(e.target.value as RepresentativeData['capacity'])
            }
          >
            <option value="SELF">
              Titular persona física por derecho propio
            </option>
            <option value="APPOINTMENT">Representante por nombramiento</option>
            <option value="POWER">Representante por poder</option>
          </select>
        </Field>
        <Field label="Nombre completo de quien comparece">
          <input
            name="fullName"
            required
            maxLength={150}
            defaultValue={record.data.fullName}
            autoComplete="off"
          />
        </Field>
        {capacity === 'SELF' ? (
          <p>
            La persona representada es el mismo titular persona física. No se
            solicita sociedad ni poder de sí mismo.
          </p>
        ) : (
          <>
            <Field label="Tipo de persona representada">
              <select
                name="representedPersonType"
                defaultValue={
                  record.data.representedPersonType || 'LEGAL_PERSON'
                }
              >
                <option value="NATURAL_PERSON">Persona física</option>
                <option value="LEGAL_PERSON">Persona moral</option>
              </select>
            </Field>
            <Field label="Nombre del titular o razón social">
              <input
                name="representedName"
                required
                maxLength={150}
                defaultValue={record.data.representedName}
                autoComplete="off"
              />
            </Field>
          </>
        )}
        <Field label="Vencimiento de INE, hora local">
          <input
            type="datetime-local"
            name="identityValidUntil"
            required
            defaultValue={local(record.data.identityValidUntil)}
          />
        </Field>
        <Field label="Inicio de vigencia declarado, hora local">
          <input
            type="datetime-local"
            name="authorityValidFrom"
            required
            defaultValue={local(record.data.authorityValidFrom)}
          />
        </Field>
        <Field label="Vencimiento de facultades, si tienen límite">
          <input
            type="datetime-local"
            name="authorityValidUntil"
            defaultValue={local(record.data.authorityValidUntil)}
          />
        </Field>
        <p>
          Las fechas se envían como instantes UTC. Su declaración no sustituye
          la revisión documental.
        </p>
        <Field label="Límites de la actuación">
          <textarea
            name="limits"
            maxLength={2000}
            defaultValue={record.data.limits}
          />
        </Field>
        {capacity !== 'SELF' && (
          <>
            <label className="verification-check">
              <input
                name="jointSignatureRequired"
                type="checkbox"
                defaultChecked={record.data.jointSignatureRequired}
              />
              Se requiere firma conjunta
            </label>
            <p>
              Una firma conjunta pendiente no admite aprobación o aceptación
              individual. Se necesita revisión y, si se rechaza, un expediente
              corregido.
            </p>
            <h3>Orden de las páginas de facultades</h3>
            {!pages.length && (
              <p>
                Añade las páginas indispensables de nombramiento o poder;
                después guarda su orden.
              </p>
            )}
            <ol>
              {pages.map((id, index) => (
                <li key={id}>
                  Página {index + 1} · <span className="mono">{id}</span>{' '}
                  <button
                    type="button"
                    disabled={disabled || index === 0}
                    aria-label={'Subir página ' + (index + 1)}
                    onClick={() => move(index, -1)}
                  >
                    Subir
                  </button>{' '}
                  <button
                    type="button"
                    disabled={disabled || index === pages.length - 1}
                    aria-label={'Bajar página ' + (index + 1)}
                    onClick={() => move(index, 1)}
                  >
                    Bajar
                  </button>
                </li>
              ))}
            </ol>
          </>
        )}
        <label className="verification-check">
          <input name="declarationCurrent" type="checkbox" required />
          Declaro vigente la información y, cuando corresponde, las facultades
          declaradas.
        </label>
      </Form>
    </section>
  )
}
