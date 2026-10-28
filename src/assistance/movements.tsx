import { useEffect, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Field } from '../components/ui'
import { ApiError } from '../services/errors'
import { assistance } from './service'
import { useCommands } from './command-context'
import { assistanceError, messages } from './messages'
import {
  declarationBody,
  optionLabel,
  partyLabel,
  validMovementContext,
} from './movement-model'
import type { CaseDetail, MovementContext, Scope } from './types'

export function ProviderMovements({
  scope,
  detail,
}: {
  scope: Scope
  detail: CaseDetail
}) {
  const commands = useCommands(),
    [generation, setGeneration] = useState(0)
  const initial = detail.movementContext
  const valid = validMovementContext(initial)
  const q = useInfiniteQuery({
    queryKey: [
      'assistance',
      scope.actor,
      scope.surface,
      scope.providerId,
      'movement-context',
      detail.summary.id,
      detail.summary.revision,
      generation,
    ],
    queryFn: async ({ pageParam, signal }) => {
      const page = await assistance.movementContext(
        scope,
        detail.summary.id,
        { limit: 25, pageToken: pageParam },
        signal,
      )
      if (!validMovementContext(page))
        throw Error(
          'La proyección de movimientos no es compatible. No se habilitan comandos.',
        )
      return page
    },
    initialPageParam: undefined as string | undefined,
    initialData:
      valid && generation === 0
        ? { pages: [initial], pageParams: [undefined] }
        : undefined,
    getNextPageParam: (p) => p.nextPageToken ?? undefined,
    enabled: scope.surface === 'provider' && valid,
    gcTime: 0,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })
  useEffect(() => {
    if (q.error instanceof ApiError && [401, 403, 404].includes(q.error.status))
      commands.deny()
  }, [q.error, commands])
  if (scope.surface !== 'provider') return null
  if (!initial)
    return (
      <p>
        Este backend no ofrece contexto de movimientos del proveedor. Puedes
        consultar el expediente y aportar información.
      </p>
    )
  if (!valid)
    return (
      <p role="alert">
        La proyección de movimientos no es compatible. No se habilitan comandos.
      </p>
    )
  if (q.isError)
    return (
      <section role="alert">
        <p>
          {assistanceError(q.error)} No se muestran páginas anteriores de
          movimientos.
        </p>
        <button onClick={() => setGeneration((n) => n + 1)}>
          Reiniciar movimientos
        </button>
      </section>
    )
  if (!q.data) return <p>Cargando movimientos autorizados…</p>
  const current = q.data.pages.at(-1)!
  const all = q.data.pages
    .flatMap((p) => p.movements)
    .filter((m, i, rows) => rows.findIndex((r) => r.id === m.id) === i)
  const parties = q.data.pages.flatMap((p) => p.parties)
  const name = (id: string) => {
    const p = parties.find((p) => p.partyId === id)
    return p ? partyLabel(p) : 'Parte no disponible'
  }
  return (
    <section className="panel panel-body" aria-label="Movimientos propios">
      <h3>Movimientos propios</h3>
      <p>
        Una declaración está pendiente de acreditación. No asigna dinero
        automáticamente a una obligación, no modifica créditos ni acredita la
        entrega. La reversión requiere revisión administrativa.
      </p>
      <button
        className="button secondary"
        disabled={q.isFetching}
        onClick={() => setGeneration((n) => n + 1)}
      >
        Actualizar movimientos
      </button>
      <fieldset className="execution-fieldset" disabled={q.isFetching}>
        <Declare
          key={`${current.caseRevision}:${current.asOf}`}
          context={current}
          detail={detail}
        />
        {!all.length && <p>Sin movimientos registrados para esta consulta.</p>}
        {all.map((m) => (
          <article key={m.id} className="panel panel-body">
            <h4>
              {m.declaredConcepts.join(', ')} · {m.amount} MXN
            </h4>
            <p>
              {name(m.fromPartyId)} → {name(m.toPartyId)} · Beneficiario:{' '}
              {name(m.beneficiaryPartyId)}
            </p>
            <p>
              {m.status === 'DECLARED'
                ? 'Declaración registrada, pendiente de acreditación'
                : m.status === 'ACCREDITED'
                  ? 'Movimiento acreditado por resolución'
                  : 'Movimiento retractado'}
            </p>
            <p>
              Fecha física: {m.occurredAt} · Registro: {m.recordedAt}
            </p>
            {m.canDispute === true &&
            m.disputeReason === null &&
            current.capabilities.declareMovementReason !==
              'ASSISTANCE_DISABLED' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const reason = String(
                    new FormData(e.currentTarget).get('reason') ?? '',
                  ).trim()
                  if (reason.length >= 3 && reason.length <= 2000)
                    commands.prepare('DISPUTE', detail.summary.id, {
                      expectedCaseRevision: current.caseRevision,
                      movementId: m.id,
                      reason,
                    })
                }}
              >
                <Field label="Motivo de disputa del movimiento">
                  <textarea
                    name="reason"
                    required
                    minLength={3}
                    maxLength={2000}
                  />
                </Field>
                <p>
                  Disputar no revierte el movimiento, devuelve efectivo, elimina
                  asignaciones ni cambia créditos o entrega.
                </p>
                <button className="button" disabled={commands.blocked}>
                  Revisar disputa del movimiento
                </button>
              </form>
            ) : (
              <p>
                Disputa no disponible:{' '}
                {messages[
                  (current.capabilities.declareMovementReason ===
                  'ASSISTANCE_DISABLED'
                    ? 'ASSISTANCE_DISABLED'
                    : m.disputeReason) ?? ''
                ] ?? 'No autorizada en esta proyección.'}
              </p>
            )}
          </article>
        ))}
      </fieldset>
      {q.hasNextPage && (
        <button
          className="button secondary"
          disabled={q.isFetching}
          onClick={() => void q.fetchNextPage()}
        >
          Cargar más movimientos
        </button>
      )}
    </section>
  )
}
function Declare({
  context,
  detail,
}: {
  context: MovementContext
  detail: CaseDetail
}) {
  const commands = useCommands(),
    [selected, setSelected] = useState(''),
    [amount, setAmount] = useState(''),
    [occurredAt, setOccurredAt] = useState(''),
    [error, setError] = useState(''),
    [preview, setPreview] = useState<ReturnType<typeof declarationBody> | null>(
      null,
    )
  const options = context.declarationOptions
    .map((o, index) => ({ o, index, label: optionLabel(o, context) }))
    .filter(
      (v, _, all) =>
        v.label && all.filter((x) => x.label === v.label).length === 1,
    )
  const unavailable =
    !context.capabilities.canDeclareMovement ||
    context.capabilities.declareMovementReason !== null
  const selection = options.find((v) => String(v.index) === selected)
  return (
    <section>
      <h4>Declarar dinero</h4>
      <p>
        Un solo concepto por intención. Selecciona la combinación completa
        correspondiente al hecho; no se reparten importes entre conceptos.
      </p>
      {unavailable ? (
        <p>
          {messages[context.capabilities.declareMovementReason ?? ''] ??
            'La declaración no está autorizada.'}
        </p>
      ) : !options.length ? (
        <p>
          Los datos autorizados no permiten distinguir la contraparte. Aporta
          información en este expediente para revisión administrativa.
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            try {
              if (!selection)
                throw Error('Selecciona una combinación autorizada.')
              setPreview(
                declarationBody(
                  context,
                  selection.o,
                  amount,
                  occurredAt + 'Z',
                  detail.participation.startedAt,
                ),
              )
              setError('')
            } catch (e) {
              setError(assistanceError(e))
            }
          }}
        >
          <Field label="Combinación autorizada">
            <select
              value={selected}
              required
              onChange={(e) => {
                setSelected(e.target.value)
                setPreview(null)
              }}
            >
              <option value="">Seleccionar</option>
              {options.map((v) => (
                <option key={v.index} value={v.index}>
                  {v.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Importe declarado MXN">
            <input
              value={amount}
              inputMode="decimal"
              required
              onChange={(e) => {
                setAmount(e.target.value)
                setPreview(null)
              }}
            />
          </Field>
          <Field label="Fecha física del movimiento (UTC)">
            <input
              type="datetime-local"
              step="1"
              value={occurredAt}
              required
              onChange={(e) => {
                setOccurredAt(e.target.value)
                setPreview(null)
              }}
            />
          </Field>
          <button className="button" disabled={commands.blocked}>
            Revisar declaración
          </button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
      {preview && !unavailable && (
        <section aria-label="Vista previa de declaración">
          <p>{selection?.label}</p>
          <p>
            {preview.amount} MXN · Fecha física: {preview.occurredAt}
          </p>
          <p>
            Se registrará una declaración pendiente de acreditación, no un pago.
            Revisión: {preview.expectedCaseRevision}.
          </p>
          <button
            className="button"
            disabled={commands.blocked}
            onClick={() => {
              commands.prepare('DECLARE_MOVEMENT', detail.summary.id, preview)
              setPreview(null)
            }}
          >
            Confirmar declaración revisada
          </button>
        </section>
      )}
    </section>
  )
}
