import type { ProviderStatus, User } from '../types/api'

// Mandaria Backend OpenAPI 1.4.0: logistics.responses.ts and the create/update DTOs.
export const driverStatuses = ['PENDING', 'ACTIVE', 'SUSPENDED'] as const
export const availabilityValues = ['OFFLINE', 'AVAILABLE', 'BUSY'] as const
export const vehicleTypes = [
  'BICYCLE',
  'MOTORCYCLE',
  'CAR',
  'PICKUP',
  'VAN',
  'TRUCK',
  'OTHER',
] as const
export const vehicleStatuses = [
  'ACTIVE',
  'INACTIVE',
  'MAINTENANCE',
  'SUSPENDED',
] as const
export type DriverStatus = (typeof driverStatuses)[number]
export type VehicleStatus = (typeof vehicleStatuses)[number]
export type VehicleType = (typeof vehicleTypes)[number]
export type LogisticsRole = 'SUPER_ADMIN' | 'PROVIDER_ADMIN'
export interface Scope {
  role: LogisticsRole
  providerId: string
}
export interface ProviderContext extends Scope {
  name: string
  status: ProviderStatus
}
export interface Capacity {
  providerId: string
  drivers: { count: number; max: number }
  vehicles: { count: number; max: number }
}
export interface DriverSummary {
  id: string
  name: string
  status: DriverStatus
  availability: (typeof availabilityValues)[number]
}
export interface VehicleSummary {
  id: string
  identifier: string
  type: VehicleType
  status: VehicleStatus
}
export interface Driver extends DriverSummary {
  providerId: string
  userId: string
  user: Pick<User, 'id' | 'email' | 'role' | 'active'>
  currentAssignment: {
    id: string
    assignedAt: string
    vehicle: VehicleSummary
  } | null
  createdAt: string
  updatedAt: string
}
export interface VehicleDetails {
  brand?: string | null
  model?: string | null
  year?: number | null
  color?: string | null
  plate?: string | null
}
export interface Vehicle extends VehicleSummary, VehicleDetails {
  providerId: string
  currentAssignment: {
    id: string
    assignedAt: string
    driver: DriverSummary
  } | null
  createdAt: string
  updatedAt: string
}
export interface DriverInput {
  userId: string
  name: string
}
export interface VehicleInput extends VehicleDetails {
  identifier: string
  type: VehicleType
  status?: VehicleStatus
}
export interface Assignment {
  id: string
  providerId: string
  driverId: string
  vehicleId: string
  assignedAt: string
  unassignedAt: string | null
  driver: Pick<DriverSummary, 'id' | 'name'>
  vehicle: Pick<VehicleSummary, 'id' | 'identifier' | 'type'>
}
export interface DriverFilters {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  availability?: string
}
export interface VehicleFilters {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  type?: string
}
