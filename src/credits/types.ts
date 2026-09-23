// Mandaria Backend OpenAPI 1.10.0: credits.dto.ts, credits.responses.ts, credits.select.ts and
// credit-policy.ts. Mandaria credits are the commercial right to be awarded services: integers
// without currency. They are never the delivery fee, the goods value or a driver's cash.
export const creditOwnerTypes = ['PROVIDER', 'INDEPENDENT_DRIVER'] as const
export const rechargeMethods = ['TRANSFER', 'CASH', 'OTHER'] as const
export const ledgerEntryTypes = [
  'RECHARGE',
  'SERVICE_AWARD',
  'SERVICE_REFUND',
  'ADMIN_ADJUSTMENT',
] as const
export type CreditOwnerType = (typeof creditOwnerTypes)[number]
export type RechargeMethod = (typeof rechargeMethods)[number]
export type LedgerEntryType = (typeof ledgerEntryTypes)[number]

export const MAX_CREDIT_MOVEMENT = 1_000_000
export const CREDIT_REASON_MIN = 3
export const CREDIT_REASON_MAX = 500
export const CREDIT_REFERENCE_MAX = 100

export interface CreditAccount {
  id: string
  ownerType: CreditOwnerType
  /** Only with ownerType PROVIDER. */
  providerId: string | null
  /** Only with ownerType INDEPENDENT_DRIVER. */
  independentDriverProfileId: string | null
  /** Integer credits, never negative and never money. */
  balance: number
  createdAt: string
  updatedAt: string
}
/**
 * What the account owner sees. `sequence` is the real order of application, so the history can be
 * read exactly as it happened. The API does not expose which entry a SERVICE_REFUND reverses: the
 * award and the refund are linked only by their shared `referenceId` (the Dispatch).
 */
export interface CreditLedgerEntry {
  id: string
  sequence: number
  type: LedgerEntryType
  /** Signed credits, never 0: RECHARGE and SERVICE_REFUND add, SERVICE_AWARD subtracts. */
  amount: number
  balanceBefore: number
  balanceAfter: number
  rechargeMethod: RechargeMethod | null
  externalReference: string | null
  reason: string | null
  /** "DISPATCH" for service movements; null for manual ones. */
  referenceType: string | null
  referenceId: string | null
  createdAt: string
}
/** SUPER_ADMIN audit view: adds who registered the movement and with which Idempotency-Key. */
export interface AdminCreditLedgerEntry extends CreditLedgerEntry {
  creditAccountId: string
  createdByUserId: string | null
  idempotencyKey: string | null
}
/** Recharge and adjustment answer with the account already updated plus the entry written. */
export interface CreditMovement {
  account: CreditAccount
  entry: AdminCreditLedgerEntry
}
export interface RechargeInput {
  credits: number
  method: RechargeMethod
  externalReference?: string
  /** Required with OTHER; optional otherwise. */
  reason?: string
}
export interface AdjustmentInput {
  /** Signed: positive adds, negative subtracts. Never 0; the backend refuses a negative balance. */
  amount: number
  reason: string
}
export interface LedgerFilters {
  page?: number
  pageSize?: number
}
