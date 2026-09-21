import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, Info } from 'lucide-react'
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
import { providers } from '../providers/service'
import { drivers as providerDrivers } from '../drivers/service'
import { vehicleTypes } from '../logistics/types'
import { independentDrivers } from './service'
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

/** A DRIVER is the account and the person; independent is an added operational capability. */
function CapabilityNote() {
  return (
    <p className="notice capability-note">
      <Info size={16} aria-hidden="true" />
      Un repartidor es una cuenta y una persona. La habilitación independiente
      es una capacidad operativa adicional que Mandaria concede: le permite
      tomar servicios por su cuenta, con sus propios vehículos, sin dejar de
      pertenecer a su proveedor.
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
  const valid =
    !status || (independentStatuses as readonly string[]).includes(status)
  const filters = { page, pageSize: PAGE_SIZE, status: status || undefined }
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
            Habilitar repartidor
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
          <select
            aria-label="Filtrar por estado de habilitación"
            value={status}
            onChange={(event) => {
              const next = new URLSearchParams()
              if (event.target.value) next.set('status', event.target.value)
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
        ) : query.isError ? (
          <ErrorState
            error={query.error}
            retry={() => {
              void query.refetch()
            }}
          />
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
              status
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
 * V1.9 never creates accounts: it grants a capability to a Driver that already exists. The
 * candidate is chosen from a provider's real driver list, the only enumeration the API offers.
 */
function EnableDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const notify = useFeedback()
  const [providerId, setProviderId] = useState('')
  const [driverId, setDriverId] = useState('')
  const providerList = useQuery({
    queryKey: ['independent-enable', 'providers'],
    queryFn: ({ signal }) =>
      providers.list({ page: 1, pageSize: 100, status: 'ACTIVE' }, signal),
  })
  const driverList = useQuery({
    queryKey: ['independent-enable', 'drivers', providerId],
    queryFn: ({ signal }) =>
      providerDrivers.list(
        { role: 'SUPER_ADMIN', providerId },
        { page: 1, pageSize: 100 },
        signal,
      ),
    enabled: UUID.test(providerId),
  })
  const eligible = (driverList.data?.items ?? []).filter(
    (driver) => driver.status === 'ACTIVE',
  )
  return (
    <Modal title="Habilitar repartidor independiente" onClose={onClose}>
      <p className="modal-description">
        Elige un repartidor que ya exista y esté activo. Mandaria no crea
        cuentas aquí: sólo le concede la capacidad de operar por su cuenta.
      </p>
      <ActionForm
        initialDirty
        submitLabel="Habilitar"
        cancelLabel="Volver"
        onCancel={onClose}
        onSubmit={async (data) => {
          if (!UUID.test(driverId))
            throw new ApiError(400, 'Elige un repartidor.')
          const raw = String(data.get('reason') ?? '').trim()
          const reason = raw ? reasonOf(raw) : undefined
          await independentDrivers.enable(driverId, reason)
          await refreshIndependent(driverId)
          notify('Repartidor habilitado como independiente.')
          navigate(`/independent-drivers/${driverId}`)
        }}
      >
        <Field label="Proveedor" hint="Sólo para localizar al repartidor.">
          <select
            value={providerId}
            disabled={providerList.isPending}
            onChange={(event) => {
              setProviderId(event.target.value)
              setDriverId('')
            }}
          >
            <option value="">
              {providerList.isPending
                ? 'Cargando proveedores…'
                : 'Selecciona un proveedor'}
            </option>
            {providerList.data?.items.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Repartidor"
          hint="Sólo aparecen repartidores activos; el backend vuelve a comprobarlo."
        >
          <select
            value={driverId}
            disabled={!UUID.test(providerId) || driverList.isPending}
            onChange={(event) => setDriverId(event.target.value)}
          >
            <option value="">
              {!UUID.test(providerId)
                ? 'Elige antes un proveedor'
                : driverList.isPending
                  ? 'Cargando repartidores…'
                  : eligible.length
                    ? 'Selecciona un repartidor'
                    : 'Este proveedor no tiene repartidores activos'}
            </option>
            {eligible.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Motivo (opcional)"
          hint={`Entre ${REASON_MIN} y ${REASON_MAX} caracteres. Queda en la auditoría: no incluyas datos personales.`}
        >
          <textarea name="reason" maxLength={REASON_MAX} rows={3} />
        </Field>
      </ActionForm>
    </Modal>
  )
}

export function IndependentDriverDetail() {
  const { driverId = '' } = useParams()
  if (!UUID.test(driverId)) return <ErrorPage code={404} />
  return <ProfileRecord key={driverId} driverId={driverId} />
}
function ProfileRecord({ driverId }: { driverId: string }) {
  const query = useQuery({
    queryKey: independentKeys.detail(driverId),
    queryFn: ({ signal }) => independentDrivers.get(driverId, signal),
    staleTime: 0,
  })
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
  const approved = profile.status === 'APPROVED'
  return (
    <>
      <PageTitle
        title={profile.driver.name}
        description={`Habilitación independiente · cuenta ${driverStatusLabels[profile.driver.status]}`}
        back="/independent-drivers"
        action={
          approved ? (
            <div className="row-actions">
              <button
                className="button secondary destructive"
                onClick={() => setClosing('reject')}
              >
                Rechazar
              </button>
              <button
                className="button secondary destructive"
                onClick={() => setClosing('suspend')}
              >
                Suspender
              </button>
            </div>
          ) : (
            <button className="button" onClick={() => setReEnabling(true)}>
              Habilitar
            </button>
          )
        }
      />
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
            ['Habilitado', profile.approvedAt ? date(profile.approvedAt) : '—'],
            [
              'Suspendido',
              profile.suspendedAt ? date(profile.suspendedAt) : '—',
            ],
            ['Rechazado', profile.rejectedAt ? date(profile.rejectedAt) : '—'],
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
      <IndependentVehicles driverId={profile.driverId} />
      {closing && (
        <CloseDialog
          driverId={profile.driverId}
          name={profile.driver.name}
          kind={closing}
          onClose={() => setClosing(null)}
        />
      )}
      {reEnabling && (
        <Confirm
          title="Habilitar repartidor"
          label="Habilitar"
          description={`${profile.driver.name} podrá volver a tomar servicios por su cuenta, con sus propios vehículos.`}
          onClose={() => setReEnabling(false)}
          onConfirm={async () => {
            await independentDrivers.enable(profile.driverId)
            await refreshIndependent(profile.driverId)
            notify('Habilitación restablecida.')
          }}
        />
      )}
    </>
  )
}

function CloseDialog({
  driverId,
  name,
  kind,
  onClose,
}: {
  driverId: string
  name: string
  kind: 'suspend' | 'reject'
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
        repartidor y su pertenencia al proveedor no cambian.
      </p>
      <ActionForm
        initialDirty
        submitLabel={suspend ? 'Suspender' : 'Rechazar'}
        cancelLabel="Volver"
        onCancel={onClose}
        onSubmit={async (data) => {
          const reason = reasonOf(String(data.get('reason') ?? ''))
          // The state is never changed locally first: the backend refuses with a service in course.
          await independentDrivers[suspend ? 'suspend' : 'reject'](
            driverId,
            reason,
          )
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
          <textarea name="reason" required maxLength={REASON_MAX} rows={4} />
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
        <Table
          stacked
          rows={query.data}
          columns={[
            {
              label: 'Vehículo',
              render: (row) => (
                <span className="cell-meta">
                  {row.identifier}
                  <small>{labels[row.type] ?? row.type}</small>
                </span>
              ),
            },
            {
              label: 'Estado',
              render: (row) => <Badge value={row.status} />,
            },
            {
              label: 'Detalle',
              render: (row) =>
                [row.brand, row.model, row.color].filter(Boolean).join(' ') ||
                '—',
            },
            { label: 'Placa', render: (row) => row.plate ?? '—' },
            {
              label: 'Acciones',
              render: (row) => (
                <VehicleStatusAction driverId={driverId} vehicle={row} />
              ),
            },
          ]}
        />
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

function VehicleStatusAction({
  driverId,
  vehicle,
}: {
  driverId: string
  vehicle: IndependentVehicle
}) {
  const notify = useFeedback()
  const [busy, setBusy] = useState(false)
  const active = vehicle.status === 'ACTIVE'
  return (
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
