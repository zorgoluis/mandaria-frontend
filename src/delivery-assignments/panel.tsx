import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { ErrorState, InfoGrid, Loading } from '../components/ui'
import { date } from '../utils/format'
import type { ProviderDispatch } from '../dispatch/types'
import { vehicleLabel } from './format'
import type { useDispatchAssignments } from './use-assignments'
import {
  AssignDialog,
  AssignmentBadge,
  AssignmentDeadline,
  AssignmentHistory,
  CancelAssignmentDialog,
  ReassignDialog,
} from './components'
import type { DeliveryAssignment } from './types'

function ActiveAssignment({ assignment }: { assignment: DeliveryAssignment }) {
  return (
    <InfoGrid
      items={[
        ['Repartidor', assignment.driver.name],
        ['Vehículo', vehicleLabel(assignment.vehicle)],
        ['Asignado', date(assignment.assignedAt)],
        ['Estado', <AssignmentBadge status={assignment.status} />],
      ]}
    />
  )
}

export function AssignmentPanel({
  providerId,
  dispatch,
  assignments,
  active,
}: {
  providerId: string
  dispatch: ProviderDispatch
  assignments: ReturnType<typeof useDispatchAssignments>['query']
  active: DeliveryAssignment | null
}) {
  const [assigning, setAssigning] = useState(false)
  const [reassigning, setReassigning] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const history = assignments.data ?? []
  return (
    <section className="panel" aria-labelledby="service-assignment">
      <div className="panel-toolbar">
        <div>
          <h2 id="service-assignment">Asignación</h2>
          <p>
            {active ? 'Quién ejecuta este servicio' : 'Pendiente de asignación'}
          </p>
        </div>
        <div className="row-actions">
          <button
            className="button secondary small"
            disabled={assignments.isFetching}
            onClick={() => {
              void assignments.refetch()
            }}
          >
            <RefreshCw
              size={14}
              className={assignments.isFetching ? 'spin' : ''}
            />
            Actualizar
          </button>
          {active ? (
            <>
              <button
                className="button secondary destructive small"
                onClick={() => setCancelling(true)}
              >
                CANCELAR ASIGNACIÓN
              </button>
              <button
                className="button small"
                onClick={() => setReassigning(true)}
              >
                REASIGNAR
              </button>
            </>
          ) : (
            <button className="button small" onClick={() => setAssigning(true)}>
              ASIGNAR
            </button>
          )}
        </div>
      </div>
      {assignments.isPending ? (
        <Loading />
      ) : assignments.isError ? (
        <ErrorState
          error={assignments.error}
          retry={() => {
            void assignments.refetch()
          }}
        />
      ) : (
        <>
          {active ? (
            <ActiveAssignment assignment={active} />
          ) : (
            <div className="panel-body">
              <p className="warning" role="status">
                Este servicio todavía no tiene repartidor asignado.
              </p>
              <AssignmentDeadline dispatch={dispatch} />
            </div>
          )}
          {history.length > 0 && (
            <div className="panel-body">
              <h3 className="subhead">Historial de asignaciones</h3>
              <AssignmentHistory assignments={history} />
            </div>
          )}
        </>
      )}
      <p className="panel-note">
        Sin actualización en tiempo real: otro administrador de tu proveedor
        puede reasignar al mismo tiempo. Usa Actualizar para ver quién está
        asignado ahora.
      </p>
      {assigning && (
        <AssignDialog
          providerId={providerId}
          dispatch={dispatch}
          onClose={() => setAssigning(false)}
        />
      )}
      {reassigning && active && (
        <ReassignDialog
          providerId={providerId}
          dispatch={dispatch}
          current={active}
          onClose={() => setReassigning(false)}
        />
      )}
      {cancelling && active && (
        <CancelAssignmentDialog
          providerId={providerId}
          dispatch={dispatch}
          current={active}
          onClose={() => setCancelling(false)}
        />
      )}
    </section>
  )
}
