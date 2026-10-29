import { apiOnce } from '../services/api'
import { uuid } from '../fleet-exit/validation'
export type Operation = 'TAKE' | 'RELEASE'
export interface Receipt {
  operation: Operation
  dispatchId: string
  assignmentId: string
  dispatchStatus: 'CLAIMED' | 'OPEN' | 'EXPIRED'
  assignmentStatus: 'ACTIVE' | 'CANCELLED'
  credits: {
    awardEntryId: string | null
    refundEntryId: string | null
    amount: number
  }
}
export interface Attempt {
  operation: Operation
  dispatchId: string
  state: 'APPLIED' | 'PENDING_OR_UNKNOWN' | 'CLOSED_NO_EFFECTS'
  result: Receipt | null
  canPrepareNewAttempt: boolean
}
export function receipt(
  value: unknown,
  operation: Operation,
  dispatchId: string,
): Receipt {
  const r = value as Receipt
  if (
    !r ||
    r.operation !== operation ||
    r.dispatchId !== dispatchId ||
    !uuid(r.assignmentId) ||
    !['CLAIMED', 'OPEN', 'EXPIRED'].includes(r.dispatchStatus) ||
    !['ACTIVE', 'CANCELLED'].includes(r.assignmentStatus) ||
    !r.credits ||
    !Number.isSafeInteger(r.credits.amount) ||
    ![r.credits.awardEntryId, r.credits.refundEntryId].every(
      (v) => v === null || uuid(v),
    )
  )
    throw Error(
      'Recibo incompatible. Conserva la intención y consulta su resultado.',
    )
  return r
}
export async function independentAttempt(
  id: string,
  operation: Operation,
  key: string,
  close = false,
): Promise<Attempt> {
  if (!uuid(id) || !uuid(key)) throw Error('Referencia de intento inválida.')
  const r = await apiOnce<Attempt>(
    `/driver/dispatches/${id}/independent-attempt${close ? '/close' : ''}?operation=${operation}`,
    close ? 'POST' : 'GET',
    undefined,
    undefined,
    { 'Idempotency-Key': key },
  )
  if (
    !r ||
    r.dispatchId !== id ||
    r.operation !== operation ||
    !['APPLIED', 'PENDING_OR_UNKNOWN', 'CLOSED_NO_EFFECTS'].includes(r.state) ||
    r.canPrepareNewAttempt !== (r.state === 'CLOSED_NO_EFFECTS')
  )
    throw Error('Estado de intento incompatible.')
  if (r.state === 'APPLIED') receipt(r.result, operation, id)
  else if (r.result !== null) throw Error('Resultado de intento incompatible.')
  return r
}
