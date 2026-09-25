import { useQuery } from '@tanstack/react-query'
import { deliveryAssignments } from './service'
import { assignmentKeys } from './queries'

/**
 * The history endpoint is the authority on who is executing the service. A 200 from assign or
 * reassign never means "my assignment is the ACTIVE one": concurrent reassignments serialise and
 * both succeed, so the ACTIVE assignment is always read back from the backend.
 */
export function useDispatchAssignments(
  providerId: string,
  dispatchId: string,
  enabled: boolean,
) {
  const query = useQuery({
    queryKey: assignmentKeys.history(providerId, dispatchId),
    queryFn: ({ signal }) =>
      deliveryAssignments.history(providerId, dispatchId, signal),
    enabled,
    staleTime: 0,
  })
  const active = query.data?.find((item) => item.status === 'ACTIVE') ?? null
  return { query, active }
}
