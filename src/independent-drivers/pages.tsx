import './detail.css'
import { DetailHeader, CopyIdentifier } from './detail-summary'
import { categories } from '../driver-category/service'
import { DeclaredPhone } from './contact'
import { useAuth } from '../auth/context'
import { canApprove } from '../driver-category/contract'
import { CategorySummary } from '../driver-category/components'
import { IndependentOfferZones } from '../independent-zones/panel'
import { IndependentVerificationCases } from './verification-cases'
import { DriverActivity } from '../driver-activity/panels'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, Info, Bike, Search } from 'lucide-react'
import {
  ActionForm,
  Badge,
  Confirm,
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
import { date, labels } from '../utils/format'
import { vehicleTypes } from '../logistics/types'
import { independentDrivers } from './service'
import { AdminCreditsPanel } from '../credits/components'
import { independentKeys, refreshIndependent } from './queries'
import {
  driverStatusLabels,
  independentStatusHints,
  independentStatusLabels,
} from './format'
import {
  REASON_MAX,
  REASON_MIN,
  independentStatuses,
  type IndependentDriverProfile,
  type IndependentStatus,
  type IndependentVehicle,
} from './types'

const PAGE_SIZE = 20
const SEARCH_MAX = 100
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const reasonOf = (raw: string) => {
  const reason = raw.trim()
  if (reason.length < REASON_MIN || reason.length > REASON_MAX)
    throw new ApiError(
      400,
      `Escribe el motivo con entre ${REASON_MIN} y ${REASON_MAX} caracteres.`,
    )
  return reason
}

/** Category, approval and historical profile are separate dimensions. */
function CapabilityNote() {
  return (
    <p className="notice capability-note">
      <Info size={16} aria-hidden="true" />
      Flotilla e independiente son pertenencias excluyentes. Suspender o
      rechazar no termina la pertenencia independiente. La salida de flotilla
      debe completarse antes de una habilitación expresa, sin transferir
      recursos ni iniciar recepción.
    </p>
  )
}

export function IndependentDriversPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(
    1,
    Math.min(100000, Math.trunc(Number(params.get('page')) || 1)),
  )
  const status = params.get('status') ?? ''
  const search = (params.get('q') ?? '').trim().slice(0, SEARCH_MAX)
  const [text, setText] = useState(search)
  // Typing waits a moment and restarts from page 1; the URL keeps the search.
  useEffect(() => {
    const next = text.trim().slice(0, SEARCH_MAX)
    if (next === search) return
    const timer = window.setTimeout(() => {
      setParams((current) => {
        const updated = new URLSearchParams(current)
        if (next) updated.set('q', next)
        else updated.delete('q')
        updated.set('page', '1')
        return updated
      })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [text, search, setParams])
  const valid =
    !status || (independentStatuses as readonly string[]).includes(status)
  const filters = {
    page,
    pageSize: PAGE_SIZE,
    status: status || undefined,
    search: search || undefined,
  }
  const query = useQuery({
    queryKey: independentKeys.list(filters),
    queryFn: ({ signal }) => independentDrivers.list(filters, signal),
    enabled: valid,
  })
  const [enabling, setEnabling] = useState(false)
  return (
    <>
      <PageTitle
        title="Repartidores independientes"
        description="Quién puede tomar servicios por su cuenta, con sus propios vehículos."
        action={
          <button className="button" onClick={() => setEnabling(true)}>
            Consultar candidato
          </button>
        }
      />
      <div className="panel">
        <div className="panel-toolbar">
          <div>
            <h2>Habilitaciones</h2>
            <p>De la más reciente a la más antigua</p>
          </div>
        </div>
        <div className="panel-body">
          <CapabilityNote />
        </div>
        <div className="filters">
          <label className="search">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              aria-label="Buscar repartidor por nombre"
              placeholder="Buscar por nombre"
              value={text}
              maxLength={SEARCH_MAX}
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <select
            aria-label="Filtrar por estado de habilitación"
            value={status}
            onChange={(event) => {
              const next = new URLSearchParams()
              if (event.target.value) next.set('status', event.target.value)
              if (search) next.set('q', search)
              next.set('page', '1')
              setParams(next)
            }}
          >
            <option value="">Todos los estados</option>
            {independentStatuses.map((value) => (
              <option key={value} value={value}>
                {independentStatusLabels[value]}
              </option>
            ))}
          </select>
        </div>
        {!valid ? (
          <div className="panel-body">
            <p className="inline-error" role="alert">
              El estado seleccionado no es válido.
            </p>
          </div>
        ) : query.isPending ? (
          <Loading />
        ) : query.isError &&
          search &&
          query.error instanceof ApiError &&
          query.error.status === 400 ? (
          <div className="panel-body">
            <p role="status">
              La búsqueda por nombre requiere la versión actualizada del
              backend. Borra la búsqueda para ver el listado.
            </p>
          </div>
        ) : query.isError ? (
          <>
            <p>
              Si el Driver aún no tiene perfil, esta API responde 404. La
              categoría se consulta por separado para un Driver conocido; no se
              deduce de la ausencia del perfil.
            </p>
            <ErrorState
              error={query.error}
              retry={() => {
                void query.refetch()
              }}
            />
          </>
        ) : query.data.items.length ? (
          <>
            <Table
              stacked
              rows={query.data.items}
              columns={[
                {
                  label: 'Repartidor',
                  render: (row) => (
                    <Link
                      className="entity-name"
                      to={`/independent-drivers/${encodeURIComponent(row.driverId)}`}
                    >
                      {row.driver.name}
                      <small>
                        Cuenta {driverStatusLabels[row.driver.status]}
                      </small>
                    </Link>
                  ),
                },
                {
                  label: 'Habilitación',
                  render: (row) => (
                    <Badge
                      value={row.status}
                      label={independentStatusLabels[row.status]}
                    />
                  ),
                },
                {
                  label: 'Categoría vigente',
                  render: (row) =>
                    row.driverCategory?.category ?? 'Sin confirmar',
                },
                {
                  label: 'Habilitado',
                  render: (row) =>
                    row.approvedAt ? date(row.approvedAt) : '—',
                },
                {
                  label: 'Motivo',
                  render: (row) => row.reason ?? '—',
                },
                {
                  label: 'Acciones',
                  render: (row) => (
                    <Link
                      className="table-action"
                      to={`/independent-drivers/${encodeURIComponent(row.driverId)}`}
                      aria-label={`Ver habilitación de ${row.driver.name}`}
                    >
                      Ver detalle <ArrowUpRight size={15} />
                    </Link>
                  ),
                },
              ]}
            />
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
          </>
        ) : (
          <Empty
            title="No hay repartidores independientes."
            description={
              search
                ? `Ningún repartidor coincide con «${search}»${status ? ' en este estado' : ''}.`
                : status
                  ? 'Ninguna habilitación coincide con el filtro.'
                  : 'Habilita a un repartidor existente para que pueda tomar servicios por su cuenta.'
            }
          />
        )}
      </div>
      {enabling && <EnableDialog onClose={() => setEnabling(false)} />}
    </>
  )
}

/**
 * No independent candidate catalog exists. Do not offer affiliated drivers for approval.
 */
function EnableDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [driverId, setDriverId] = useState('')
  return (
    <Modal title="Consultar candidato independiente" onClose={onClose}>
      <p>
        No se ofrecen conductores afiliados para habilitación independiente.
        Consulta un Driver conocido; el perfil histórico no concede pertenencia.
        El servidor aún no ofrece un catálogo administrativo de candidatos sin
        perfil.
      </p>
      <ActionForm
        initialDirty
        submitLabel="Consultar perfil"
        onSubmit={async () => {
          if (!UUID.test(driverId))
            throw new ApiError(400, 'Indica un Driver ID válido.')
          navigate('/independent-drivers/' + driverId)
          onClose()
        }}
      >
        <Field label="Driver ID">
          <input
            value={driverId}
            onChange={(e) => setDriverId(e.target.value.trim())}
          />
        </Field>
      </ActionForm>
    </Modal>
  )
}

export function IndependentDriverDetail() {
  const { driverId = '' } = useParams()
  const { user, loading, expired } = useAuth()
  if (loading) return <Loading />
  if (user?.role !== 'SUPER_ADMIN' || expired || !user.active)
    return <ErrorPage code={403} />
  if (!UUID.test(driverId)) return <ErrorPage code={404} />
  return <ProfileRecord key={`${user.id}:${driverId}`} driverId={driverId} />
}
function ProfileRecord({ driverId }: { driverId: string }) {
  const query = useQuery({
    queryKey: independentKeys.detail(driverId),
    queryFn: ({ signal }) => independentDrivers.get(driverId, signal),
    staleTime: 0,
    refetchInterval: 15000,
  })
  if (query.error instanceof ApiError && query.error.status === 404)
    return <MissingProfile driverId={driverId} />
  if (query.isPending || query.isError)
    return (
      <>
        <PageTitle
          title="Repartidor independiente"
          back="/independent-drivers"
        />
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
  return <ProfileContent profile={query.data} />
}

function ProfileContent({ profile }: { profile: IndependentDriverProfile }) {
  const notify = useFeedback()
  const [closing, setClosing] = useState<'suspend' | 'reject' | null>(null)
  const [reEnabling, setReEnabling] = useState(false)
  const [reason, setReason] = useState('')
  const [decisionError, setDecisionError] = useState('')
  const approved = profile.status === 'APPROVED'
  return (
    <div className="independent-detail">
      <DetailHeader profile={profile} />
      <div className="independent-detail-grid">
        <div className="independent-detail-main">
          <section className="panel" aria-labelledby="independent-summary">
            <div className="panel-toolbar">
              <h2 id="independent-summary">Habilitación</h2>
              <Badge
                value={profile.status}
                label={independentStatusLabels[profile.status]}
              />
            </div>
            <InfoGrid
              items={[
                ['Estado', independentStatusHints[profile.status]],
                [
                  'Cuenta del repartidor',
                  `${driverStatusLabels[profile.driver.status]} · ${labels[profile.driver.availability] ?? profile.driver.availability}`,
                ],
                [
                  'Habilitado',
                  profile.approvedAt ? date(profile.approvedAt) : '—',
                ],
                [
                  'Suspendido',
                  profile.suspendedAt ? date(profile.suspendedAt) : '—',
                ],
                [
                  'Rechazado',
                  profile.rejectedAt ? date(profile.rejectedAt) : '—',
                ],
                ['Motivo', profile.reason ?? 'Sin motivo registrado'],
              ]}
            />
            <div className="panel-body">
              <CapabilityNote />
            </div>
            <p className="panel-note">
              Suspender o rechazar con un servicio en curso se rechaza: Mandaria
              prefiere no cancelar en silencio una entrega en marcha.
            </p>
          </section>
          <DriverActivity key={profile.driverId} driverId={profile.driverId} />
          <IndependentVerificationCases
            key={profile.id}
            profileId={profile.id}
          />
          {/* V1.10-F: the independent capability has its own credit account, never the provider's. */}
          <AdminCreditsPanel
            scope="independent"
            ownerId={profile.driverId}
            ownerName={profile.driver.name}
            missingDescription="Este repartidor todavía no tiene cuenta propia de créditos: la recibe al aprobarse su habilitación independiente. No es un saldo en cero."
          />
          <IndependentVehicles driverId={profile.driverId} />
        </div>
        <aside className="independent-detail-side">
          <section className="panel" aria-labelledby="independent-contact">
            <div className="panel-toolbar">
              <h2 id="independent-contact">Información del usuario</h2>
            </div>
            <InfoGrid
              items={[
                ['Nombre', profile.driver.name],
                [
                  'Correo electrónico',
                  profile.driver.user?.email || 'No disponible',
                ],
                [
                  'Teléfono de contacto declarado',
                  <DeclaredPhone
                    key={profile.driverId}
                    driverId={profile.driverId}
                  />,
                ],
                [
                  'Acceso a la cuenta',
                  profile.driver.user
                    ? profile.driver.user.active
                      ? 'Activo'
                      : 'Inactivo'
                    : 'No disponible',
                ],
                ['Alta del perfil independiente', date(profile.createdAt)],
                ['Última actualización del perfil', date(profile.updatedAt)],
                [
                  'ID de usuario',
                  <CopyIdentifier
                    label="usuario"
                    value={profile.driver.user?.id}
                  />,
                ],
                [
                  'ID de conductor',
                  <CopyIdentifier label="conductor" value={profile.driverId} />,
                ],
                [
                  'ID de perfil independiente',
                  <CopyIdentifier
                    label="perfil independiente"
                    value={profile.id}
                  />,
                ],
              ]}
            />
            <p className="panel-note">
              Contacto declarado por el conductor. No acredita verificación
              telefónica.
            </p>
          </section>
          <IndependentOfferZones
            profileId={profile.id}
            driverId={profile.driverId}
            canEdit={
              profile.driverCategory?.category === 'INDEPENDENT' &&
              profile.driverCategory.independentMembershipState === 'CURRENT'
            }
          />
          <section
            className="panel panel-body independent-decision"
            aria-labelledby="independent-decision-title"
          >
            <h2 id="independent-decision-title">
              Decisión sobre la habilitación
            </h2>
            <p>Escribe el motivo antes de confirmar una decisión.</p>
            <Field
              label="Motivo de habilitación"
              hint="Entre 3 y 500 caracteres. No incluyas datos personales."
            >
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={REASON_MAX}
                rows={4}
              />
            </Field>
            {approved && profile.driverCategory?.category === 'INDEPENDENT' ? (
              <div className="row-actions">
                <button
                  className="button secondary destructive"
                  disabled={!reason.trim()}
                  onClick={() => setClosing('suspend')}
                >
                  Suspender
                </button>
                <button
                  className="button destructive"
                  disabled={!reason.trim()}
                  onClick={() => setClosing('reject')}
                >
                  Rechazar
                </button>
              </div>
            ) : (
              <button
                className="button"
                disabled={!canApprove(profile.driverCategory) || !reason.trim()}
                onClick={() => setReEnabling(true)}
              >
                Habilitar
              </button>
            )}
            <p className="muted">
              Suspender o rechazar con un servicio en curso se rechaza: Mandaria
              prefiere no cancelar en silencio una entrega en marcha.
            </p>
            {decisionError && (
              <p className="inline-error" role="status">
                {decisionError}
              </p>
            )}
          </section>
        </aside>
      </div>
      {closing && (
        <CloseDialog
          driverId={profile.driverId}
          name={profile.driver.name}
          kind={closing}
          initialReason={reason}
          onError={setDecisionError}
          onClose={() => setClosing(null)}
        />
      )}
      {reEnabling && (
        <Confirm
          title="Habilitar repartidor"
          label="Habilitar"
          description={`Se revisará la categoría vigente de ${profile.driver.name}. La aprobación no inicia recepción ni transfiere recursos. Motivo: ${reason}`}
          onClose={() => setReEnabling(false)}
          onConfirm={async () => {
            const fresh = await independentDrivers.get(profile.driverId)
            if (
              !canApprove(fresh.driverCategory) ||
              fresh.driverCategory?.categoryRevision !==
                profile.driverCategory?.categoryRevision
            ) {
              await refreshIndependent(profile.driverId)
              throw new ApiError(
                409,
                'La categoría cambió o impide habilitar. Revisa el estado vigente.',
              )
            }
            try {
              await independentDrivers.enable(
                profile.driverId,
                reasonOf(reason),
              )
            } finally {
              await refreshIndependent(profile.driverId)
            }
            notify('Habilitación restablecida.')
          }}
        />
      )}
    </div>
  )
}

function CloseDialog({
  driverId,
  name,
  kind,
  initialReason,
  onError,
  onClose,
}: {
  driverId: string
  name: string
  kind: 'suspend' | 'reject'
  initialReason: string
  onError: (message: string) => void
  onClose: () => void
}) {
  const notify = useFeedback()
  const suspend = kind === 'suspend'
  return (
    <Modal
      title={suspend ? 'Suspender habilitación' : 'Rechazar habilitación'}
      onClose={onClose}
    >
      <p className="modal-description">
        {name} dejará de poder tomar servicios por su cuenta. Su cuenta de
        repartidor y su pertenencia independiente no cambian.
      </p>
      <ActionForm
        initialDirty
        submitLabel={suspend ? 'Suspender' : 'Rechazar'}
        cancelLabel="Volver"
        onCancel={onClose}
        onSubmit={async (data) => {
          const reason = reasonOf(String(data.get('reason') ?? ''))
          // The state is never changed locally first: the backend refuses with a service in course.
          try {
            await independentDrivers[suspend ? 'suspend' : 'reject'](
              driverId,
              reason,
            )
            onError('')
          } catch (error) {
            onError(
              error instanceof ApiError
                ? error.message
                : 'No se pudo completar la decisión. Inténtalo nuevamente.',
            )
            throw error
          }
          await refreshIndependent(driverId)
          notify(
            suspend ? 'Habilitación suspendida.' : 'Habilitación rechazada.',
          )
          onClose()
        }}
      >
        <Field
          label="Motivo"
          hint={`Obligatorio, entre ${REASON_MIN} y ${REASON_MAX} caracteres. No incluyas datos personales.`}
        >
          <textarea
            name="reason"
            defaultValue={initialReason}
            required
            maxLength={REASON_MAX}
            rows={4}
          />
        </Field>
      </ActionForm>
    </Modal>
  )
}

/** Independent vehicles belong to the profile and never carry a providerId. */
function IndependentVehicles({ driverId }: { driverId: string }) {
  const [adding, setAdding] = useState(false)
  const query = useQuery({
    queryKey: independentKeys.vehicles(driverId),
    queryFn: ({ signal }) => independentDrivers.vehicles(driverId, signal),
    staleTime: 0,
  })
  return (
    <section className="panel" aria-labelledby="independent-vehicles">
      <div className="panel-toolbar">
        <div>
          <h2 id="independent-vehicles">Vehículos propios</h2>
          <p>Del repartidor, no del proveedor</p>
        </div>
        <button
          className="button secondary small"
          onClick={() => setAdding(true)}
        >
          Agregar vehículo
        </button>
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState
          error={query.error}
          retry={() => {
            void query.refetch()
          }}
        />
      ) : query.data.length ? (
        <div className="independent-vehicles-list">
          {query.data.map((row) => (
            <article className="independent-vehicle" key={row.id}>
              <div className="independent-vehicle-info">
                <span className="independent-vehicle-icon">
                  <Bike size={24} aria-hidden="true" />
                </span>
                <div>
                  <strong>{row.identifier}</strong> <Badge value={row.status} />
                  <p>
                    {[
                      labels[row.type] ?? row.type,
                      row.brand,
                      row.model,
                      row.year,
                      row.color,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
              </div>
              <div className="independent-vehicle-actions">
                <code>{row.plate ?? '—'}</code>
                <VehicleStatusAction driverId={driverId} vehicle={row} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="Sin vehículos propios"
          description="Un repartidor independiente necesita al menos un vehículo activo para poder tomar servicios."
        />
      )}
      <p className="panel-note">
        La pertenencia es excluyente: un vehículo independiente nunca pertenece
        a un proveedor. Desactivar uno que está ejecutando un servicio se
        rechaza.
      </p>
      {adding && (
        <VehicleDialog driverId={driverId} onClose={() => setAdding(false)} />
      )}
    </section>
  )
}

export function VehicleStatusAction({
  driverId,
  vehicle,
}: {
  driverId: string
  vehicle: IndependentVehicle
}) {
  const notify = useFeedback()
  const [busy, setBusy] = useState(false)
  const [editingPlate, setEditingPlate] = useState(false)
  const active = vehicle.status === 'ACTIVE'
  return (
    <>
      <button
        className="button secondary small"
        onClick={() => setEditingPlate(true)}
      >
        Editar placa
      </button>
      {editingPlate && (
        <Modal
          title={'Placa de ' + vehicle.identifier}
          onClose={() => setEditingPlate(false)}
        >
          <p>
            Actualizar la placa conserva el vehículo y su historial. Si ya se
            presentó un expediente, el cambio puede impedir su aprobación por
            diferencia con los datos presentados. No aprueba documentos ni
            activa la unidad.
          </p>
          <ActionForm
            submitLabel="Guardar placa"
            onCancel={() => setEditingPlate(false)}
            onSubmit={async (data) => {
              const plate = String(data.get('plate') || '')
                .trim()
                .toUpperCase()
              if (!/^[A-Z0-9][A-Z0-9 -]{0,14}$/.test(plate))
                throw new Error(
                  'Indica una placa de hasta 15 caracteres: letras, números, espacios o guiones.',
                )
              await independentDrivers.updateVehicle(driverId, vehicle.id, {
                plate,
              })
              await refreshIndependent(driverId)
              notify(
                'Placa actualizada. Revisa el expediente antes de decidir.',
              )
              setEditingPlate(false)
            }}
          >
            <Field label="Placa del vehículo">
              <input
                name="plate"
                required
                maxLength={15}
                defaultValue={vehicle.plate || ''}
              />
            </Field>
          </ActionForm>
        </Modal>
      )}
      <button
        className="button secondary small"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await independentDrivers.updateVehicle(driverId, vehicle.id, {
              status: active ? 'INACTIVE' : 'ACTIVE',
            })
            await refreshIndependent(driverId)
            notify(active ? 'Vehículo desactivado.' : 'Vehículo activado.')
          } finally {
            setBusy(false)
          }
        }}
      >
        {active ? 'Desactivar' : 'Activar'}
      </button>
    </>
  )
}

function VehicleDialog({
  driverId,
  onClose,
}: {
  driverId: string
  onClose: () => void
}) {
  const notify = useFeedback()
  return (
    <Modal title="Agregar vehículo propio" onClose={onClose}>
      <p className="modal-description">
        El dueño se deriva del repartidor: el vehículo queda sin proveedor.
      </p>
      <ActionForm
        submitLabel="Agregar vehículo"
        cancelLabel="Volver"
        onCancel={onClose}
        onSubmit={async (data) => {
          const identifier = String(data.get('identifier') ?? '')
            .trim()
            .toUpperCase()
          if (!identifier || identifier.length > 50)
            throw new ApiError(
              400,
              'El identificador admite de 1 a 50 caracteres.',
            )
          const text = (key: string) => {
            const value = String(data.get(key) ?? '').trim()
            return value ? value : null
          }
          const yearRaw = String(data.get('year') ?? '').trim()
          const year = yearRaw ? Number(yearRaw) : null
          if (year !== null && !Number.isInteger(year))
            throw new ApiError(400, 'El año debe ser un número entero.')
          await independentDrivers.addVehicle(driverId, {
            identifier,
            type: String(data.get('type')) as IndependentVehicle['type'],
            brand: text('brand'),
            model: text('model'),
            color: text('color'),
            plate: text('plate'),
            year,
          })
          await refreshIndependent(driverId)
          notify('Vehículo agregado.')
          onClose()
        }}
      >
        <div className="form-grid">
          <Field
            label="Identificador"
            hint="Único dentro de este repartidor, no global."
          >
            <input name="identifier" required maxLength={50} />
          </Field>
          <Field label="Tipo">
            <select name="type" defaultValue="MOTORCYCLE">
              {vehicleTypes.map((type) => (
                <option key={type} value={type}>
                  {labels[type] ?? type}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Marca">
            <input name="brand" maxLength={50} />
          </Field>
          <Field label="Modelo">
            <input name="model" maxLength={50} />
          </Field>
          <Field label="Color">
            <input name="color" maxLength={30} />
          </Field>
          <Field label="Año">
            <input name="year" type="number" min={1900} max={2100} />
          </Field>
          <Field label="Placa" hint="Opcional; vacío para bicicletas.">
            <input name="plate" maxLength={20} />
          </Field>
        </div>
      </ActionForm>
    </Modal>
  )
}

export type { IndependentStatus }

function MissingProfile({ driverId }: { driverId: string }) {
  const query = useQuery({
    queryKey: ['driver-category', driverId],
    queryFn: ({ signal }) => categories.get(driverId, signal),
    retry: false,
    staleTime: 0,
  })
  const [reason, setReason] = useState(''),
    [confirm, setConfirm] = useState(false)
  return (
    <>
      <PageTitle
        title="Driver sin perfil independiente"
        back="/independent-drivers"
      />
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <CategorySummary value={query.data} />
          <p>
            Referencia autorizada: {driverId}. Aprobación comercial separada de
            expediente, licencia, términos, vehículo, créditos y turno.
          </p>
          {canApprove(query.data) && (
            <>
              <Field label="Motivo de habilitación">
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={REASON_MAX}
                />
              </Field>
              <button
                disabled={query.isFetching}
                onClick={() => setConfirm(true)}
              >
                Habilitar independiente
              </button>
            </>
          )}
          {confirm && (
            <Confirm
              title="Habilitar independiente"
              description="La aprobación no inicia turno ni concede requisitos documentales. Se revalidará la categoría en el servidor."
              onClose={() => setConfirm(false)}
              onConfirm={async () => {
                const fresh = await categories.get(driverId)
                if (
                  !canApprove(fresh) ||
                  fresh.categoryRevision !== query.data.categoryRevision
                ) {
                  await query.refetch()
                  throw new ApiError(
                    409,
                    'La categoría cambió; revisa antes de confirmar.',
                  )
                }
                try {
                  await independentDrivers.enable(driverId, reasonOf(reason))
                  setConfirm(false)
                } finally {
                  await query.refetch()
                  await refreshIndependent(driverId)
                }
              }}
            />
          )}
        </>
      )}
    </>
  )
}
