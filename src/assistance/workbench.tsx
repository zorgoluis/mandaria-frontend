import { useCallback, useEffect, useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { adminAssignments } from '../delivery-assignments/service'
import { executionApi } from '../execution/service'
import { Field, Loading } from '../components/ui'
import { assistance } from './service'
import { CommandForm } from './forms'
import { labels, rows, type Options } from './form-model'
import { CollectionView } from './pages'
import { useCommands, useAssistanceAccess } from './command-context'
import { sha256 } from './hashes'
import { assistanceError } from './messages'
import type { CommandBodies } from './contract'
import type { CaseDetail, Collection, RecordRow, Scope } from './types'
import { collections } from './types'
export function AdminCase({
  scope,
  detail,
}: {
  scope: Scope
  detail: CaseDetail
}) {
  const [d, setD] = useState(detail),
    [op, setOp] = useState<keyof CommandBodies>('CONTRIBUTE'),
    [custodyOptions, setCustodyOptions] = useState<Options>({})
  const anchors = useQuery({
    queryKey: [
      'assistance',
      scope.actor,
      'admin',
      'anchors',
      detail.summary.dispatchId,
    ],
    queryFn: ({ signal }) =>
      adminAssignments.history(detail.summary.dispatchId, signal),
    retry: false,
    gcTime: 0,
  })
  useAssistanceAccess(anchors.error)
  const anchor = anchors.isError
    ? undefined
    : anchors.data?.find((a) => a.id === detail.summary.assignmentId)
  const receive = useCallback(
    (name: Collection, items: RecordRow[]) =>
      setD((d) => ({
        ...d,
        collections: {
          ...d.collections,
          [name]: { ...d.collections![name]!, items },
        },
      })),
    [],
  )
  const extras: Options = anchor
    ? {
        driverId: [{ value: anchor.driver.id, label: anchor.driver.name }],
        custodianDriverId: [
          { value: anchor.driver.id, label: anchor.driver.name },
        ],
      }
    : {}
  const ops: (keyof CommandBodies)[] = [
    'CONTRIBUTE',
    'REGISTER_PARTY',
    'VERIFY_IDENTITY',
    'RECORD_EVIDENCE',
    'CONFIRM',
    'REVOKE_SESSIONS',
    'RESTRICT',
    'RECORD_OBLIGATION',
    'DECLARE_MOVEMENT',
    'DISPUTE',
    'PROPOSE',
    'CLOSE',
    'REOPEN',
  ]
  return (
    <>
      <p>
        Flujo administrativo: hechos → identidad por canal registrado →
        evidencia y confirmaciones → propuesta congelada → votos → aplicación y
        recibo. La revisión y aplicación nunca llaman rutas operativas
        adicionales.
      </p>
      <details>
        <summary>Hechos y referencias autorizadas</summary>
        {Object.entries(detail.collections ?? {})
          .filter(([name]) => collections.includes(name as Collection))
          .map(([name, page]) => (
            <AdminCollection
              key={name}
              scope={scope}
              id={d.summary.id}
              name={name as Collection}
              initial={page}
              receive={receive}
            />
          ))}
      </details>
      <Field label="Acción administrativa">
        <select
          value={op}
          onChange={(e) => setOp(e.target.value as keyof CommandBodies)}
        >
          {ops.map((o) => (
            <option key={o} value={o}>
              {labels[o]}
            </option>
          ))}
        </select>
      </Field>
      {(op === 'PROPOSE' || op === 'CONFIRM') && (
        <CustodyReferences
          scope={scope}
          detail={detail}
          onOptions={setCustodyOptions}
        />
      )}
      <CommandForm
        key={op}
        operation={op}
        detail={d}
        admin
        extraOptions={{ ...extras, ...custodyOptions }}
      />
      <Upload scope={scope} detail={d} />
      <section className="panel panel-body">
        <h3>Propuestas congeladas</h3>
        <p>
          Los votos se cuentan por identidad vigente. Dos sesiones del mismo
          usuario no son dos operadores. Un cambio material exige revisar hechos
          y crear otra propuesta.
        </p>
        {rows(d, 'proposals').map((p) => (
          <Proposal
            key={`${p.id}:${d.summary.revision}`}
            scope={scope}
            detail={d}
            id={p.id}
          />
        ))}
      </section>
      <section className="panel panel-body">
        <h3>Evidencias privadas</h3>
        {rows(d, 'evidence')
          .filter((e) => e.kind === 'PRIVATE_IMAGE')
          .map((e) => (
            <PrivateImage
              key={e.id}
              scope={scope}
              caseId={d.summary.id}
              evidence={e}
            />
          ))}
      </section>
    </>
  )
}
function CustodyReferences({
  scope,
  detail,
  onOptions,
}: {
  scope: Scope
  detail: CaseDetail
  onOptions: (v: Options) => void
}) {
  const [status, setStatus] = useState('RESOLVED'),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState('')
  const list = useQuery({
    queryKey: [
      'assistance',
      scope.actor,
      'admin',
      'custody-references',
      status,
      page,
    ],
    queryFn: ({ signal }) => executionApi.incidents(status, page, signal),
    retry: false,
    gcTime: 0,
  })
  const matched = list.isError
    ? []
    : (list.data?.items.filter(
        (i) => i.dispatchId === detail.summary.dispatchId,
      ) ?? [])
  const item = useQuery({
    queryKey: [
      'assistance',
      scope.actor,
      'admin',
      'custody-reference',
      detail.summary.dispatchId,
      selected,
    ],
    enabled: !!selected && matched.some((i) => i.id === selected),
    queryFn: ({ signal }) =>
      executionApi.incident(detail.summary.dispatchId, selected, signal),
    retry: false,
    gcTime: 0,
  })
  useEffect(() => {
    const resolution = !item.isError && item.data?.resolution
    const incident = !item.isError && item.data?.incident
    onOptions({
      custodyResolutionId: resolution
        ? [
            {
              value: resolution.id,
              label: resolution.type + ' · ' + resolution.occurredAt,
            },
          ]
        : [],
      incidentIdsToResolve:
        incident && !incident.resolvedAt
          ? [
              {
                value: incident.id,
                label: incident.reasonCode + ' · ' + incident.reportedAt,
              },
            ]
          : [],
    })
  }, [item.data, item.isError, onOptions])
  return (
    <details>
      <summary>Referencias del procedimiento físico de custodia</summary>
      <p>
        Consulta de sólo lectura. La devolución o transferencia se realiza en el
        procedimiento existente antes de enlazar su resolución.
      </p>
      <Field label="Estado de incidencias">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
            setSelected('')
          }}
        >
          <option value="RESOLVED">Resueltas</option>
          <option value="OPEN">Abiertas</option>
        </select>
      </Field>
      {list.isError ? (
        <p role="alert">{assistanceError(list.error)}</p>
      ) : (
        <>
          <Field label="Incidencia de este envío">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Seleccionar</option>
              {matched.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.reasonCode} · {i.reportedAt}
                </option>
              ))}
            </select>
          </Field>
          <button
            className="button secondary"
            disabled={page <= 1 || list.isFetching}
            onClick={() => {
              setPage((p) => p - 1)
              setSelected('')
            }}
          >
            Página anterior de incidencias
          </button>
          <button
            className="button secondary"
            disabled={
              !list.data || page >= list.data.totalPages || list.isFetching
            }
            onClick={() => {
              setPage((p) => p + 1)
              setSelected('')
            }}
          >
            Página siguiente de incidencias
          </button>
        </>
      )}
      {item.isError && <p role="alert">{assistanceError(item.error)}</p>}
    </details>
  )
}
function AdminCollection({
  scope,
  id,
  name,
  initial,
  receive,
}: {
  scope: Scope
  id: string
  name: Collection
  initial: NonNullable<CaseDetail['collections']>[Collection]
  receive: (name: Collection, r: RecordRow[]) => void
}) {
  const onRows = useCallback(
    (items: RecordRow[]) => receive(name, items),
    [receive, name],
  )
  return initial ? (
    <CollectionView
      scope={scope}
      id={id}
      name={name}
      initial={initial}
      onRows={onRows}
    />
  ) : null
}
function Proposal({
  scope,
  detail,
  id,
}: {
  scope: Scope
  detail: CaseDetail
  id: string
}) {
  const c = useCommands(),
    [decision, setDecision] = useState('APPROVE'),
    [reason, setReason] = useState('')
  const q = useQuery({
    queryKey: [
      'assistance',
      scope.actor,
      'admin',
      'proposal',
      detail.summary.id,
      id,
      detail.summary.revision,
    ],
    queryFn: ({ signal }) =>
      assistance.proposal(scope, detail.summary.id, id, signal),
    retry: false,
    gcTime: 0,
  })
  useAssistanceAccess(q.error)
  if (q.isPending) return <Loading />
  if (q.isError) return <p role="alert">{assistanceError(q.error)}</p>
  const p = q.data,
    terminal = ['STALE', 'APPLIED', 'CANCELLED'].includes(String(p.status)),
    body = {
      expectedCaseRevision: detail.summary.revision,
      expectedProposalRevision: String(p.revision),
      snapshotHash: String(p.snapshotHash),
    }
  return (
    <article className="panel panel-body">
      <h4>
        {String(p.type)} · {String(p.status)}
      </h4>
      <p>
        Votos efectivos: {String(p.effectiveApprovalCount)} /{' '}
        {String(p.requiredApprovals)}
      </p>
      <p>
        Fecha física: {String(p.occurredAt)} · Registro: {String(p.recordedAt)}
      </p>
      <p>{String(p.reason)}</p>
      <details>
        <summary>Revisar efectos de la propuesta</summary>
        <p style={{ overflowWrap: 'anywhere' }}>{JSON.stringify(p.payload)}</p>
        <p>
          No se ejecutará ninguna llamada adicional de refund, claim, entrega,
          cobro o cambio de modo. El backend valida y aplica atómicamente.
        </p>
      </details>
      <Field label="Decisión">
        <select value={decision} onChange={(e) => setDecision(e.target.value)}>
          <option value="APPROVE">Aprobar</option>
          <option value="REJECT">Rechazar</option>
          <option value="REVOKE">Revocar voto</option>
        </select>
      </Field>
      <Field label="Motivo de revisión">
        <textarea
          minLength={3}
          maxLength={2000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
      <button
        className="button"
        disabled={c.blocked || terminal || reason.length < 3 || q.isFetching}
        onClick={() =>
          c.prepare(
            'REVIEW',
            detail.summary.id,
            { ...body, decision, reason },
            id,
          )
        }
      >
        Confirmar voto
      </button>
      <button
        className="button secondary"
        disabled={c.blocked || terminal || reason.length < 3 || q.isFetching}
        onClick={() =>
          c.prepare(
            'CANCEL_PROPOSAL',
            detail.summary.id,
            {
              expectedCaseRevision: body.expectedCaseRevision,
              expectedProposalRevision: body.expectedProposalRevision,
              reason,
            },
            id,
          )
        }
      >
        Cancelar propuesta
      </button>
      <button
        className="button"
        disabled={
          c.blocked ||
          terminal ||
          q.isFetching ||
          Number(p.effectiveApprovalCount) < Number(p.requiredApprovals)
        }
        onClick={() => c.prepare('APPLY', detail.summary.id, body, id)}
      >
        Aplicar propuesta revisada
      </button>
    </article>
  )
}
function Upload({ detail }: { scope: Scope; detail: CaseDetail }) {
  const c = useCommands(),
    [file, setFile] = useState<File | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  return (
    <section className="panel panel-body">
      <h3>Imagen privada de evidencia</h3>
      <p>
        JPEG/PNG hasta 5 MiB. Reserva → acceso privado → envío → registro. Cada
        paso requiere confirmación; el servidor valida el contenido y calcula su
        hash saneado.
      </p>
      <Field label="Archivo de evidencia">
        <input
          type="file"
          accept="image/jpeg,image/png"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </Field>
      {error && <p role="alert">{error}</p>}
      <button
        className="button"
        disabled={c.blocked || busy || !file}
        onClick={() => {
          if (!file) return
          setBusy(true)
          void (async () => {
            if (
              !['image/jpeg', 'image/png'].includes(file.type) ||
              file.size > 5242880 ||
              !file.size
            )
              throw Error('Selecciona JPEG/PNG de hasta 5 MiB.')
            const bytes = await file.arrayBuffer(),
              digest = await sha256(bytes)
            let raw = ''
            for (const b of new Uint8Array(bytes)) raw += String.fromCharCode(b)
            c.prepare(
              'UPLOAD_EVIDENCE',
              detail.summary.id,
              {
                expectedCaseRevision: detail.summary.revision,
                mime: file.type,
                bytes: file.size,
                sha256: digest,
              },
              undefined,
              { mime: file.type, bytes: btoa(raw) },
            )
          })()
            .catch((e) => setError(assistanceError(e)))
            .finally(() => setBusy(false))
        }}
      >
        Revisar reserva privada
      </button>
    </section>
  )
}
function PrivateImage({
  scope,
  caseId,
  evidence,
}: {
  scope: Scope
  caseId: string
  evidence: RecordRow
}) {
  const [requested, setRequested] = useState(false),
    image = useRef<HTMLImageElement>(null)
  const q = useQuery({
    queryKey: [
      'assistance',
      scope.actor,
      'admin',
      'private-image',
      caseId,
      evidence.id,
    ],
    enabled: requested && evidence.status === 'AVAILABLE',
    queryFn: ({ signal }) =>
      api<Blob>(
        `/admin/fleet-assistance-cases/${caseId}/evidence/${evidence.id}/content`,
        'GET',
        undefined,
        signal,
        undefined,
        'private-image',
      ),
    retry: false,
    gcTime: 0,
  })
  useAssistanceAccess(q.error)
  useEffect(() => {
    if (!q.data || q.isError) return
    const u = URL.createObjectURL(q.data)
    const element = image.current
    if (element) element.src = u
    return () => {
      URL.revokeObjectURL(u)
      element?.removeAttribute('src')
    }
  }, [q.data, q.isError])
  return (
    <div>
      <button
        className="button secondary"
        disabled={evidence.status !== 'AVAILABLE'}
        onClick={() => setRequested(true)}
      >
        Consultar imagen privada
      </button>
      {q.isError ? (
        <p role="alert">{assistanceError(q.error)}</p>
      ) : (
        q.data && (
          <img
            ref={image}
            alt="Evidencia privada autorizada"
            style={{ maxWidth: '100%' }}
          />
        )
      )}
    </div>
  )
}
