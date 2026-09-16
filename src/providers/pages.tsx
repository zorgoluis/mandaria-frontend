import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, ArrowUpRight } from 'lucide-react'
import { providers } from './service'
import { users } from '../users/service'
import { queryClient } from '../services/query'
import {
  ActionForm,
  Badge,
  Confirm,
  Empty,
  ErrorState,
  Field,
  InfoGrid,
  Loading,
  PageTitle,
  Pagination,
  Table,
} from '../components/ui'
import { useFeedback } from '../components/feedback-context'
import { ActivityCards, CapacityCards } from '../logistics/components'
import {
  InvitationsPanel,
  InviteButton,
  InviteProviderAdminDialog,
} from '../invitations/components'
import { date, labels } from '../utils/format'
import type {
  Member,
  Provider,
  ProviderInput,
  ProviderProfile,
} from '../types/api'
const invalidate = () =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: ['providers'] }),
    queryClient.invalidateQueries({ queryKey: ['logistics'] }),
    queryClient.invalidateQueries({ queryKey: ['logistics-provider'] }),
    queryClient.invalidateQueries({ queryKey: ['logistics-provider-options'] }),
  ])
export function ProvidersPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Math.min(100000, Number(params.get('page')) || 1))
  const filters = {
    page,
    pageSize: 20,
    type: params.get('type') ?? '',
    status: params.get('status') ?? '',
    search: params.get('search') ?? '',
  }
  const query = useQuery({
    queryKey: ['providers', 'list', filters],
    queryFn: ({ signal }) => providers.list(filters, signal),
  })
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.set('page', '1')
    setParams(next)
  }
  return (
    <>
      <PageTitle
        title="Proveedores"
        description="Organiza tu red de flotillas e independientes."
        action={
          <Link className="button" to="/providers/new">
            <Plus size={17} /> Nuevo proveedor
          </Link>
        }
      />
      <div className="panel">
        <div className="panel-toolbar">
          <div>
            <h2>Tu red logística</h2>
            <p>Información y límites operativos</p>
          </div>
        </div>
        <div className="filters">
          <form
            className="search"
            onSubmit={(e) => {
              e.preventDefault()
              filter(
                'search',
                String(new FormData(e.currentTarget).get('search')).trim(),
              )
            }}
          >
            <Search size={17} />
            <input
              key={filters.search}
              name="search"
              aria-label="Buscar proveedor"
              defaultValue={filters.search}
              placeholder="Nombre o código"
              maxLength={100}
            />
            <button className="text-button" type="submit">
              Buscar
            </button>
          </form>
          <select
            aria-label="Filtrar por tipo"
            value={filters.type}
            onChange={(e) => filter('type', e.target.value)}
          >
            <option value="">Todos los tipos</option>
            <option value="FLEET">Flotillas</option>
            <option value="INDEPENDENT">Independientes</option>
          </select>
          <select
            aria-label="Filtrar por estado"
            value={filters.status}
            onChange={(e) => filter('status', e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="PENDING">Pendientes</option>
            <option value="ACTIVE">Activos</option>
            <option value="SUSPENDED">Suspendidos</option>
          </select>
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
        ) : (
          <>
            <Table
              rows={query.data.items}
              columns={[
                {
                  label: 'Proveedor',
                  render: (row) => (
                    <Link className="entity-name" to={`/providers/${row.id}`}>
                      {row.name}
                      <small>{row.code}</small>
                    </Link>
                  ),
                },
                { label: 'Tipo', render: (row) => <Badge value={row.type} /> },
                {
                  label: 'Estado',
                  render: (row) => <Badge value={row.status} />,
                },
                {
                  label: 'Límites operativos',
                  render: (row) => (
                    <span className="cell-meta">
                      {row.maxDrivers} repartidores
                      <small>{row.maxVehicles} vehículos</small>
                    </span>
                  ),
                },
                { label: 'Creación', render: (row) => date(row.createdAt) },
                {
                  label: 'Acciones',
                  render: (row) => (
                    <Link className="table-action" to={`/providers/${row.id}`}>
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
        )}
      </div>
    </>
  )
}
function ProviderFields({ value }: { value?: Provider }) {
  return (
    <>
      <div className="form-grid">
        <Field label="Nombre">
          <input
            name="name"
            defaultValue={value?.name}
            required
            maxLength={100}
            pattern=".*\S.*"
            placeholder="Nombre del proveedor"
          />
        </Field>
        <Field
          label="Código"
          hint="Mayúsculas, números y guion bajo. Comienza con letra."
        >
          <input
            name="code"
            defaultValue={value?.code}
            required
            pattern="[A-Za-z][A-Za-z0-9_]{1,49}"
            maxLength={50}
            placeholder="MI_PROVEEDOR"
          />
        </Field>
      </div>
      {!value && (
        <Field label="Tipo de proveedor">
          <select name="type" required defaultValue="">
            <option value="" disabled>
              Selecciona un tipo
            </option>
            <option value="FLEET">Flotilla</option>
            <option value="INDEPENDENT">Independiente</option>
          </select>
        </Field>
      )}
      <h3>Límites operativos</h3>
      <p className="muted">
        Capacidad máxima permitida.{' '}
        {value
          ? 'Estos valores no son un conteo de recursos existentes.'
          : 'Deja los campos vacíos para utilizar los valores definidos por Mandaria para este tipo.'}
      </p>
      <div className="form-grid">
        <Field label="Máximo de repartidores">
          <input
            type="number"
            name="maxDrivers"
            defaultValue={value?.maxDrivers}
            min={1}
            max={10000}
            step={1}
            required={!!value}
            placeholder="Predeterminado por Mandaria"
          />
        </Field>
        <Field label="Máximo de vehículos">
          <input
            type="number"
            name="maxVehicles"
            defaultValue={value?.maxVehicles}
            min={1}
            max={10000}
            step={1}
            required={!!value}
            placeholder="Predeterminado por Mandaria"
          />
        </Field>
      </div>
    </>
  )
}
function providerData(data: FormData) {
  return {
    name: String(data.get('name')).trim(),
    code: String(data.get('code')).trim().toUpperCase(),
    ...(data.get('maxDrivers')
      ? { maxDrivers: Number(data.get('maxDrivers')) }
      : {}),
    ...(data.get('maxVehicles')
      ? { maxVehicles: Number(data.get('maxVehicles')) }
      : {}),
  }
}
export function ProviderNew() {
  const navigate = useNavigate()
  const notify = useFeedback()
  return (
    <>
      <PageTitle
        title="Nuevo proveedor"
        description="Agrega un integrante a tu red logística."
        back="/providers"
      />
      <div className="panel form-panel">
        <h2>Información del proveedor</h2>
        <ActionForm
          submitLabel="Crear proveedor"
          onSubmit={async (data) => {
            const item = await providers.create({
              ...providerData(data),
              type: String(data.get('type')) as ProviderInput['type'],
            })
            void invalidate()
            notify('Proveedor creado correctamente.')
            navigate(`/providers/${item.id}`)
          }}
        >
          <ProviderFields />
          <p className="notice">
            El proveedor se creará pendiente de activación.
          </p>
        </ActionForm>
      </div>
    </>
  )
}
function Memberships({ id, name }: { id: string; name: string }) {
  const [inviting, setInviting] = useState(false)
  const [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: ['providers', id, 'members', page],
    queryFn: ({ signal }) => providers.members(id, page, signal),
  })
  const people = useQuery({
    queryKey: ['users'],
    queryFn: ({ signal }) => users.list(signal),
  })
  const [remove, setRemove] = useState<Member | null>(null)
  const notify = useFeedback()
  return (
    <div className="panel">
      <div className="panel-toolbar">
        <div>
          <h2>Administradores</h2>
          <p>Gestiona quién puede consultar este proveedor.</p>
        </div>
        <InviteButton
          label="Invitar administrador"
          onClick={() => setInviting(true)}
        />
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
      ) : (
        <>
          <Table
            rows={query.data.items}
            emptyTitle="No hay administradores"
            empty="Invita a un administrador para este proveedor."
            columns={[
              { label: 'Usuario', render: (row) => row.user.email },
              {
                label: 'Rol en el proveedor',
                render: (row) => labels[row.role],
              },
              {
                label: 'Usuario activo',
                render: (row) => (row.user.active ? 'Sí' : 'No'),
              },
              {
                label: 'Acciones',
                render: (row) => (
                  <button
                    className="text-button destructive"
                    onClick={() => setRemove(row)}
                  >
                    Retirar
                  </button>
                ),
              },
            ]}
          />
          <Pagination
            page={page}
            total={query.data.total}
            totalPages={query.data.totalPages}
            onPage={setPage}
          />
        </>
      )}
      <div className="panel-body">
        <h3>Asociar administrador existente</h3>
        {people.isError && (
          <ErrorState
            error={people.error}
            retry={() => {
              void people.refetch()
            }}
          />
        )}
        <ActionForm
          submitLabel="Asociar administrador"
          onSubmit={async (data) => {
            await providers.addMember(
              id,
              String(data.get('userId')),
              String(data.get('role')) as Member['role'],
            )
            void invalidate()
            notify('Administrador asociado correctamente.')
          }}
        >
          <div className="form-grid">
            <Field
              label="ID del usuario"
              hint="Selecciona una sugerencia o ingresa el UUID de un usuario activo con rol de administrador de proveedor."
            >
              <input
                name="userId"
                list="provider-admins"
                required
                pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
                placeholder="UUID del usuario"
              />
              <datalist id="provider-admins">
                {people.data
                  ?.filter(
                    (user) => user.active && user.role === 'PROVIDER_ADMIN',
                  )
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email}
                    </option>
                  ))}
              </datalist>
            </Field>
            <Field label="Rol dentro del proveedor">
              <select name="role" defaultValue="ADMIN">
                <option value="ADMIN">Administrador</option>
                <option value="OWNER">Propietario</option>
              </select>
            </Field>
          </div>
          <p className="panel-note">
            Para cuentas nuevas usa Invitar administrador. Esta opción sólo
            asocia cuentas activas existentes; las sugerencias provienen de los
            últimos 100 usuarios.
          </p>
        </ActionForm>
      </div>
      {inviting && (
        <InviteProviderAdminDialog
          provider={{ id, name }}
          onClose={() => setInviting(false)}
        />
      )}
      {remove && (
        <Confirm
          title="Retirar administrador"
          description={`Se retirará la asociación de ${remove.user.email}. Su cuenta de usuario no se eliminará.`}
          label="Retirar"
          onClose={() => setRemove(null)}
          onConfirm={async () => {
            await providers.removeMember(id, remove.id)
            setPage(1)
            void invalidate()
            notify('Asociación retirada correctamente.')
          }}
        />
      )}
    </div>
  )
}
export function ProviderDetail() {
  const { id = '' } = useParams()
  const query = useQuery({
    queryKey: ['providers', id],
    queryFn: ({ signal }) => providers.get(id, signal),
  })
  const [action, setAction] = useState<'activate' | 'suspend' | null>(null)
  const notify = useFeedback()
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
  const item = query.data
  return (
    <>
      <PageTitle
        title={item.name}
        description={item.code}
        back="/providers"
        action={
          <button
            className="button secondary"
            onClick={() =>
              setAction(item.status === 'ACTIVE' ? 'suspend' : 'activate')
            }
          >
            {item.status === 'ACTIVE'
              ? 'Suspender proveedor'
              : 'Activar proveedor'}
          </button>
        }
      />
      <div className="panel">
        <div className="panel-toolbar">
          <h2>Información y límites</h2>
          <div className="row-actions">
            <Badge value={item.type} />
            <Badge value={item.status} />
          </div>
        </div>
        <div className="panel-body">
          <ActionForm
            key={item.updatedAt}
            onSubmit={async (data) => {
              await providers.update(id, providerData(data))
              void invalidate()
              notify('Proveedor actualizado correctamente.')
            }}
          >
            <ProviderFields value={item} />
          </ActionForm>
          <InfoGrid
            items={[
              ['Creación', date(item.createdAt)],
              ['Última actualización', date(item.updatedAt)],
            ]}
          />
        </div>
      </div>
      <Memberships id={id} name={item.name} />
      <InvitationsPanel
        scope={{ kind: 'admin', providerId: id }}
        title="Invitaciones del proveedor"
        description="Administradores y repartidores invitados a este proveedor."
        showProvider={false}
        roleFilter
      />
      <CapacityCards scope={{ role: 'SUPER_ADMIN', providerId: id }} />
      {action && (
        <Confirm
          title={
            action === 'activate' ? 'Activar proveedor' : 'Suspender proveedor'
          }
          description={
            action === 'activate'
              ? 'El proveedor pasará a estado activo.'
              : 'El proveedor quedará suspendido. Sus administradores conservarán acceso de consulta al perfil.'
          }
          onClose={() => setAction(null)}
          onConfirm={async () => {
            await providers.transition(id, action)
            void invalidate()
            notify(
              action === 'activate'
                ? 'Proveedor activado.'
                : 'Proveedor suspendido.',
            )
          }}
        />
      )}
    </>
  )
}
function ProfileCard({ item }: { item: ProviderProfile }) {
  return (
    <div className="panel">
      <div className="panel-toolbar">
        <div>
          <h2>{item.name}</h2>
          <p>{item.code}</p>
        </div>
        <Badge value={item.status} />
      </div>
      <InfoGrid
        items={[
          ['Tipo', labels[item.type]],
          ['Tu rol en este proveedor', labels[item.membershipRole]],
          ['Máximo de repartidores', item.limits.maxDrivers],
          ['Máximo de vehículos', item.limits.maxVehicles],
        ]}
      />
      <p className="panel-note">
        Límites operativos. Contacta a un superadministrador para solicitar
        cambios.
      </p>
    </div>
  )
}
function SelectedProfile({
  id,
  showActivity = false,
}: {
  id: string
  showActivity?: boolean
}) {
  const query = useQuery({
    queryKey: ['my-provider', id],
    queryFn: ({ signal }) => providers.profile(id, signal),
  })
  return query.isPending ? (
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
      <ProfileCard item={query.data} />
      <CapacityCards scope={{ role: 'PROVIDER_ADMIN', providerId: id }} />
      {showActivity && (
        <ActivityCards scope={{ role: 'PROVIDER_ADMIN', providerId: id }} />
      )}
    </>
  )
}
export function MyProvider({
  showActivity = false,
}: {
  showActivity?: boolean
}) {
  const [params, setParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: ['my-providers', page],
    queryFn: ({ signal }) => providers.profiles(page, signal),
  })
  const selected = params.get('providerId')
  return (
    <>
      <PageTitle
        title="Mi proveedor"
        description="Consulta los proveedores asociados a tu cuenta."
      />
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
          {query.data.total === 0 ? (
            <div className="panel">
              <Empty
                title="Aún no tienes un proveedor asociado"
                description="Solicita a un superadministrador que asocie tu cuenta."
              />
            </div>
          ) : (
            <>
              {query.data.total > 1 && (
                <div className="panel panel-body">
                  <Field label="Seleccionar proveedor">
                    <select
                      value={selected ?? ''}
                      onChange={(e) =>
                        setParams({ providerId: e.target.value })
                      }
                    >
                      <option value="">Selecciona un proveedor</option>
                      {query.data.items.map((item) => (
                        <option value={item.id} key={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Pagination
                    page={page}
                    total={query.data.total}
                    totalPages={query.data.totalPages}
                    onPage={setPage}
                  />
                </div>
              )}
              {selected ? (
                <SelectedProfile
                  key={selected}
                  id={selected}
                  showActivity={showActivity}
                />
              ) : query.data.total === 1 ? (
                <SelectedProfile
                  id={query.data.items[0].id}
                  showActivity={showActivity}
                />
              ) : (
                <Empty
                  title="Selecciona un proveedor"
                  description="Sólo puedes consultar tus asociaciones vigentes."
                />
              )}
            </>
          )}
        </>
      )}
    </>
  )
}
