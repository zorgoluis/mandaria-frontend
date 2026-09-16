export type Role = 'SUPER_ADMIN' | 'PROVIDER_ADMIN' | 'DRIVER'
export interface User {
  id: string
  email: string
  role: Role
  active: boolean
  createdAt: string
  updatedAt: string
  emailVerifiedAt: string | null
}
export interface Tokens {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
}
export type ProviderType = 'FLEET' | 'INDEPENDENT'
export type ProviderStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED'
export interface Provider {
  id: string
  name: string
  code: string
  type: ProviderType
  status: ProviderStatus
  maxDrivers: number
  maxVehicles: number
  createdAt: string
  updatedAt: string
}
export interface ProviderInput {
  name: string
  code: string
  type: ProviderType
  maxDrivers?: number
  maxVehicles?: number
}
export interface Page<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}
export interface Member {
  id: string
  userId: string
  providerId: string
  role: 'OWNER' | 'ADMIN'
  user: Pick<User, 'id' | 'email' | 'role' | 'active'>
  createdAt: string
}
export interface ProviderProfile extends Pick<
  Provider,
  'id' | 'name' | 'code' | 'type' | 'status'
> {
  limits: Pick<Provider, 'maxDrivers' | 'maxVehicles'>
  membershipRole: 'OWNER' | 'ADMIN'
}
export type IntegrationStatus = 'ACTIVE' | 'SUSPENDED' | 'REVOKED'
export const scopes = [
  'quotes:create',
  'deliveries:create',
  'deliveries:read',
  'deliveries:cancel',
] as const
export type Scope = (typeof scopes)[number]
export interface Credential {
  id: string
  clientId: string
  status: 'ACTIVE' | 'REVOKED'
  scopes: Scope[]
  expiresAt: string | null
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string
  updatedAt: string
}
export interface Integration {
  id: string
  name: string
  code: string
  status: IntegrationStatus
  createdAt: string
  updatedAt: string
}
export interface IntegrationList extends Integration {
  credentials: Credential[]
}
export interface CredentialInput {
  scopes?: Scope[]
  expiresAt?: string
}
export interface OneTimeSecret {
  clientId: string
  integrationId: string
  clientSecret: string
}
