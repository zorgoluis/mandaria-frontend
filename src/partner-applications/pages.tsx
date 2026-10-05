import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  CircleCheck,
  Info,
  Mail,
  MessageCircle,
  Phone,
  Search,
} from 'lucide-react'
import {
  ActionForm,
  Badge,
  Empty,
  ErrorPage,
  ErrorState,
  Field,
  InfoGrid,
  Loading,
  Modal,
  PageTitle,
  Pagination,
  Table,
} from '../components/ui'
import { useFeedback } from '../components/feedback-context'
import { ApiError } from '../services/errors'
import { date } from '../utils/format'
import { providers } from '../providers/service'
import { invitations } from '../invitations/service'
import { invitationStatusLabels } from '../invitations/format'
import { partnerApplications } from './service'
import { partnerApplicationKeys, storePartnerApplication } from './queries'
import {
  partnerActionLabels,
  partnerStatusHints,
  partnerStatusLabels,
  partnerTypeLabels,
  partnerVehicleLabels,
  phoneLabel,
  whatsappUrl,
} from './format'
import {
  REFERENCE,
  REVIEW_NOTE_MAX,
  partnerApplicationStatuses,
  partnerApplicationTypes,
  type PartnerApplication,
  type PartnerApplicationStatus,
  type PartnerApplicationType,
} from './types'

const PAGE_SIZE = 20
const LIST = '/admin/partner-applications'
/** URL values of the status filter: OPEN (default), one status, or ALL (no filter). */
const OPEN = 'OPEN'
const ALL = 'ALL'
/** Leads someone still has to work on; the backend takes them as one comma-separated filter. */
const OPEN_STATUSES: PartnerApplicationStatus[] = ['RECEIVED', 'CONTACTED']
/** These close or accept a lead, so they always ask for a reason and a confirmation. */
const NOTE_REQUIRED: PartnerApplicationStatus[] = [
  'APPROVED',
  'REJECTED',
  'DISCARDED',
]
const detailPath = (reference: string) =>
  `${LIST}/${encodeURIComponent(reference)}`
const isStatus = (value: string): value is PartnerApplicationStatus =>
  (partnerApplicationStatuses as readonly string[]).includes(value)
const isType = (value: string): value is PartnerApplicationType =>
  (partnerApplicationTypes as readonly string[]).includes(value)

function LeadNote() {
  return (
    <p className="notice capability-note">
      <Info size={16} aria-hidden="true" />
      Una solicitud de socio es un contacto de la landing, no una cuenta.
      Aprobarla no crea proveedores, invitaciones ni repartidores: el alta se
      hace con las pantallas existentes y aquí sólo se registran los vínculos.
    </p>
  )
}

