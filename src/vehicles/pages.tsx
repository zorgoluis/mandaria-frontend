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
  Options,
  ProviderScope,
  ResourceFilters,
} from '../logistics/components'
import {
  invalidateLogistics,
  logisticsKey,
  useCapacity,
} from '../logistics/queries'
import { AssignmentHistory } from '../assignments/components'
import { vehicles } from './service'
import { date, labels } from '../utils/format'
import {
  vehicleStatuses,
  vehicleTypes,
  type ProviderContext,
  type Vehicle,
  type VehicleInput,
  type VehicleStatus,
} from '../logistics/types'

export function VehiclesPage() {
  return (
    <>
      <PageTitle
        title="Vehículos"
        description="Unidades y medios de transporte de cada proveedor."
      />
      <ProviderScope>
        {(scope) => <VehicleList key={scope.providerId} scope={scope} />}
      </ProviderScope>
    </>
  )
}
function VehicleList({ scope }: { scope: ProviderContext }) {
  const filters = useResourceFilters()
  const params = {
    page: filters.page,
    pageSize: 20,
    search: filters.search,
    status: filters.status,
    type: filters.type,
  }
  const query = useQuery({
    queryKey: [...logisticsKey(scope), 'vehicles', 'list', params],
    queryFn: ({ signal }) => vehicles.list(scope, params, signal),
  })
  const usage = useCapacity(scope)
  const canCreate =
    usage.isSuccess &&
    !usage.isError &&
    usage.data.vehicles.count < usage.data.vehicles.max
  return (
    <>
      <CapacityCards scope={scope} />
      <div className="panel">
        <div className="panel-toolbar">
          <h2>Vehículos del proveedor</h2>
          {canCreate ? (
            <Link
              className="button"
              to={resourceLink('vehicles', scope.providerId, 'new')}
            >
              Nuevo vehículo
            </Link>
          ) : (
            <button className="button" disabled>
              Nuevo vehículo
            </button>
          )}
        </div>
        <ResourceFilters kind="vehicles" />
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
              columns={[
                {
                  label: 'Identificador',
                  render: (row) => (
                    <Link
                      className="entity-name"
                      to={resourceLink('vehicles', scope.providerId, row.id)}
                    >
                      {row.identifier}
                    </Link>
                  ),
                },
                { label: 'Proveedor', render: () => scope.name },
                { label: 'Tipo', render: (row) => labels[row.type] },
                {
                  label: 'Estado',
                  render: (row) => <Badge value={row.status} />,
                },
                {
                  label: 'Marca / modelo',
                  render: (row) =>
                    [row.brand, row.model].filter(Boolean).join(' / ') ||
                    'Sin registro',
                },
                { label: 'Placa', render: (row) => row.plate || 'Sin placa' },
                {
                  label: 'Repartidor actual',
                  render: (row) =>
                    row.currentAssignment ? (
                      <Link
                        to={resourceLink(
                          'drivers',
                          scope.providerId,
                          row.currentAssignment.driver.id,
                        )}
                      >
                        {row.currentAssignment.driver.name}
                      </Link>
                    ) : (
                      'Sin asignar'
                    ),
                },
                {
                  label: 'Acciones',
                  render: (row) => (
                    <Link
                      className="table-action"
                      to={resourceLink('vehicles', scope.providerId, row.id)}
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
    </>
  )
}
function VehicleFields({ value }: { value?: Vehicle }) {
  return (
    <div className="form-grid">
      <Field
        label="Identificador"
        hint="Letras, números, guion y guion bajo; máximo 30 caracteres."
      >
        <input
          name="identifier"
          required
          defaultValue={value?.identifier}
          maxLength={30}
          pattern="[A-Za-z0-9][A-Za-z0-9_\-]{0,29}"
        />
      </Field>
      <Field label="Tipo">
        <select name="type" required defaultValue={value?.type ?? ''}>
          <option value="" disabled>
            Selecciona un tipo
          </option>
          <Options values={vehicleTypes} />
        </select>
      </Field>
      {(['brand', 'model', 'color', 'plate'] as const).map((key) => (
        <Field
          key={key}
          label={
            {
              brand: 'Marca',
              model: 'Modelo',
              color: 'Color',
              plate: 'Placa (opcional)',
            }[key]
          }
        >
          <input
            name={key}
            defaultValue={value?.[key] ?? ''}
            maxLength={key === 'plate' ? 15 : key === 'color' ? 30 : 50}
            pattern={
              key === 'plate'
                ? String.raw`[A-Za-z0-9][A-Za-z0-9 \-]{0,14}`
                : String.raw`.*\S.*`
            }
          />
        </Field>
      ))}
      <Field label="Año">
        <input
          name="year"
          type="number"
          min={1900}
          max={2100}
          step={1}
          defaultValue={value?.year ?? ''}
        />
      </Field>
      {!value && (
        <Field label="Estado inicial">
          <select name="status" defaultValue="">
            <option value="">Predeterminado por Mandaria</option>
            <Options values={vehicleStatuses} />
          </select>
        </Field>
      )}
    </div>
  )
}
function vehicleData(data: FormData): VehicleInput {
  return {
    identifier: String(data.get('identifier')).trim().toUpperCase(),
    type: String(data.get('type')) as VehicleInput['type'],
    brand: String(data.get('brand') ?? '').trim() || null,
    model: String(data.get('model') ?? '').trim() || null,
    color: String(data.get('color') ?? '').trim() || null,
    plate:
      String(data.get('plate') ?? '')
        .trim()
        .toUpperCase() || null,
    year: data.get('year') ? Number(data.get('year')) : null,
    ...(data.get('status')
      ? { status: String(data.get('status')) as VehicleStatus }
      : {}),
  }
}
export function VehicleNew() {
  return (
    <>
      <PageTitle title="Nuevo vehículo" back="/vehicles" />
      <ProviderScope>
        {(scope) => <CreateVehicle key={scope.providerId} scope={scope} />}
      </ProviderScope>
    </>
  )
}
function CreateVehicle({ scope }: { scope: ProviderContext }) {
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
  if (usage.data.vehicles.count >= usage.data.vehicles.max)
    return (
      <div className="panel panel-body">
        <h2>Límite alcanzado</h2>
        <p>
          Vehículos: {usage.data.vehicles.count} / {usage.data.vehicles.max}.
          Solicita ampliar el límite operativo.
        </p>
      </div>
    )
  return (
    <div className="panel form-panel">
      <ActionForm
        submitLabel="Crear vehículo"
        onSubmit={async (data) => {
          const item = await vehicles.create(scope, vehicleData(data))
          await invalidateLogistics(scope)
          notify('Vehículo creado correctamente.')
          navigate(resourceLink('vehicles', scope.providerId, item.id))
        }}
      >
        <VehicleFields />
      </ActionForm>
    </div>
  )
}
export function VehicleDetail() {
  const { id = '' } = useParams()
  return (
    <ProviderScope>
      {(scope) => (
        <VehicleRecord
          key={`${scope.providerId}:${id}`}
          scope={scope}
          id={id}
        />
      )}
    </ProviderScope>
  )
}
function VehicleRecord({ scope, id }: { scope: ProviderContext; id: string }) {
  const query = useQuery({
    queryKey: [...logisticsKey(scope), 'vehicles', id],
    queryFn: ({ signal }) => vehicles.get(scope, id, signal),
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
  return <VehicleContent scope={scope} item={query.data} />
}
function VehicleContent({
  scope,
  item,
}: {
  scope: ProviderContext
  item: Vehicle
}) {
  const [status, setStatus] = useState<VehicleStatus | null>(null)
  const notify = useFeedback()
  return (
    <>
      <PageTitle
        title={item.identifier}
        back={resourceLink('vehicles', scope.providerId)}
        description={scope.name}
      />
      <section className="panel panel-body">
        <h2>Información</h2>
        <InfoGrid
          items={[
            ['Proveedor', scope.name],
            ['Estado', <Badge value={item.status} />],
            ['Tipo', labels[item.type]],
            ['Creación', date(item.createdAt)],
            [
              'Repartidor actual',
              item.currentAssignment ? (
                <Link
                  to={resourceLink(
                    'drivers',
                    scope.providerId,
                    item.currentAssignment.driver.id,
                  )}
                >
                  {item.currentAssignment.driver.name}
                </Link>
              ) : (
                'Sin asignar'
              ),
            ],
          ]}
        />
        <Field label="Cambiar estado">
          <select
            value=""
            onChange={(e) => setStatus(e.target.value as VehicleStatus)}
          >
            <option value="">Selecciona un nuevo estado</option>
            <Options
              values={vehicleStatuses.filter((v) => v !== item.status)}
            />
          </select>
        </Field>
        <ActionForm
          key={item.updatedAt}
          onSubmit={async (data) => {
            await vehicles.update(scope, item.id, vehicleData(data))
            await invalidateLogistics(scope)
            notify('Vehículo actualizado correctamente.')
          }}
        >
          <VehicleFields value={item} />
        </ActionForm>
      </section>
      <AssignmentHistory scope={scope} kind="vehicles" id={item.id} />
      {status && (
        <Confirm
          title="Cambiar estado del vehículo"
          description={`El estado cambiará a ${labels[status].toLowerCase()}. La asignación vigente se conserva. Sólo los vehículos activos admiten nuevas asignaciones.`}
          onClose={() => setStatus(null)}
          onConfirm={async () => {
            await vehicles.update(scope, item.id, { status })
            await invalidateLogistics(scope)
            notify('Estado del vehículo actualizado.')
          }}
        />
      )}
    </>
  )
}
