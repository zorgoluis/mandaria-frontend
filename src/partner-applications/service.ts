import { api } from '../services/api'
import { queryString } from '../services/query'
import type { Page } from '../types/api'
import type {
  LinkInput,
  PartnerApplication,
  PartnerApplicationFilters,
  StatusChangeInput,
} from './types'

const base = '/admin/partner-applications'
const item = (reference: string, action = '') =>
  `${base}/${encodeURIComponent(reference)}${action}`

/**
 * SUPER_ADMIN only. Nothing here creates providers, invitations or accounts: links only
 * record what the existing flows already created, and the backend validates them.
 */
export const partnerApplications = {
  list: (filters: PartnerApplicationFilters, signal?: AbortSignal) => {
    const query = queryString({ ...filters })
    return api<Page<PartnerApplication>>(
      `${base}${query ? `?${query}` : ''}`,
      'GET',
      undefined,
      signal,
    )
  },
  get: (reference: string, signal?: AbortSignal) =>
    api<PartnerApplication>(item(reference), 'GET', undefined, signal),
  changeStatus: (reference: string, input: StatusChangeInput) =>
    api<PartnerApplication>(item(reference, '/status'), 'POST', input),
  link: (reference: string, input: LinkInput) =>
    api<PartnerApplication>(item(reference, '/links'), 'POST', input),
}