export function PartnerApplicationsPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(
    1,
    Math.min(100000, Math.trunc(Number(params.get('page')) || 1)),
  )
  const rawStatus = params.get('status') ?? OPEN
  const rawType = params.get('type') ?? ''
  const q = (params.get('q') ?? '').trim()
  const valid =
    (rawStatus === OPEN || rawStatus === ALL || isStatus(rawStatus)) &&
    (!rawType || isType(rawType)) &&
    q.length <= 100
  const filters = {
    page,
    pageSize: PAGE_SIZE,
    status:
      rawStatus === OPEN
        ? OPEN_STATUSES.join(',')
        : isStatus(rawStatus)
          ? rawStatus
          : undefined,
    type: isType(rawType) ? rawType : undefined,
    q: q || undefined,
  }
  const query = useQuery({
    queryKey: partnerApplicationKeys.list(filters),
    queryFn: ({ signal }) => partnerApplications.list(filters, signal),
    enabled: valid,
  })
  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes))
      if (value) next.set(key, value)
      else next.delete(key)
    next.set('page', '1')
    setParams(next)
  }
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    update({ q: String(data.get('q') ?? '').trim() })
  }
  const filtered = rawStatus !== ALL || !!rawType || !!q
  return (
    <>
      <PageTitle
        title="Solicitudes de socio"
        description="Personas y flotillas que pidieron sumarse a Mandaria desde la landing."
      />
      <div className="panel">
        <div className="panel-toolbar">
          <div>
            <h2>Bandeja</h2>
            <p>De la más reciente a la más antigua</p>
          </div>
        </div>
        <div className="panel-body">
          <LeadNote />
        </div>
        <form
          className="filters delivery-filters"
          onSubmit={search}
          aria-label="Filtros de solicitudes de socio"
        >
          <label className="search">
            <Search size={17} />
            <input
              key={q}
              name="q"
              type="search"
              aria-label="Buscar solicitudes"
              placeholder="Referencia, nombre, teléfono, correo o flotilla"
              defaultValue={q}
              maxLength={100}
            />
          </label>
          <select
            aria-label="Filtrar por estado"
            value={rawStatus}
            onChange={(event) => update({ status: event.target.value })}
          >
            <option value={OPEN}>Abiertas (recibidas y contactadas)</option>
            {partnerApplicationStatuses.map((value) => (
              <option key={value} value={value}>
                {partnerStatusLabels[value]}
              </option>
            ))}
            <option value={ALL}>Todos los estados</option>
          </select>
          <select
            aria-label="Filtrar por tipo"
            value={rawType}
            onChange={(event) => update({ type: event.target.value })}
          >
            <option value="">Todos los tipos</option>
            {partnerApplicationTypes.map((value) => (
              <option key={value} value={value}>
                {partnerTypeLabels[value]}
              </option>
            ))}
          </select>
          <button className="button secondary small" type="submit">
            Buscar
          </button>
        </form>
        {!valid ? (
          <div className="panel-body">
            <p className="inline-error" role="alert">
              Los filtros de la dirección no son válidos.{' '}
              <Link to={LIST}>Ver las solicitudes abiertas</Link>.
            </p>
          </div>
        ) : query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <ErrorState
            error={query.error}
            retry={() => {
              void query.refetch()
            }}
          />
        ) : (
          <>
            {query.data.items.length ? (
              <Table
                stacked
                rows={query.data.items.map((item) => ({
                  ...item,
                  id: item.reference,
                }))}
                columns={[
                  {
                    label: 'Referencia',
                    render: (row) => (
                      <Link
                        className="entity-name"
                        to={detailPath(row.reference)}
                      >
                        {row.reference}
                      </Link>
                    ),
                  },
                  {
                    label: 'Tipo',
                    render: (row) => (
                      <Badge
                        value={row.type === 'FLEET' ? 'fleet' : 'independent'}
                        label={partnerTypeLabels[row.type]}
                      />
                    ),
                  },
                  {
                    label: 'Nombre',
                    render: (row) => (
                      <span className="cell-meta">
                        {row.contactName}
                        {row.fleetName && <small>{row.fleetName}</small>}
                      </span>
                    ),
                  },
                  { label: 'Ciudad', render: (row) => row.city },
                  {
                    label: 'Vehículo',
                    render: (row) =>
                      partnerVehicleLabels[row.vehicleType] ?? row.vehicleType,
                  },
                  {
                    label: 'Unidades',
                    render: (row) =>
                      row.fleetUnits === null
                        ? '—'
                        : row.fleetUnits.toLocaleString('es-MX'),
                  },
                  { label: 'Fecha', render: (row) => date(row.createdAt) },
                  {
                    label: 'Estado',
                    render: (row) => (
                      <Badge
                        value={row.status}
                        label={partnerStatusLabels[row.status]}
                      />
                    ),
                  },
                  {
                    label: 'Envíos',
                    render: (row) => (
                      <Submissions count={row.submissionCount} />
                    ),
                  },
                ]}
              />
            ) : (
              <Empty
                title="No hay solicitudes de socio."
                description={
                  filtered
                    ? 'Ninguna solicitud coincide con los filtros aplicados.'
                    : 'Las solicitudes que lleguen desde la landing aparecerán aquí.'
                }
              />
            )}
            <Pagination
              page={page}
              total={query.data.total}
              totalPages={query.data.totalPages}
              onPage={(value) => {
                const next = new URLSearchParams(params)
                next.set('page', String(value))
                setParams(next)
              }}
            />
            <p className="panel-note">
              Por defecto se muestran las abiertas: recibidas y contactadas. Las
              aprobadas, rechazadas y descartadas se consultan con el filtro de
              estado.
            </p>
          </>
        )}
      </div>
    </>
  )
}

