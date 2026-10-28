import {
  labels,
  rows,
  references,
  validate,
  variant,
  type Options,
} from './form-model'
import { useState } from 'react'
import { Field } from '../components/ui'
import { commandSchemas, type CommandBodies } from './contract'
import type { CaseDetail, Schema } from './types'
import { economicTerms, hash, noObligationsTerms } from './hashes'
import { useCommands } from './command-context'
import { assistanceError } from './messages'
import type { ReferenceCatalog } from './admin-references'
import { bindReferences, referenceOptions } from './admin-reference-bindings'
function Fields({
  schema,
  value,
  onChange,
  options,
  skip = [],
}: {
  schema: Schema
  value: Record<string, unknown>
  onChange: (v: Record<string, unknown>) => void
  options: Options
  skip?: string[]
}) {
  return (
    <>
      {Object.entries(schema.properties ?? {})
        .filter(([k]) => !skip.includes(k))
        .map(([k, raw]) => {
          const s = variant(raw),
            v = value[k],
            required = schema.required?.includes(k) ?? false,
            label = labels[k] ?? k
          const change = (next: unknown) => {
            const copy = { ...value }
            if (next === undefined) delete copy[k]
            else copy[k] = next
            onChange(copy)
          }
          if (s.const !== undefined)
            return (
              <p key={k}>
                {label}: {s.const}
              </p>
            )
          if (s.type === 'object')
            return (
              <fieldset key={k}>
                <legend>{label}</legend>
                <Fields
                  schema={s}
                  value={(v ?? {}) as Record<string, unknown>}
                  onChange={change}
                  options={options}
                />
              </fieldset>
            )
          if (s.type === 'array' && s.items?.type === 'object')
            return (
              <fieldset key={k}>
                <legend>{label}</legend>
                {((v ?? []) as Record<string, unknown>[]).map((r, i) => (
                  <div key={i}>
                    <Fields
                      schema={s.items!}
                      value={r}
                      onChange={(next) =>
                        change(
                          (v as Record<string, unknown>[]).map((a, j) =>
                            i === j ? next : a,
                          ),
                        )
                      }
                      options={options}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        change((v as unknown[]).filter((_, j) => j !== i))
                      }
                    >
                      Quitar asignación
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => change([...(Array.isArray(v) ? v : []), {}])}
                >
                  Agregar asignación
                </button>
              </fieldset>
            )
          const opts =
            options[k] ??
            s.enum?.map((x) => ({ value: x, label: x })) ??
            (s.type === 'array'
              ? s.items?.enum?.map((x) => ({ value: x, label: x }))
              : undefined) ??
            options[k]
          if (opts)
            return (
              <Field key={k} label={label}>
                <select
                  multiple={s.type === 'array'}
                  required={required && s.type !== 'array'}
                  value={
                    s.type === 'array'
                      ? Array.isArray(v)
                        ? (v as string[])
                        : []
                      : String(v ?? '')
                  }
                  onChange={(e) =>
                    change(
                      s.type === 'array'
                        ? Array.from(e.target.selectedOptions, (x) => x.value)
                        : e.target.value || undefined,
                    )
                  }
                >
                  {s.type !== 'array' && <option value="">Seleccionar</option>}
                  {opts.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {opts.length === 0 && (
                  <small>
                    No hay referencias autorizadas disponibles. Carga las
                    páginas del expediente.
                  </small>
                )}
              </Field>
            )
          if (
            s.format === 'uuid' ||
            /Hash$|Revision$/.test(k) ||
            ['contactSourceRef', 'participationId', 'newSessionId'].includes(
              k,
            ) ||
            s.type === 'array'
          )
            return (
              <p key={k} role="note">
                {label}: falta una referencia autorizada
                {required ? ' (necesaria para continuar)' : ''}.
              </p>
            )
          return (
            <Field key={k} label={label}>
              {['text', 'reason', 'description'].includes(k) ? (
                <textarea
                  required={required}
                  minLength={s.minLength}
                  maxLength={s.maxLength}
                  value={String(v ?? '')}
                  onChange={(e) => change(e.target.value)}
                />
              ) : (
                <input
                  required={required}
                  type={
                    s.format === 'date-time'
                      ? 'datetime-local'
                      : s.type === 'integer'
                        ? 'number'
                        : 'text'
                  }
                  step={s.format === 'date-time' ? '1' : undefined}
                  minLength={s.minLength}
                  maxLength={s.maxLength}
                  pattern={s.format === 'date-time' ? undefined : s.pattern}
                  value={
                    s.format === 'date-time' && v
                      ? String(v).slice(0, 19)
                      : String(v ?? '')
                  }
                  onChange={(e) =>
                    change(
                      !e.target.value
                        ? undefined
                        : s.format === 'date-time'
                          ? new Date(e.target.value + 'Z').toISOString()
                          : s.type === 'integer'
                            ? Number(e.target.value)
                            : e.target.value,
                    )
                  }
                />
              )}{' '}
              {s.format === 'date-time' && (
                <small>Fecha en UTC. Registro del servidor separado.</small>
              )}
            </Field>
          )
        })}
    </>
  )
}
function defaults(s: Schema): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(s.properties ?? {}).flatMap(([k, v]) =>
      v.const !== undefined
        ? [[k, v.const]]
        : v.type === 'array'
          ? [[k, []]]
          : v.default !== undefined
            ? [[k, v.default]]
            : [],
    ),
  )
}
export function CommandForm({
  operation,
  detail,
  admin,
  extraOptions = {},
  assignmentId,
  administrativeReferences,
}: {
  operation: keyof CommandBodies
  detail?: CaseDetail
  admin: boolean
  extraOptions?: Options
  assignmentId?: string
  administrativeReferences?: ReferenceCatalog
}) {
  const commands = useCommands(),
    [kind, setKind] = useState('VERIFY_NO_OBLIGATIONS'),
    [value, setValue] = useState<Record<string, unknown>>(() =>
      defaults(commandSchemas[operation]),
    ),
    [error, setError] = useState(''),
    [terms, setTerms] = useState<Record<string, unknown>>({
      proofSource: 'NEW_ACTION',
      incidentIdsToResolve: [],
    }),
    [preview, setPreview] = useState<Record<string, unknown> | null>(null)
  const schema =
    operation === 'PROPOSE'
      ? commandSchemas.PROPOSE.oneOf!.find(
          (s) => s.properties?.type.const === kind,
        )!
      : commandSchemas[operation]
  const options = { ...(detail ? references(detail) : {}), ...extraOptions }
  if (detail) {
    // Historical references already returned to this administrator; never infer
    // the original user/provider from their current affiliation.
    if (admin) {
      options.userId = rows(detail, 'parties')
        .filter((p) => p.kind === 'DRIVER' && typeof p.userId === 'string')
        .map((p) => ({
          value: String(p.userId),
          label: String(p.label ?? 'Conductor histórico'),
        }))
      options.providerId = rows(detail, 'parties')
        .filter(
          (p) => p.kind === 'PROVIDER' && typeof p.providerId === 'string',
        )
        .map((p) => ({
          value: String(p.providerId),
          label: String(p.label ?? 'Proveedor histórico'),
        }))
      options.participationId = [
        ...new Set(
          rows(detail, 'obligations')
            .map((o) => o.participationId)
            .filter((id): id is string => typeof id === 'string'),
        ),
      ].map((id, index) => ({
        value: id,
        label: `Participación documentada en obligaciones ${index + 1}`,
      }))
    }
    if (!admin)
      options.obligationId = detail.economics.map((o) => ({
        value: o.obligationId,
        label: o.concept,
      }))
    const targetType =
      (value.payload as Record<string, unknown> | undefined)?.targetType ??
      value.targetType
    options.targetId =
      targetType === 'CASE'
        ? [{ value: detail.summary.id, label: 'Este caso' }]
        : (options[targetType === 'MOVEMENT' ? 'movementId' : 'obligationId'] ??
          [])
    options.replacementId = options.targetId
  }
  const skipped = [
    'expectedCaseRevision',
    'expectedExecutionRevision',
    'caseId',
    'assignmentId',
    'physicalMovementId',
    'termsHash',
  ]
  if (!admin)
    skipped.push('partyId', 'evidenceIds', 'movementId', 'reversesMovementId')
  if (operation === 'REGISTER_PARTY') {
    skipped.push('contactSourceRef')
    if (value.kind !== 'DRIVER') skipped.push('userId')
    if (value.kind !== 'PROVIDER') skipped.push('providerId')
  }
  if (operation === 'RECORD_OBLIGATION' && value.knowledge === 'UNKNOWN')
    skipped.push('expectedAmount')
  if (administrativeReferences && detail)
    Object.assign(
      options,
      referenceOptions(
        administrativeReferences,
        value,
        detail,
        commands.evidenceParties,
      ),
    )
  const shipping =
    operation === 'DECLARE_MOVEMENT' &&
    value.sourceKind === 'SHIPPING_DECLARATION' &&
    administrativeReferences
  if (shipping)
    skipped.push(
      'sourceRef',
      'amount',
      'currency',
      'occurredAt',
      'declaredConcepts',
    )
  const body = async () => {
    const b = { ...defaults(schema), ...value }
    if (operation === 'CREATE') {
      b.caseId = crypto.randomUUID()
      b.assignmentId = assignmentId
    } else b.expectedCaseRevision = detail!.summary.revision
    if (operation === 'PROPOSE') {
      b.type = kind
      b.assignmentId = detail!.summary.assignmentId
      b.payload = {
        ...defaults(schema.properties!.payload),
        ...((value.payload as object) ?? {}),
      }
      delete b.expectedExecutionRevision
    }
    if (!admin && operation !== 'CREATE') {
      delete b.partyId
      b.evidenceIds = []
      delete b.movementId
      delete b.reversesMovementId
    }
    if (operation === 'DECLARE_MOVEMENT')
      b.physicalMovementId = crypto.randomUUID()
    if (operation === 'DISPUTE' && !b.obligationId && !b.movementId)
      throw Error(
        'Selecciona una obligación o movimiento autorizado para esta disputa.',
      )
    if (operation === 'VERIFY_IDENTITY') {
      const p = rows(detail!, 'parties').find((p) => p.id === b.partyId)
      b.contactSourceRef = p?.contactSourceRef
    }
    if (operation === 'REGISTER_PARTY') {
      if (b.kind !== 'DRIVER') delete b.userId
      if (b.kind !== 'PROVIDER') delete b.providerId
      const field = b.kind === 'DRIVER' ? 'userId' : 'providerId'
      if (
        ['DRIVER', 'PROVIDER'].includes(String(b.kind)) &&
        !options[field]?.some((o) => o.value === b[field])
      )
        throw Error('Selecciona la identidad histórica autorizada de la parte.')
    }
    if (operation === 'CONFIRM') {
      const target = rows(
        detail!,
        b.targetType === 'MOVEMENT' ? 'movements' : 'obligations',
      ).find((r) => r.id === b.targetId)
      if (
        ['NO_PICKUP', 'NO_COLLECTION', 'NO_ADVANCE', 'NO_OBLIGATIONS'].includes(
          String(b.assertion),
        )
      ) {
        b.targetType = 'CASE'
        b.targetId = detail!.summary.id
        b.termsHash = await hash(
          noObligationsTerms(detail!.summary.assignmentId),
        )
      } else if (b.assertion === 'MONEY_RECEIVED' && target)
        b.termsHash = await hash(economicTerms(target))
      else if (b.assertion === 'DELIVERY_RECEIVED') {
        b.targetType = 'CASE'
        b.targetId = detail!.summary.id
        b.termsHash = await hash({
          assignmentId: detail!.summary.assignmentId,
          recipientPartyId: b.partyId,
          occurredAt: b.observedAt,
          proofSource: terms.proofSource,
          incidentIdsToResolve: [
            ...(terms.incidentIdsToResolve as string[]),
          ].sort(),
        })
      } else if (b.assertion === 'EXCEPTION_AUTHORIZED' && target) {
        if (
          !terms.exceptionType ||
          !terms.coveredAmount ||
          !terms.authorizationEvidenceId
        )
          throw Error('Revisa los términos de la excepción externa autorizada.')
        b.termsHash = await hash({
          obligation: economicTerms(target),
          exceptionType: terms.exceptionType,
          coveredAmount: terms.coveredAmount,
          authorizationEvidenceId: terms.authorizationEvidenceId,
        })
      } else
        throw Error(
          'Esta confirmación requiere términos físicos o excepcionales completos. No se habilita sin una representación autorizada de esos términos.',
        )
    }
    if (
      !administrativeReferences &&
      operation === 'RECORD_EVIDENCE' &&
      b.kind === 'VERIFIED_CONTACT_NOTE'
    ) {
      const note = rows(detail!, 'contributions').find(
        (r) => r.id === value.noteId,
      )
      if (!note) throw Error('Selecciona un aporte administrativo completo.')
      b.sourceRef = {
        type: 'CONTACT_VERIFICATION_NOTE',
        id: note.id,
        sha256: await hash(note),
      }
      delete b.noteId
    }
    if (b.knowledge === 'UNKNOWN') b.expectedAmount = null
    if (administrativeReferences)
      bindReferences(
        administrativeReferences,
        operation,
        b,
        value,
        detail!,
        commands.evidenceParties,
      )
    if (!validate(schema, b)) {
      const invalid = [
        ...new Set([
          ...(schema.required ?? []).filter((k) => b[k] === undefined),
          ...Object.keys(b).filter(
            (k) =>
              !schema.properties?.[k] || !validate(schema.properties[k], b[k]),
          ),
        ]),
      ]
      throw Error(
        'Revisa los campos o referencias autorizadas: ' +
          invalid.map((k) => labels[k] ?? k).join(', ') +
          '.',
      )
    }
    return b
  }
  const legacyMissing =
    operation === 'RECORD_EVIDENCE' && value.kind === 'EXISTING_INTERNAL_RECORD'
      ? 'Falta la representación canónica completa del registro interno para verificar sourceRef.sha256. No se calcula desde una proyección parcial.'
      : operation === 'RECORD_EVIDENCE' && value.kind === 'PRIVATE_IMAGE'
        ? 'Usa el flujo de imagen privada: reserva, envío y registro desde su recibo. No se solicita un identificador de carga manual.'
        : operation === 'DECLARE_MOVEMENT' &&
            value.sourceKind === 'SHIPPING_DECLARATION'
          ? 'Falta un selector autorizado de la declaración de cobro original y su referencia. No se infiere ni se registra otro cobro.'
          : operation === 'PROPOSE' &&
              kind === 'ASSISTED_RELEASE' &&
              (value.payload as Record<string, unknown> | undefined)
                ?.proofSource === 'EXISTING_RELEASE'
            ? 'Falta la referencia autorizada al recibo original de liberación. No se sustituye por otro comando.'
            : operation === 'VERIFY_IDENTITY' &&
                !rows(detail!, 'parties').some(
                  (p) => typeof p.contactSourceRef === 'string',
                )
              ? 'La proyección administrativa omite contactSourceRef, requerido para verificar identidad. Falta una referencia autorizada al canal registrado; no se reconstruye desde el usuario ni el teléfono.'
              : operation === 'DISPUTE' && !admin && !detail?.economics.length
                ? 'No hay obligaciones propias visibles para vincular una disputa. Aporta información; se requiere una referencia autorizada antes de abrirla.'
                : operation === 'DECLARE_MOVEMENT' && !admin
                  ? 'La proyección propia no incluye partes ni movimientos. Se requiere un selector autorizado de entregante, receptor y beneficiario antes de declarar.'
                  : operation === 'RECORD_OBLIGATION' &&
                      !options.participationId?.length
                    ? 'El detalle no expone AssistanceParticipation.id. assignmentId no lo sustituye. Se requiere esa referencia histórica antes de registrar obligaciones.'
                    : operation === 'REGISTER_PARTY' &&
                        !['DRIVER', 'PROVIDER'].includes(String(value.kind))
                      ? 'Falta un selector autorizado de canales de origen/receptor con su contactSourceRef; no se aceptan referencias pegadas.'
                      : operation === 'PROPOSE' && kind === 'ACCESS_RECOVERED'
                        ? 'Falta la referencia autorizada de la nueva sesión del mismo conductor; iniciar sesión no acredita recuperación.'
                        : operation === 'PROPOSE' &&
                            kind === 'LINK_CUSTODY_RESULT' &&
                            !options.custodyResolutionId?.length
                          ? 'Falta enlazar una resolución del procedimiento físico de custodia existente; no se crea desde asistencia.'
                          : ''
  const missing = administrativeReferences
    ? Object.values(administrativeReferences).some((p) => !p.commandsEnabled)
      ? 'Comandos deshabilitados: consulta y recuperación de intentos disponibles.'
      : operation === 'RECORD_EVIDENCE' && value.kind === 'PRIVATE_IMAGE'
        ? 'Usa el flujo de imagen privada existente.'
        : operation === 'VERIFY_IDENTITY' &&
            value.partyId &&
            !options.method?.length
          ? 'Esta parte no ofrece un canal registrado y método compatibles. No se puede verificar su identidad desde esta referencia.'
          : operation === 'VERIFY_IDENTITY' &&
              value.partyId &&
              !options.verificationNoteEvidenceId?.length
            ? 'No hay un acta vinculada de forma comprobada a esta parte. Consulta las páginas de evidencias y registra la evidencia de su nota administrativa cuando corresponda; no se deduce la asociación por su etiqueta.'
            : ''
    : legacyMissing
  return (
    <section className="panel panel-body">
      <h3>{labels[operation]}</h3>
      {missing ? <p role="note">{missing}</p> : null}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void body()
            .then(setPreview)
            .catch((e) => setError(assistanceError(e)))
        }}
      >
        {administrativeReferences && (
          <>
            <p>
              Seleccionar una referencia no acredita el hecho. Documenta la
              comprobación humana real y conserva evidencias, confirmaciones y
              revisiones requeridas.
            </p>
            <Fields
              schema={{
                type: 'object',
                properties: Object.fromEntries(
                  [
                    ...(operation === 'REGISTER_PARTY' &&
                    !['DRIVER', 'PROVIDER'].includes(String(value.kind))
                      ? ['stopReference']
                      : []),
                    ...(operation === 'RECORD_EVIDENCE' &&
                    value.kind !== 'PRIVATE_IMAGE'
                      ? [
                          ...(value.kind === 'VERIFIED_CONTACT_NOTE'
                            ? ['referenceParty']
                            : []),
                          'evidenceReference',
                        ]
                      : []),
                    ...(shipping ? ['shippingReference'] : []),
                  ].map((k) => [k, { type: 'string' }]),
                ),
              }}
              value={value}
              onChange={(v) => {
                setValue(v)
                setPreview(null)
              }}
              options={options}
            />
            {shipping && (
              <p>
                El importe, moneda, fecha y conceptos se copiarán de la
                declaración original. El resultado queda DECLARED, sin acreditar
                dinero.
              </p>
            )}
          </>
        )}
        {operation === 'PROPOSE' && (
          <Field label="Tipo de propuesta">
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value)
                setValue({})
                setPreview(null)
              }}
            >
              {commandSchemas.PROPOSE.oneOf!.map((s) => (
                <option key={s.properties!.type.const}>
                  {s.properties!.type.const}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Fields
          schema={schema}
          value={value}
          onChange={(v) => {
            setValue(v)
            setPreview(null)
          }}
          options={options}
          skip={[
            ...skipped,
            ...(operation === 'PROPOSE' ? ['type'] : []),
            ...(operation === 'VERIFY_IDENTITY' ? ['contactSourceRef'] : []),
            ...(operation === 'RECORD_EVIDENCE' ? ['sourceRef'] : []),
          ]}
        />
        {operation === 'CONFIRM' &&
          ['DELIVERY_RECEIVED', 'EXCEPTION_AUTHORIZED'].includes(
            String(value.assertion),
          ) && (
            <fieldset>
              <legend>Términos exactos que se confirman</legend>
              <p>
                La propuesta debe conservar estos mismos términos y fecha
                física. Cambiarlos exige nuevas confirmaciones.
              </p>
              <Fields
                schema={
                  value.assertion === 'DELIVERY_RECEIVED'
                    ? {
                        type: 'object',
                        properties: {
                          proofSource: {
                            type: 'string',
                            enum: ['NEW_ACTION', 'EXISTING_DELIVERY'],
                          },
                          incidentIdsToResolve: {
                            type: 'array',
                            items: { type: 'string', format: 'uuid' },
                          },
                        },
                        required: ['proofSource', 'incidentIdsToResolve'],
                      }
                    : {
                        type: 'object',
                        properties: {
                          exceptionType: {
                            type: 'string',
                            enum: ['WAIVER', 'COMPENSATION', 'LOSS'],
                          },
                          coveredAmount: {
                            type: 'string',
                            pattern: '^(0|[1-9][0-9]{0,11})\\.[0-9]{2}$',
                          },
                          authorizationEvidenceId: {
                            type: 'string',
                            format: 'uuid',
                          },
                        },
                        required: [
                          'exceptionType',
                          'coveredAmount',
                          'authorizationEvidenceId',
                        ],
                      }
                }
                value={terms}
                onChange={(v) => {
                  setTerms(v)
                  setPreview(null)
                }}
                options={options}
              />
            </fieldset>
          )}
        {operation === 'RECORD_EVIDENCE' &&
          !administrativeReferences &&
          value.kind === 'VERIFIED_CONTACT_NOTE' && (
            <Field label="Aporte que documenta la verificación">
              <select
                value={String(value.noteId ?? '')}
                onChange={(e) => setValue({ ...value, noteId: e.target.value })}
              >
                <option value="">Seleccionar</option>
                {rows(detail!, 'contributions').map((n) => (
                  <option key={n.id} value={n.id}>
                    {String(n.text)}
                  </option>
                ))}
              </select>
            </Field>
          )}
        {error && <p role="alert">{error}</p>}
        <button className="button" disabled={commands.blocked || !!missing}>
          Revisar intención
        </button>
      </form>
      {preview && (
        <section aria-label="Vista previa de efectos">
          <h4>Revisión antes de enviar</h4>
          <p>
            {labels[operation]} · Revisión del caso{' '}
            {String(preview.expectedCaseRevision ?? 'nuevo')}. Sólo se enviará
            este comando de asistencia.
          </p>
          <p>
            Acceso recuperado conserva ACTIVE. Transferencia no entrega al
            receptor. Entrega acreditada no acredita pago. Declaraciones y
            excepciones no ejecutan cobros ni compensaciones con créditos.
          </p>
          <dl>
            {Object.entries(preview)
              .filter(
                ([k]) =>
                  ![
                    'caseId',
                    'assignmentId',
                    'expectedCaseRevision',
                    'termsHash',
                  ].includes(k),
              )
              .map(([k, v]) => (
                <div key={k}>
                  <dt>{labels[k] ?? k}</dt>
                  <dd style={{ overflowWrap: 'anywhere' }}>
                    {JSON.stringify(v)}
                  </dd>
                </div>
              ))}
          </dl>
          <button
            className="button"
            disabled={commands.blocked}
            onClick={() => {
              commands.prepare(
                operation,
                String(preview.caseId ?? detail!.summary.id),
                preview,
                undefined,
                undefined,
                operation === 'RECORD_EVIDENCE' && administrativeReferences
                  ? String(value.referenceParty ?? '') || undefined
                  : undefined,
              )
              setPreview(null)
            }}
          >
            Confirmar revisión
          </button>
        </section>
      )}
    </section>
  )
}
