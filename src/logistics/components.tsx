import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/context'
import { providers } from '../providers/service'
import { drivers } from '../drivers/service'
import { vehicles } from '../vehicles/service'
import {
  Badge,
  Empty,
  ErrorPage,
  ErrorState,
  Field,
  Loading,
  Pagination,
} from '../components/ui'
import { labels } from '../utils/format'
import { resourceLink } from './navigation'
import { logisticsKey, useCapacity } from './queries'
import type { LogisticsRole, ProviderContext, Scope } from './types'

// Resolve a real provider before mounting forms or fetching logistics data.
export function ProviderScope({
  children,
}: {
  children: (provider: ProviderContext) => ReactNode
}) {
  const { user } = useAuth()
  if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'PROVIDER_ADMIN')
    return <ErrorPage code={403} />
  return <ProviderSelector role={user.role}>{children}</ProviderSelector>
}
function ProviderSelector({
  role,
  children,
}: {
  role: LogisticsRole
  children: (provider: ProviderContext) => ReactNode
}) {
  const [params, setParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const selected = params.get('providerId')
  const query = useQuery({
    queryKey: ['logistics-provider-options', role, page, search],
    queryFn: async ({ signal }) =>
      role === 'SUPER_ADMIN'
        ? providers.list({ page, pageSize: 20, search }, signal)
        : providers.profiles(page, signal),
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
  if (!query.data.total && role === 'PROVIDER_ADMIN')
    return (
      <Empty
        title="Aún no tienes un proveedor asociado"
        description="Solicita a un superadministrador que asocie tu cuenta."
      />
    )
  const id =
    selected ||
    (role === 'PROVIDER_ADMIN' && query.data.total === 1
      ? query.data.items[0]?.id
      : undefined)
  return (
    <>
      <div className="panel panel-body">
        {role === 'SUPER_ADMIN' && (
          <form
            className="search"
            onSubmit={(e) => {
              e.preventDefault()
              setSearch(
                String(new FormData(e.currentTarget).get('search')).trim(),
              )
              setPage(1)
            }}
          >
            <input
              name="search"
              aria-label="Buscar proveedor"
              placeholder="Buscar proveedor por nombre o código"
              maxLength={100}
            />
            <button className="text-button">Buscar proveedor</button>
          </form>
        )}
        <Field label="Seleccionar proveedor">
          <select
            value={id ?? ''}
            onChange={(e) =>
              setParams(e.target.value ? { providerId: e.target.value } : {})
            }
          >
            <option value="">Selecciona un proveedor</option>
            {id && !query.data.items.some((p) => p.id === id) && (
              <option value={id}>Proveedor seleccionado</option>
            )}
            {query.data.items.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        {query.data.totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={query.data.totalPages}
            total={query.data.total}
            onPage={setPage}
          />
        )}
      </div>
      {id ? (
        <ResolvedProvider
          key={`${role}:${id}`}
          scope={{ role, providerId: id }}
        >
          {children}
        </ResolvedProvider>
      ) : (
        <Empty
          title="Selecciona un proveedor"
          description="Consulta y administra sus repartidores y vehículos."
        />
      )}
    </>
  )
}
function ResolvedProvider({
  scope,
  children,
}: {
  scope: Scope
  children: (provider: ProviderContext) => ReactNode
}) {
  const query = useQuery({
    queryKey: ['logistics-provider', scope.role, scope.providerId],
    queryFn: async ({ signal }) =>
      scope.role === 'SUPER_ADMIN'
        ? providers.get(scope.providerId, signal)
        : providers.profile(scope.providerId, signal),
    staleTime: 0,
  })
  if (query.isPending) return <Loading />
  // Errors take precedence even if React Query retained data from an earlier success.
  if (query.isError)
    return (
      <ErrorState
        error={query.error}
        retry={() => {
          void query.refetch()
        }}
      />
    )
  return (
    <>
      <div className="logistics-context">
        <strong>{query.data.name}</strong>
        <Badge value={query.data.type} />
        <Badge value={query.data.status} />
      </div>
      {children({ ...scope, name: query.data.name, status: query.data.status })}
    </>
  )
}
export function CapacityCards({ scope }: { scope: Scope }) {
  const query = useCapacity(scope)
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
  return (
    <div className="logistics-capacity">
      {(['drivers', 'vehicles'] as const).map((kind) => (
        <Link
          className="stat-card"
          key={kind}
          to={resourceLink(kind, scope.providerId)}
        >
          <span>{kind === 'drivers' ? 'Repartidores' : 'Vehículos'}</span>
          <strong>
            {query.data[kind].count} / {query.data[kind].max}
          </strong>
          <small>
            {query.data[kind].count >= query.data[kind].max
              ? 'Límite alcanzado'
              : 'Ver y administrar'}
          </small>
        </Link>
      ))}
    </div>
  )
}
export function Options({ values }: { values: readonly string[] }) {
  return values.map((value) => (
    <option key={value} value={value}>
      {labels[value]}
    </option>
  ))
}
export function ActivityCards({ scope }: { scope: Scope }) {
  const available = useQuery({
    queryKey: [...logisticsKey(scope), 'available-count'],
    queryFn: ({ signal }) =>
      drivers.list(
        scope,
        { pageSize: 1, status: 'ACTIVE', availability: 'AVAILABLE' },
        signal,
      ),
  })
  const active = useQuery({
    queryKey: [...logisticsKey(scope), 'active-vehicles-count'],
    queryFn: ({ signal }) =>
      vehicles.list(scope, { pageSize: 1, status: 'ACTIVE' }, signal),
  })
  return (
    <div className="logistics-capacity">
      {[
        {
          title: 'Repartidores disponibles',
          query: available,
          note: 'Disponibilidad declarada; sin seguimiento en tiempo real.',
        },
        {
          title: 'Vehículos activos',
          query: active,
          note: 'Incluye vehículos con y sin asignación.',
        },
      ].map(({ title, query, note }) => (
        <div className="stat-card" key={title}>
          <span>{title}</span>
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
            <strong>{query.data.total}</strong>
          )}
          <small>{note}</small>
        </div>
      ))}
    </div>
  )
}
export function ResourceFilters({ kind }: { kind: 'drivers' | 'vehicles' }) {
  const [params, setParams] = useSearchParams()
  function change(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.set('page', '1')
    setParams(next)
  }
  return (
    <div className="filters">
      <form
        className="search"
        onSubmit={(e) => {
          e.preventDefault()
          change(
            'search',
            String(new FormData(e.currentTarget).get('search')).trim(),
          )
        }}
      >
        <input
          key={params.get('search')}
          name="search"
          aria-label="Buscar"
          defaultValue={params.get('search') ?? ''}
          maxLength={100}
          placeholder={
            kind === 'drivers'
              ? 'Nombre o correo'
              : 'Identificador, placa, marca o modelo'
          }
        />
        <button className="text-button">Buscar</button>
      </form>
      <select
        aria-label="Filtrar por estado"
        value={params.get('status') ?? ''}
        onChange={(e) => change('status', e.target.value)}
      >
        <option value="">Todos los estados</option>
        <Options
          values={
            kind === 'drivers'
              ? ['PENDING', 'ACTIVE', 'SUSPENDED']
              : ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'SUSPENDED']
          }
        />
      </select>
      <select
        aria-label={
          kind === 'drivers' ? 'Filtrar por disponibilidad' : 'Filtrar por tipo'
        }
        value={params.get(kind === 'drivers' ? 'availability' : 'type') ?? ''}
        onChange={(e) =>
          change(kind === 'drivers' ? 'availability' : 'type', e.target.value)
        }
      >
        <option value="">
          {kind === 'drivers' ? 'Toda disponibilidad' : 'Todos los tipos'}
        </option>
        <Options
          values={
            kind === 'drivers'
              ? ['OFFLINE', 'AVAILABLE', 'BUSY']
              : [
                  'BICYCLE',
                  'MOTORCYCLE',
                  'CAR',
                  'PICKUP',
                  'VAN',
                  'TRUCK',
                  'OTHER',
                ]
          }
        />
      </select>
    </div>
  )
}
