import { queryClient } from '../services/query'
import type { PartnerApplication } from './types'

export const partnerApplicationKeys = {
  all: ['partner-applications'] as const,
  list: (filters: object) => ['partner-applications', 'list', filters] as const,
  count: (status: string) => ['partner-applications', 'count', status] as const,
  detail: (reference: string) =>
    ['partner-applications', 'detail', reference] as const,
}
/** Every change answers with the full detail; lists and counters are read back. */
export const storePartnerApplication = (application: PartnerApplication) => {
  queryClient.setQueryData(
    partnerApplicationKeys.detail(application.reference),
    application,
  )
  return queryClient.invalidateQueries({
    queryKey: partnerApplicationKeys.all,
    predicate: (query) => query.queryKey[1] !== 'detail',
  })
}
