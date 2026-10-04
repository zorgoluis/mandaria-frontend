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
  // V1.11: DELIVERED is terminal. The history stays on screen, but nothing can be changed and
  // the assignment that executed the service is now COMPLETED, not ACTIVE.
  const delivered =
    dispatch.status === 'DELIVERED' || dispatch.status === 'RETURNED'
  const ordinary =
    dispatch.access === 'OWNER' &&
    dispatch.status === 'CLAIMED' &&
    (dispatch.trackingMode === 'LEGACY' ||
      dispatch.trackingMode === null ||
      (dispatch.trackingMode === 'DETAILED' &&
        !!dispatch.execution &&
        dispatch.execution.allowedActions.includes(
          'ORDINARY_ASSIGNMENT_OPERATIONS',
        ) &&
        !dispatch.execution.openIncidentId &&
        active?.id === dispatch.execution.activeAssignmentId))
  const completed = history.find((item) => item.status === 'COMPLETED') ?? null
  return (
    <section className="panel" aria-labelledby="service-assignment">
      <div className="panel-toolbar">
        <div>
          <h2 id="service-assignment">Asignación</h2>
          <p>
            {dispatch.status === 'RETURNED'
              ? 'Custodia finalizada: devolución al origen'
              : dispatch.access !== 'OWNER'
                ? 'Historial de tu proveedor'
                : delivered
                  ? 'Quién entregó este servicio'
                  : active
                    ? 'Quién ejecuta este servicio'
                    : 'Pendiente de asignación'}
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
          {delivered || !ordinary ? null : active ? (
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
          {(active ?? (delivered ? completed : null)) ? (
            <ActiveAssignment assignment={(active ?? completed)!} />
          ) : delivered ? (
            <div className="panel-body">
              <p className="panel-note">
                La ejecución terminó. Su historial de asignaciones se conserva
                tal como lo devuelve Mandaria.
              </p>
            </div>
          ) : (
            <div className="panel-body">
              <p className="warning" role="status">
                {dispatch.execution?.activeAssignmentId &&
                dispatch.access === 'OWNER'
                  ? 'No se ha confirmado la asignación vigente en el historial. Actualiza antes de operar.'
                  : dispatch.access === 'OWNER'
                    ? 'Este servicio todavía no tiene repartidor asignado.'
                    : 'Tu proveedor no es el ejecutor vigente.'}
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
        {dispatch.status === 'RETURNED'
          ? 'Devolución al origen; no acredita entrega al destinatario ni reembolso automático.'
          : delivered
            ? 'El repartidor y el vehículo quedaron libres al confirmar la entrega; aquí permanece quién la realizó.'
            : 'Sin actualización en tiempo real: otro administrador de tu proveedor puede reasignar al mismo tiempo. Usa Actualizar para ver quién está asignado ahora.'}
      </p>
      {assigning && ordinary && (
        <AssignDialog
          providerId={providerId}
          dispatch={dispatch}
          onClose={() => setAssigning(false)}
        />
      )}
      {reassigning && active && ordinary && (
        <ReassignDialog
          providerId={providerId}
          dispatch={dispatch}
          current={active}
          onClose={() => setReassigning(false)}
        />
      )}
      {cancelling && active && ordinary && (
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
