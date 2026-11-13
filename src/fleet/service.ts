import { api } from '../services/api'
import { queryString } from '../services/query'
import { ApiError } from '../services/errors'
import type {
  FleetFilters,
  FleetPage,
  OperationContext,
  Spending,
  SpendingCommand,
} from './types'

const path = (route: string, providerId: string) =>
  `/provider/${route}?${queryString({ providerId })}`
export const fleet = {
  context: (providerId: string, signal?: AbortSignal) =>
    api<OperationContext>(
      path('fleet-operation-context', providerId),
      'GET',
      undefined,
      signal,
    ),
  spending: (providerId: string, driverId: string, signal?: AbortSignal) =>
    api<Spending>(
      path(
        `drivers/${encodeURIComponent(driverId)}/fleet-spending`,
        providerId,
      ),
      'GET',
      undefined,
      signal,
    ),
  setSpending: (providerId: string, driverId: string, body: SpendingCommand) =>
    api<Spending>(
      path(
        `drivers/${encodeURIComponent(driverId)}/fleet-spending`,
        providerId,
      ),
      'PUT',
      body,
    ),
  services: (
    providerId: string,
    filters: FleetFilters,
    pageToken?: string,
    dispatchId?: string,
    signal?: AbortSignal,
  ) => {
    // Explicit allowlist: never forward legacy pagination or operational parameters.
    const { from, to, status, driverId, vehicleId } = filters
    return api<FleetPage>(
      `/provider/fleet-services${dispatchId ? `/${encodeURIComponent(dispatchId)}` : ''}?${queryString({ providerId, from, to, status, driverId, vehicleId, pageToken })}`,
      'GET',
      undefined,
      signal,
    ).catch((error: unknown) => {
      // History shares the backend economic-token parser. Preserve its actual code/status.
      if (
        pageToken &&
        error instanceof ApiError &&
        error.code === 'ECONOMIC_CONTEXT_CHANGED'
      ) {
        throw new ApiError(
          error.status,
          'No se pudo validar el cursor del historial. Refresca el historial para volver al inicio.',
          error.code,
          [],
          error.requestId,
        )
      }
      throw error
    })
  },
}
