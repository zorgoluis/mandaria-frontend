import { api, apiOnce } from '../services/api'
import { validCategory, type DriverCategory } from './contract'
export interface CategoryCommand {
  requestId: string
  expectedRevision: string
  reason: string
}
export type CategoryReceipt = DriverCategory & {
  requestId: string
  reason: string
}
export const categoryPath = (driverId: string) =>
  '/admin/drivers/' +
  encodeURIComponent(driverId) +
  '/category/reconcile-legacy-fleet'
export function validateCommand(body: CategoryCommand) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      body.requestId,
    ) ||
    !/^\d+$/.test(body.expectedRevision) ||
    body.reason.trim().length < 3 ||
    body.reason.length > 500 ||
    Object.keys(body).sort().join(',') !== 'expectedRevision,reason,requestId'
  )
    throw Error('Intención de conciliación inválida.')
}
export const categories = {
  async get(driverId: string, signal?: AbortSignal) {
    const value = await api<DriverCategory>(
      `/admin/drivers/${encodeURIComponent(driverId)}/category`,
      'GET',
      undefined,
      signal,
    )
    if (!validCategory(value))
      throw Error('Categoría administrativa no reconocida.')
    return value
  },
  async reconcile(driverId: string, body: CategoryCommand) {
    validateCommand(body)
    const r = await apiOnce<CategoryReceipt>(
      categoryPath(driverId),
      'POST',
      body,
    )
    if (
      !validCategory(r) ||
      r.requestId !== body.requestId ||
      r.reason !== body.reason ||
      r.category !== 'FLEET' ||
      r.independentMembershipState !== 'HISTORICAL'
    )
      throw Error('Recibo de conciliación incompatible; conserva la intención.')
    return r
  },
}
