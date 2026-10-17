import { ApiError } from '../services/errors'
import { snapshot, scopes, states, type Snapshot } from './contract'
export type CommandReceipt = {
  status: 'APPLIED'
  requestId: string
  key: string
  recordedAt: string
  result:
    | Omit<Snapshot, 'blockingReason' | 'pendingActions'>
    | { recorded: true }
    | { restoreBlocked: true; externalRestoreScriptsProtected: false }
}
export function commandReceipt(
  raw: unknown,
  id: string,
  key: string,
): CommandReceipt {
  const r = raw as CommandReceipt | null
  const invalid = () => {
    throw new ApiError(0, 'Recibo no reconocido')
  }
  if (
    !r ||
    r.status !== 'APPLIED' ||
    r.requestId !== id ||
    r.key !== key ||
    typeof r.recordedAt !== 'string' ||
    !Number.isFinite(Date.parse(r.recordedAt)) ||
    !r.result
  )
    return invalid()
  const result = r.result
  let safe: CommandReceipt['result']
  if (
    'recorded' in result &&
    result.recorded === true &&
    Object.keys(result).length === 1
  )
    safe = { recorded: true }
  else if (
    'restoreBlocked' in result &&
    result.restoreBlocked === true &&
    result.externalRestoreScriptsProtected === false &&
    Object.keys(result).length === 2
  )
    safe = { restoreBlocked: true, externalRestoreScriptsProtected: false }
  else if (
    'id' in result &&
    result.id === id &&
    Object.hasOwn(scopes, result.scope) &&
    Object.hasOwn(states, result.status) &&
    result.status !== 'CANCELLED' &&
    result.providerBackups === 'NOT_ATTESTED' &&
    result.productionReady === false
  ) {
    const s = snapshot(
      {
        ...result,
        blockingReason: null,
        pendingActions: undefined,
        evidenceLevel: undefined,
      },
      0,
    )
    safe = {
      id: s.id,
      scope: s.scope,
      status: s.status,
      revision: s.revision,
      receivedAt: s.receivedAt,
      confirmedAt: s.confirmedAt,
      deadline: s.deadline,
      replacementDeadline: s.replacementDeadline,
      closedAt: s.closedAt,
      auditUntil: s.auditUntil,
      contactUntil: s.contactUntil,
      irreversibleStarted: s.irreversibleStarted,
      providerBackups: s.providerBackups,
      productionReady: s.productionReady,
      completedDocumentaryScopes: s.completedDocumentaryScopes,
    }
  } else return invalid()
  return {
    status: 'APPLIED',
    requestId: id,
    key,
    recordedAt: r.recordedAt,
    result: safe,
  }
}
