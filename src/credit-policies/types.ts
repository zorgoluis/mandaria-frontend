import type { ServiceType } from '../pricing/types'

// Mandaria Backend OpenAPI 1.10.0: credit-policies.dto.ts, credit-policies.responses.ts and
// credit-policy-engine.ts. A policy version is immutable: there is no PATCH and no DELETE.
export const policyActorTypes = ['PROVIDER', 'INDEPENDENT_DRIVER'] as const
export const calculationTypes = ['PER_KM', 'FLAT', 'DISTANCE_RANGE'] as const
export const policyStatuses = ['ACTIVE', 'INACTIVE'] as const
export type PolicyActorType = (typeof policyActorTypes)[number]
export type CalculationType = (typeof calculationTypes)[number]
export type PolicyStatus = (typeof policyStatuses)[number]

export const MAX_POLICY_CREDITS = 1_000_000
export const MAX_DISTANCE_METERS = 2_147_483_647
export const MAX_POLICY_RANGES = 50
export const POLICY_REASON_MIN = 3
export const POLICY_REASON_MAX = 500

export interface PolicyRange {
  id: string
  position: number
  minDistanceMeters: number
  /** null only in the last range: it covers everything from its minimum upwards. */
  maxDistanceMeters: number | null
  credits: number
}
export interface CreditPolicy {
  id: string
  serviceType: ServiceType
  actorType: PolicyActorType
  version: number
  status: PolicyStatus
  calculationType: CalculationType
  creditsPerKm: number | null
  minimumCredits: number | null
  flatCredits: number | null
  ranges: PolicyRange[]
  effectiveFrom: string
  effectiveUntil: string | null
  reason: string | null
  createdByUserId: string
  createdAt: string
}
export interface RangeInput {
  minDistanceMeters: number
  maxDistanceMeters: number | null
  credits: number
}
/** Only the fields of the chosen calculationType are allowed; anything else answers 400. */
export interface PolicyVersionInput {
  calculationType: CalculationType
  creditsPerKm?: number
  minimumCredits?: number
  flatCredits?: number
  ranges?: RangeInput[]
  reason?: string
}
export interface PolicyInput extends PolicyVersionInput {
  serviceType: ServiceType
  actorType: PolicyActorType
}
export interface PolicyFilters {
  page?: number
  pageSize?: number
  serviceType?: string
  actorType?: string
  status?: string
}
/** What a service would cost right now with the ACTIVE policy. Read only: it charges nothing. */
export interface CreditCost {
  policyId: string
  policyVersion: number
  serviceType: ServiceType
  actorType: PolicyActorType
  calculationType: CalculationType
  distanceMeters: number
  /** Informative text from the backend, e.g. "6.240". */
  distanceKm: string
  billableKm: number | null
  calculatedCredits: number | null
  minimumCredits: number | null
  minimumApplied: boolean
  rangePosition: number | null
  credits: number
}
export interface CalculationInput {
  serviceType: ServiceType
  actorType: PolicyActorType
  distanceMeters: number
}
