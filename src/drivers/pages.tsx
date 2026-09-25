import { resourceLink, useResourceFilters } from '../logistics/navigation'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ActionForm,
  Badge,
  Confirm,
  ErrorState,
  Field,
  InfoGrid,
  Loading,
  PageTitle,
  Pagination,
  Table,
} from '../components/ui'
import { useFeedback } from '../components/feedback-context'
import {
  CapacityCards,
  ProviderScope,
  ResourceFilters,
} from '../logistics/components'
import {
  invalidateLogistics,
  logisticsKey,
  useCapacity,
} from '../logistics/queries'
import { AssignmentHistory, DriverAssignment } from '../assignments/components'
import { drivers } from './service'
import {
  InvitationsPanel,
  InviteButton,
  InviteDriverDialog,
} from '../invitations/components'
import type { InvitationScope } from '../invitations/types'
import { date, labels } from '../utils/format'
import type { Driver, DriverStatus, ProviderContext } from '../logistics/types'

export function DriversPage() {
  return (
    <>
      <PageTitle
        title="Repartidores"
        description="Personas que pueden transportar para cada proveedor."
      />
      <ProviderScope>
        {(scope) => <DriverList key={scope.providerId} scope={scope} />}
      </ProviderScope>
    </>
  )
}
function DriverList({ scope }: { scope: ProviderContext }) {
  const filters = useResourceFilters()
  const params = {
    page: filters.page,
    pageSize: 20,
    search: filters.search,
    status: filters.status,
    availability: filters.availability,
  }
  const query = useQuery({
    queryKey: [...logisticsKey(scope), 'drivers', 'list', params],
    queryFn: ({ signal }) => drivers.list(scope, params, signal),
  })
  const usage = useCapacity(scope)
  const canCreate =
    usage.isSuccess &&
    !usage.isError &&
    usage.data.drivers.count < usage.data.drivers.max
  const [inviting, setInviting] = useState(false)
  // PROVIDER_ADMIN never sends role or providerId in the body; the membership guard scopes it.
  const invitationScope: InvitationScope & { providerId: string } =
    scope.role === 'SUPER_ADMIN'
      ? { kind: 'admin', providerId: scope.providerId, role: 'DRIVER' }
      : { kind: 'provider', providerId: scope.providerId }
  return (
    <>
      <CapacityCards scope={scope} />
      <div className="panel">
        <div className="panel-toolbar">
          <h2>Repartidores del proveedor</h2>
          <div className="row-actions">
            <InviteButton
              label="Invitar repartidor"
              disabled={!canCreate}
              onClick={() => setInviting(true)}
            />
            {canCreate ? (
              <Link
                className="button"
                to={resourceLink('drivers', scope.providerId, 'new')}
              >
                Nuevo repartidor
              </Link>
            ) : (
              <button className="button" disabled>
                Nuevo repartidor
              </button>
            )}
          </div>
        </div>
        <ResourceFilters kind="drivers" />
        {query.isPending ? (
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
            <Table
              rows={query.data.items}
              emptyTitle="No hay repartidores"
              empty="Invita a un repartidor o registra uno con una cuenta existente."
              columns={[
                {
                  label: 'Repartidor',
                  render: (row) => (
                    <Link
                      className="entity-name"
                      to={resourceLink('drivers', scope.providerId, row.id)}
                    >
                      {row.name}
                      <small>{row.user.email}</small>
                    </Link>
                  ),
                },
                { label: 'Proveedor', render: () => scope.name },
                {
                  label: 'Estado',
                  render: (row) => <Badge value={row.status} />,
                },
                {
                  label: 'Disponibilidad',
                  render: (row) => <Badge value={row.availability} />,
                },
                {
                  label: 'Vehículo actual',
                  render: (row) =>
                    row.currentAssignment ? (
                      <Link
                        to={resourceLink(
                          'vehicles',
                          scope.providerId,
                          row.currentAssignment.vehicle.id,
                        )}
                      >
                        {row.currentAssignment.vehicle.identifier}
                      </Link>
                    ) : (
                      'Sin vehículo'
                    ),
                },
                { label: 'Creación', render: (row) => date(row.createdAt) },
                {
                  label: 'Acciones',
                  render: (row) => (
                    <Link
                      className="table-action"
                      to={resourceLink('drivers', scope.providerId, row.id)}
                    >
                      Ver detalle
                    </Link>
                  ),
                },
              ]}
            />
            <Pagination
              page={filters.page}
              total={query.data.total}
              totalPages={query.data.totalPages}
              onPage={filters.onPage}
            />
          </>
        )}
      </div>
      <InvitationsPanel
        scope={invitationScope}
        title="Invitaciones de repartidores"
        description="Personas invitadas que todavía no activan su cuenta."
        showProvider={false}
      />
      {inviting && (
        <InviteDriverDialog
          scope={invitationScope}
          providerName={scope.name}
          onClose={() => setInviting(false)}
        />
      )}
    </>
  )
}
export function DriverNew() {
  return (
    <>
      <PageTitle title="Nuevo repartidor" back="/drivers" />
      <ProviderScope>
        {(scope) => <CreateDriver key={scope.providerId} scope={scope} />}
      </ProviderScope>
    </>
  )
}
function CreateDriver({ scope }: { scope: ProviderContext }) {
  const usage = useCapacity(scope)
  const navigate = useNavigate()
  const notify = useFeedback()
  if (usage.isPending) return <Loading />
  if (usage.isError)
    return (
      <ErrorState
        error={usage.error}
        retry={() => {
          void usage.refetch()
        }}
      />
    )
  if (usage.data.drivers.count >= usage.data.drivers.max)
    return (
      <div className="panel panel-body">
        <h2>Límite alcanzado</h2>
        <p>
          Repartidores: {usage.data.drivers.count} / {usage.data.drivers.max}.
          Solicita ampliar el límite operativo.
        </p>
      </div>
    )
  return (
    <div className="panel form-panel">
      <ActionForm
        submitLabel="Crear repartidor"
        onSubmit={async (data) => {
          const driver = await drivers.create(scope, {
            name: String(data.get('name')).trim(),
            userId: String(data.get('userId')).trim(),
          })
          await invalidateLogistics(scope)
          notify('Repartidor creado correctamente.')
          navigate(resourceLink('drivers', scope.providerId, driver.id))
        }}
      >
        <Field label="Nombre operativo">
          <input name="name" required maxLength={100} pattern=".*\S.*" />
        </Field>
        <Field
          label="ID del usuario"
          hint="UUID de una cuenta existente, activa y con rol Repartidor. Solicítalo al administrador que preparó la cuenta."
        >
          <input
            name="userId"
            required
            pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
          />
        </Field>
        <p className="notice">
          Se creará pendiente y desconectado. La cuenta de usuario conservará su
          rol.
        </p>
      </ActionForm>
    </div>
  )
}
export function DriverDetail() {
  const { id = '' } = useParams()
  return (
    <ProviderScope>
      {(scope) => (
        <DriverRecord key={`${scope.providerId}:${id}`} scope={scope} id={id} />
      )}
    </ProviderScope>
  )
}
function DriverRecord({ scope, id }: { scope: ProviderContext; id: string }) {
  const query = useQuery({
    queryKey: [...logisticsKey(scope), 'drivers', id],
    queryFn: ({ signal }) => drivers.get(scope, id, signal),
    staleTime: 0,
  })
  if (query.isPending) return <Loading />
  if (query.isError)
    return (
      <ErrorState
        error={query.error}
        retry={() => {
          void query.refetch()
        }}
      />
    )
  return <DriverContent scope={scope} item={query.data} />
}
function DriverContent({
  scope,
  item,
}: {
  scope: ProviderContext
  item: Driver
}) {
  const [status, setStatus] = useState<DriverStatus | null>(null)
  const notify = useFeedback()
  return (
    <>
      <PageTitle
        title={item.name}
        back={resourceLink('drivers', scope.providerId)}
        description={scope.name}
      />
      <section className="panel panel-body">
        <h2>Información</h2>
        <InfoGrid
          items={[
            ['Usuario', item.user.email],
            ['Proveedor', scope.name],
            ['Estado', <Badge value={item.status} />],
            ['Disponibilidad', <Badge value={item.availability} />],
            ['Creación', date(item.createdAt)],
          ]}
        />
        <p className="notice">
          La disponibilidad es declarada por el repartidor. Este panel sólo la
          consulta.
        </p>
        <div className="row-actions">
          {(['ACTIVE', 'SUSPENDED'] as const)
            .filter((value) => value !== item.status)
            .map((value) => (
              <button
                key={value}
                className="button secondary"
                onClick={() => setStatus(value)}
              >
                {value === 'ACTIVE'
                  ? 'Activar repartidor'
                  : 'Suspender repartidor'}
              </button>
            ))}
        </div>
        <ActionForm
          key={item.updatedAt}
          onSubmit={async (data) => {
            await drivers.update(scope, item.id, {
              name: String(data.get('name')).trim(),
            })
            await invalidateLogistics(scope)
            notify('Repartidor actualizado correctamente.')
          }}
        >
          <Field label="Nombre operativo">
            <input
              name="name"
              defaultValue={item.name}
              required
              maxLength={100}
              pattern=".*\S.*"
            />
          </Field>
        </ActionForm>
      </section>
      <DriverAssignment scope={scope} driver={item} />
      <AssignmentHistory scope={scope} kind="drivers" id={item.id} />
      {status && (
        <Confirm
          title={`${status === 'ACTIVE' ? 'Activar' : 'Suspender'} repartidor`}
          description={`El estado cambiará a ${labels[status].toLowerCase()}.${status === 'SUSPENDED' ? ' Quedará desconectado; su asignación vigente se conserva.' : ''}`}
          onClose={() => setStatus(null)}
          onConfirm={async () => {
            await drivers.update(scope, item.id, { status })
            await invalidateLogistics(scope)
            notify('Estado del repartidor actualizado.')
          }}
        />
      )}
    </>
  )
}