/** A repeated submission is a person insisting: it must stand out in the inbox. */
function Submissions({ count }: { count: number }) {
  return count > 1 ? (
    <span
      className="tag submissions-repeated"
      title={`Envió el formulario ${count} veces`}
    >
      {count} envíos
    </span>
  ) : (
    <span>{count}</span>
  )
}

export function PartnerApplicationDetail() {
  const { reference = '' } = useParams()
  if (!REFERENCE.test(reference)) return <ErrorPage code={404} />
  const normalized = reference.toUpperCase()
  return <ApplicationRecord key={normalized} reference={normalized} />
}

function ApplicationRecord({ reference }: { reference: string }) {
  const query = useQuery({
    queryKey: partnerApplicationKeys.detail(reference),
    queryFn: ({ signal }) => partnerApplications.get(reference, signal),
    staleTime: 0,
  })
  if (query.isPending || query.isError)
    return (
      <>
        <PageTitle title={reference} back={LIST} />
        {query.isPending ? (
          <Loading />
        ) : (
          <ErrorState
            error={query.error}
            retry={() => {
              void query.refetch()
            }}
          />
        )}
      </>
    )
  return (
    <ApplicationContent
      application={query.data}
      refresh={() => query.refetch()}
    />
  )
}

function ApplicationContent({
  application,
  refresh,
}: {
  application: PartnerApplication
  refresh: () => Promise<unknown>
}) {
  const [target, setTarget] = useState<PartnerApplicationStatus | null>(null)
  const fleet = application.type === 'FLEET'
  return (
    <>
      <PageTitle
        title={application.reference}
        description={`${partnerTypeLabels[application.type]} · ${application.contactName}`}
        back={LIST}
      />
      <section className="panel" aria-labelledby="partner-summary">
        <div className="panel-toolbar">
          <h2 id="partner-summary">Solicitud</h2>
          <Badge
            value={application.status}
            label={partnerStatusLabels[application.status]}
          />
        </div>
        <InfoGrid
          items={[
            ['Estado', partnerStatusHints[application.status]],
            ['Tipo', partnerTypeLabels[application.type]],
            ...(fleet
              ? ([
                  ['Flotilla', application.fleetName ?? '—'],
                  [
                    'Unidades',
                    application.fleetUnits?.toLocaleString('es-MX') ?? '—',
                  ],
                ] as [string, string][])
              : []),
            [
              'Vehículo',
              partnerVehicleLabels[application.vehicleType] ??
                application.vehicleType,
            ],
            ['Ciudad', application.city],
            [
              'Envíos',
              <Submissions
                key="submissions"
                count={application.submissionCount}
              />,
            ],
            ['Recibida', date(application.createdAt)],
            ['Último envío', date(application.lastSubmittedAt)],
            [
              'Aviso de privacidad',
              `Versión ${application.privacyNoticeVersion} · aceptado ${date(application.privacyAcceptedAt)}`,
            ],
            [
              'Último cambio de estado',
              application.statusChangedAt
                ? date(application.statusChangedAt)
                : 'Sin cambios',
            ],
            ['Nota de revisión', application.reviewNote ?? 'Sin nota'],
          ]}
        />
        <div className="panel-body">
          <LeadNote />
        </div>
      </section>
      <section className="panel" aria-labelledby="partner-contact">
        <div className="panel-toolbar">
          <div>
            <h2 id="partner-contact">Contacto</h2>
            <p>{application.contactName}</p>
          </div>
        </div>
        <InfoGrid
          items={[
            ['Teléfono', phoneLabel(application.phone)],
            ['Correo', application.email],
          ]}
        />
        <div className="panel-body row-actions contact-actions">
          <a
            className="button secondary small"
            href={`tel:${application.phone}`}
          >
            <Phone size={15} /> Llamar
          </a>
          <a
            className="button secondary small"
            href={whatsappUrl(application.phone)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={15} /> WhatsApp
          </a>
          <a
            className="button secondary small"
            href={`mailto:${application.email}`}
          >
            <Mail size={15} /> Correo
          </a>
        </div>
      </section>
      <section className="panel" aria-labelledby="partner-status">
        <div className="panel-toolbar">
          <div>
            <h2 id="partner-status">Cambiar estado</h2>
            <p>Sólo se muestran los cambios que Mandaria permite ahora.</p>
          </div>
        </div>
        <div className="panel-body">
          {application.allowedTransitions.length ? (
            <div className="row-actions">
              {application.allowedTransitions.map((status) => (
                <button
                  key={status}
                  className={`button ${
                    status === 'REJECTED' || status === 'DISCARDED'
                      ? 'secondary destructive'
                      : status === 'APPROVED'
                        ? ''
                        : 'secondary'
                  }`}
                  onClick={() => setTarget(status)}
                >
                  {partnerActionLabels[status]}
                </button>
              ))}
            </div>
          ) : (
            <p className="muted">
              Estado final: esta solicitud ya no admite cambios.
            </p>
          )}
        </div>
      </section>
      {application.status === 'APPROVED' && (
        <Onboarding application={application} />
      )}
      {application.status !== 'APPROVED' &&
        (application.providerId || application.invitationId) && (
          <section className="panel" aria-labelledby="partner-links">
            <div className="panel-toolbar">
              <h2 id="partner-links">Vínculos registrados</h2>
            </div>
            <CurrentLinks application={application} />
          </section>
        )}
      {target && (
        <StatusDialog
          application={application}
          target={target}
          refresh={refresh}
          onClose={() => setTarget(null)}
        />
      )}
    </>
  )
}

function StatusDialog({
  application,
  target,
  refresh,
  onClose,
}: {
  application: PartnerApplication
  target: PartnerApplicationStatus
  refresh: () => Promise<unknown>
  onClose: () => void
}) {
  const notify = useFeedback()
  const required = NOTE_REQUIRED.includes(target)
  const fromApproved =
    application.status === 'APPROVED' && target === 'REJECTED'
  const description: Record<PartnerApplicationStatus, string> = {
    RECEIVED: '',
    CONTACTED: `Registra que operación ya habló con ${application.contactName}.`,
    APPROVED:
      'La solicitud quedará aceptada. Aprobar no crea cuentas: después da de alta a la persona con las pantallas existentes y registra los vínculos.',
    REJECTED: fromApproved
      ? 'La solicitud aprobada pasará a rechazada. Escribe una nota nueva con el motivo; los vínculos registrados se conservan. Es un estado final.'
      : 'La solicitud no procede. Es un estado final y no se puede deshacer.',
    DISCARDED:
      'Úsalo para spam, pruebas o duplicados manuales. Es un estado final y no se puede deshacer.',
  }
  return (
    <Modal
      title={`${partnerActionLabels[target]} ${application.reference}`}
      onClose={onClose}
    >
      <p className="modal-description">{description[target]}</p>
      <ActionForm
        initialDirty
        submitLabel={partnerActionLabels[target]}
        cancelLabel="Volver"
        onCancel={onClose}
        onSubmit={async (data) => {
          const note = String(data.get('reviewNote') ?? '').trim()
          if (required && !note)
            throw new ApiError(
              400,
              fromApproved
                ? 'Escribe una nota nueva para rechazar una solicitud aprobada.'
                : 'Escribe una nota de revisión antes de confirmar.',
            )
          if (note.length > REVIEW_NOTE_MAX)
            throw new ApiError(
              400,
              `La nota admite hasta ${REVIEW_NOTE_MAX} caracteres.`,
            )
          try {
            const result = await partnerApplications.changeStatus(
              application.reference,
              { status: target, ...(note ? { reviewNote: note } : {}) },
            )
            await storePartnerApplication(result)
          } catch (error) {
            // Someone else may have moved it: read back the transitions the backend allows now.
            if (
              error instanceof ApiError &&
              error.code === 'PARTNER_APPLICATION_INVALID_TRANSITION'
            )
              void refresh()
            throw error
          }
          notify(
            `Solicitud ${application.reference}: ${partnerStatusLabels[target].toLowerCase()}.`,
          )
          onClose()
        }}
      >
        <Field
          label={required ? 'Nota de revisión' : 'Nota de revisión (opcional)'}
          hint={`Hasta ${REVIEW_NOTE_MAX} caracteres. Es interna: no incluyas datos sensibles.${
            required ? '' : ' Si la dejas vacía se conserva la nota anterior.'
          }`}
        >
          <textarea
            name="reviewNote"
            required={required}
            maxLength={REVIEW_NOTE_MAX}
            rows={4}
          />
        </Field>
      </ActionForm>
    </Modal>
  )
}

function CurrentLinks({ application }: { application: PartnerApplication }) {
  return (
    <InfoGrid
      items={[
        ...(application.type === 'FLEET'
          ? ([
              [
                'Proveedor',
                application.providerId ? (
                  <Link
                    key="provider"
                    to={`/providers/${encodeURIComponent(application.providerId)}`}
                  >
                    Ver proveedor vinculado
                  </Link>
                ) : (
                  'Sin registrar'
                ),
              ],
            ] as [string, ReactNode][])
          : []),
        [
          'Invitación',
          application.invitationId ? (
            <code key="invitation">{application.invitationId}</code>
          ) : (
            'Sin registrar'
          ),
        ],
      ]}
    />
  )
}

/** Guided conversion with the existing screens. Nothing is created from here. */
function Onboarding({ application }: { application: PartnerApplication }) {
  const fleet = application.type === 'FLEET'
  const steps: { done: boolean; title: string; body: ReactNode }[] = fleet
    ? [
        {
          done: !!application.providerId,
          title: 'Crear el proveedor de tipo flotilla',
          body: (
            <>
              Regístralo como «Flotilla» con el nombre{' '}
              <strong>{application.fleetName}</strong> y actívalo según el flujo
              vigente de proveedores.{' '}
              <Link to="/providers/new">Nuevo proveedor</Link>
            </>
          ),
        },
        {
          done: !!application.invitationId,
          title: 'Invitar al administrador del proveedor',
          body: (
            <>
              Desde el detalle del proveedor, usa «Invitar administrador» con el
              correo <strong>{application.email}</strong> y el rol Propietario.
              El correo debe ser exactamente el de la solicitud.{' '}
              {application.providerId ? (
                <Link
                  to={`/providers/${encodeURIComponent(application.providerId)}`}
                >
                  Abrir proveedor vinculado
                </Link>
              ) : (
                <Link to="/providers?type=FLEET">Ver flotillas</Link>
              )}
            </>
          ),
        },
        {
          done: !!application.providerId && !!application.invitationId,
          title: 'Registrar el proveedor y la invitación',
          body: 'Elígelos en el formulario de abajo para dejar la solicitud vinculada.',
        },
      ]
    : [
        {
          done: !!application.invitationId,
          title: 'Invitar como repartidor en un proveedor existente',
          body: (
            <>
              En Repartidores, elige el proveedor e invita con el correo{' '}
              <strong>{application.email}</strong>. El proveedor que recibe a
              los repartidores independientes está pendiente de decisión del
              propietario: confírmalo antes de invitar.{' '}
              <Link to="/drivers">Abrir repartidores</Link>
            </>
          ),
        },
        {
          done: false,
          title: 'Habilitar la capacidad independiente',
          body: (
            <>
              Cuando la persona active su cuenta, habilítala como independiente.{' '}
              <Link to="/independent-drivers">Abrir independientes</Link>
            </>
          ),
        },
        {
          done: false,
          title: 'Dar de alta sus vehículos propios',
          body: 'Desde el detalle de su habilitación independiente, en «Vehículos propios».',
        },
        {
          done: !!application.invitationId,
          title: 'Registrar la invitación',
          body: 'Elígela en el formulario de abajo. En solicitudes individuales no se registra proveedor.',
        },
      ]
  return (
    <section className="panel" aria-labelledby="partner-onboarding">
      <div className="panel-toolbar">
        <div>
          <h2 id="partner-onboarding">Alta en Mandaria</h2>
          <p>
            {fleet
              ? 'Pasos para una flotilla aprobada'
              : 'Pasos para un repartidor individual aprobado'}
          </p>
        </div>
      </div>
      <div className="panel-body">
        <ol className="onboarding-steps">
          {steps.map((step) => (
            <li key={step.title} className={step.done ? 'done' : undefined}>
              <strong>
                {step.done && <CircleCheck size={15} aria-label="Registrado" />}{' '}
                {step.title}
              </strong>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
      <CurrentLinks application={application} />
      <LinkForm application={application} />
    </section>
  )
}

const sameEmail = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase()

/**
 * Lists only real providers and invitations, so the identifiers are never typed by hand.
 * The backend repeats every check and answers PARTNER_APPLICATION_LINK_INVALID.
 */
function LinkForm({ application }: { application: PartnerApplication }) {
  const notify = useFeedback()
  const fleet = application.type === 'FLEET'
  const [providerId, setProviderId] = useState(application.providerId ?? '')
  const [invitationId, setInvitationId] = useState(
    application.invitationId ?? '',
  )
  const fleets = useQuery({
    queryKey: ['partner-applications', 'link', 'providers'],
    queryFn: ({ signal }) =>
      providers.list({ page: 1, pageSize: 100, type: 'FLEET' }, signal),
    enabled: fleet,
  })
  const role = fleet ? 'PROVIDER_ADMIN' : 'DRIVER'
  const sent = useQuery({
    queryKey: [
      'partner-applications',
      'link',
      'invitations',
      role,
      application.email,
    ],
    queryFn: ({ signal }) =>
      invitations.list(
        { kind: 'admin', role },
        { page: 1, pageSize: 100, search: application.email },
        signal,
      ),
  })
  // The search is partial; the backend requires the exact email of the application.
  const candidates = (sent.data?.items ?? []).filter((item) =>
    sameEmail(item.email, application.email),
  )
  const knownProvider = fleets.data?.items.some((p) => p.id === providerId)
  const knownInvitation = candidates.some((i) => i.id === invitationId)
  return (
    <div className="panel-body">
      <h3>Registrar vínculos</h3>
      <ActionForm
        submitLabel="Registrar vínculos"
        onSubmit={async (data) => {
          const provider = fleet ? String(data.get('providerId') ?? '') : ''
          const invitation = String(data.get('invitationId') ?? '')
          if (!provider && !invitation)
            throw new ApiError(
              400,
              fleet
                ? 'Elige el proveedor, la invitación o ambos.'
                : 'Elige la invitación enviada a esta persona.',
            )
          const chosenProvider = fleets.data?.items.find(
            (p) => p.id === provider,
          )
          if (chosenProvider && chosenProvider.type !== 'FLEET')
            throw new ApiError(400, 'El proveedor debe ser de tipo flotilla.')
          const chosenInvitation = candidates.find((i) => i.id === invitation)
          const owner = provider || application.providerId
          if (
            chosenInvitation &&
            owner &&
            chosenInvitation.providerId !== owner
          )
            throw new ApiError(
              400,
              'La invitación pertenece a otro proveedor. Elige la invitación enviada desde el proveedor vinculado.',
            )
          const result = await partnerApplications.link(application.reference, {
            ...(provider ? { providerId: provider } : {}),
            ...(invitation ? { invitationId: invitation } : {}),
          })
          await storePartnerApplication(result)
          notify('Vínculos registrados.')
        }}
      >
        {fleet && (
          <Field
            label="Proveedor (flotilla)"
            hint="Sólo proveedores de tipo flotilla. Un valor nuevo reemplaza al anterior."
          >
            <select
              name="providerId"
              value={providerId}
              disabled={fleets.isPending}
              onChange={(event) => setProviderId(event.target.value)}
            >
              <option value="">
                {fleets.isPending
                  ? 'Cargando proveedores…'
                  : fleets.isError
                    ? 'No se pudieron cargar los proveedores'
                    : 'Sin proveedor'}
              </option>
              {providerId && !knownProvider && !fleets.isPending && (
                <option value={providerId}>Proveedor vinculado</option>
              )}
              {fleets.data?.items.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name} · {provider.code}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field
          label="Invitación"
          hint={`Invitaciones de ${fleet ? 'administrador' : 'repartidor'} enviadas a ${application.email}. Un valor nuevo reemplaza al anterior.`}
        >
          <select
            name="invitationId"
            value={invitationId}
            disabled={sent.isPending}
            onChange={(event) => setInvitationId(event.target.value)}
          >
            <option value="">
              {sent.isPending
                ? 'Cargando invitaciones…'
                : sent.isError
                  ? 'No se pudieron cargar las invitaciones'
                  : candidates.length
                    ? 'Sin invitación'
                    : 'No hay invitaciones para este correo'}
            </option>
            {invitationId && !knownInvitation && !sent.isPending && (
              <option value={invitationId}>Invitación vinculada</option>
            )}
            {candidates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.provider.name} ·{' '}
                {invitationStatusLabels[item.status] ?? item.status} ·{' '}
                {date(item.createdAt)}
              </option>
            ))}
          </select>
        </Field>
      </ActionForm>
    </div>
  )
}
