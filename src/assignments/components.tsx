import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ActionForm,
  Confirm,
  Empty,
  ErrorState,
  Field,
  Loading,
  Modal,
  Pagination,
  Table,
} from '../components/ui'
import { useFeedback } from '../components/feedback-context'
import { vehicles } from '../vehicles/service'
import { assignments } from './service'
import { invalidateLogistics, logisticsKey } from '../logistics/queries'
import { resourceLink } from '../logistics/navigation'
import { date, labels } from '../utils/format'
import type { Driver, ProviderContext, Scope } from '../logistics/types'

export function AssignmentHistory({
  scope,
  kind,
  id,
}: {
  scope: Scope
  kind: 'drivers' | 'vehicles'
  id: string
}) {
  const [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: [...logisticsKey(scope), kind, id, 'history', page],
    queryFn: ({ signal }) => assignments.history(scope, kind, id, page, signal),
  })
  return (
    <section className="panel">
      <div className="panel-toolbar">
        <h2>Historial de asignaciones</h2>
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
            empty="Todavía no hay asignaciones registradas."
            columns={[
              {
                label: 'Repartidor',
                render: (row) => (
                  <Link
                    to={resourceLink(
                      'drivers',
                      scope.providerId,
                      row.driver.id,
                    )}
                  >
                    {row.driver.name}
                  </Link>
                ),
              },
              {
                label: 'Vehículo',
                render: (row) => (
                  <Link
                    to={resourceLink(
                      'vehicles',
                      scope.providerId,
                      row.vehicle.id,
                    )}
                  >
                    {row.vehicle.identifier}
                  </Link>
                ),
              },
              { label: 'Desde', render: (row) => date(row.assignedAt) },
              {
                label: 'Hasta',
                render: (row) =>
                  row.unassignedAt ? date(row.unassignedAt) : 'Actual',
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
    </section>
  )
}
export function DriverAssignment({
  scope,
  driver,
}: {
  scope: ProviderContext
  driver: Driver
}) {
  const [dialog, setDialog] = useState<'assign' | 'unassign' | null>(null)
  const notify = useFeedback()
  return (
    <section className="panel panel-body">
      <h2>Vehículo actual</h2>
      {driver.currentAssignment ? (
        <p>
          <Link
            to={resourceLink(
              'vehicles',
              scope.providerId,
              driver.currentAssignment.vehicle.id,
            )}
          >
            {driver.currentAssignment.vehicle.identifier}
          </Link>{' '}
          · {labels[driver.currentAssignment.vehicle.status]}
        </p>
      ) : (
        <p>Sin vehículo</p>
      )}
      {driver.currentAssignment ? (
        <button
          className="button secondary"
          onClick={() => setDialog('unassign')}
        >
          Desasignar
        </button>
      ) : (
        <>
          <button
            className="button"
            disabled={
              driver.status === 'SUSPENDED' || scope.status === 'SUSPENDED'
            }
            onClick={() => setDialog('assign')}
          >
            Asignar vehículo
          </button>
          {(driver.status === 'SUSPENDED' || scope.status === 'SUSPENDED') && (
            <p className="notice">
              Activa el repartidor y su proveedor antes de asignar un vehículo.
            </p>
          )}
        </>
      )}
      {dialog === 'assign' && (
        <AssignDialog
          scope={scope}
          driver={driver}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'unassign' && (
        <Confirm
          title="Desasignar vehículo"
          description="Se cerrará la asignación vigente. El historial se conservará."
          label="Desasignar"
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            await assignments.unassign(scope, driver.id)
            await invalidateLogistics(scope)
            notify('Vehículo desasignado correctamente.')
          }}
        />
      )}
    </section>
  )
}
function AssignDialog({
  scope,
  driver,
  onClose,
}: {
  scope: Scope
  driver: Driver
  onClose: () => void
}) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const notify = useFeedback()
  const query = useQuery({
    queryKey: [...logisticsKey(scope), 'eligible-vehicles', page, search],
    queryFn: ({ signal }) =>
      vehicles.list(
        scope,
        { status: 'ACTIVE', page, pageSize: 20, search },
        signal,
      ),
    staleTime: 0,
  })
  const eligible =
    query.data?.items.filter(
      (v) =>
        !v.currentAssignment &&
        v.status === 'ACTIVE' &&
        v.providerId === scope.providerId,
    ) ?? []
  return (
    <Modal
      title={`Asignar vehículo a ${driver.name}`}
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <p className="notice">
        Vehículos activos y libres de este proveedor. Mandaria comprobará su
        disponibilidad al confirmar.
      </p>
      <form
        className="search"
        onSubmit={(e) => {
          e.preventDefault()
          setPage(1)
          setSearch(String(new FormData(e.currentTarget).get('search')).trim())
        }}
      >
        <input
          name="search"
          aria-label="Buscar vehículo para asignar"
          maxLength={100}
          placeholder="Identificador"
          disabled={busy}
        />
        <button className="text-button" disabled={busy}>
          Buscar
        </button>
      </form>
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
          {eligible.length ? (
            <ActionForm
              key={`${page}:${search}`}
              submitLabel="Asignar"
              onCancel={onClose}
              onSubmit={async (data) => {
                setBusy(true)
                try {
                  await assignments.assign(
                    scope,
                    driver.id,
                    String(data.get('vehicleId')),
                  )
                  await invalidateLogistics(scope)
                  notify('Vehículo asignado correctamente.')
                  onClose()
                } finally {
                  setBusy(false)
                }
              }}
            >
              <Field label="Seleccionar vehículo">
                <select name="vehicleId" defaultValue="" required>
                  <option value="" disabled>
                    Selecciona un vehículo
                  </option>
                  {eligible.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.identifier} · {labels[v.type]}
                    </option>
                  ))}
                </select>
              </Field>
            </ActionForm>
          ) : (
            <Empty
              title="Sin vehículos libres en esta página"
              description="Busca otro identificador o consulta la siguiente página de vehículos activos."
            />
          )}
          {!busy && (
            <Pagination
              page={page}
              total={query.data.total}
              totalPages={query.data.totalPages}
              onPage={setPage}
            />
          )}
        </>
      )}
    </Modal>
  )
}
