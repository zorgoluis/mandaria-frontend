import { api, apiOnce } from '../services/api'
import type {
  AdminApplication,
  Administration,
  Application,
  ApplicationStatus,
  Attempt,
  BusinessPage,
  Marker,
  Receipt,
} from './contract'
import { isAdmin } from './contract'
const encode = encodeURIComponent
export const business = {
  list: (
    admin: boolean,
    page: number,
    status?: ApplicationStatus,
    account?: string,
  ) => {
    const q = new URLSearchParams({ page: String(page), pageSize: '20' })
    if (status) q.set('status', status)
    if (admin && account) q.set('customerAccountId', account)
    return api<BusinessPage<AdminApplication | Application>>(
      `${admin ? '/admin/customer-business-applications' : '/customer/business-applications'}?${q}`,
    )
  },
  detail: (id: string) =>
    api<Application>(`/customer/business-applications/${encode(id)}`),
  adminDetail: (id: string) =>
    api<AdminApplication>(
      `/admin/customer-business-applications/${encode(id)}`,
    ),
  access: (id: string) =>
    api<Administration>(`/admin/customer-business-access/${encode(id)}`),
  attempt: (m: Marker, close = false) => {
    const scope = {
      operation: m.operation,
      ...(m.target ? { target: m.target } : {}),
      ...(isAdmin(m.operation) ? { customerAccountId: m.account } : {}),
    }
    const base = `${isAdmin(m.operation) ? '/admin/customer-business-application-attempts' : '/customer/business-application-attempts'}/${encode(m.key)}`
    return close
      ? apiOnce<Attempt>(base + '/close', 'POST', scope)
      : api<Attempt>(base + '?' + new URLSearchParams(scope))
  },
  send: (m: Marker, body: unknown) => {
    const account = `/admin/customer-business-access/${encode(m.account)}`
    const paths = {
      SUBMIT: '/customer/business-applications',
      WITHDRAW: `/customer/business-applications/${encode(m.target ?? '')}/withdraw`,
      DOWNGRADE: '/customer/profile/type',
      DECIDE: `/admin/customer-business-applications/${encode(m.target ?? '')}/decision`,
      REVOKE: account + '/revoke',
      ALLOW_REAPPLICATION: account + '/allow-reapplication',
    }
    return apiOnce<Receipt>(paths[m.operation], 'POST', body, undefined, {
      'Idempotency-Key': m.key,
    })
  },
}
