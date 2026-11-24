import { api } from '../services/api'
import { queryString } from '../services/query'
import type { Page } from '../types/api'

export type WeatherState = 'RAIN' | 'NO_RAIN' | 'UNKNOWN'
export type WeatherStatus =
  | 'NOT_CONFIGURED'
  | 'DISABLED'
  | 'ZONE_INACTIVE'
  | 'PENDING'
  | 'FRESH'
  | 'STALE'
  | 'ERROR'
  | 'BUDGET_EXHAUSTED'
export interface WeatherConfiguration {
  enabled: boolean
  latitude: number
  longitude: number
  updatedAt: string
  updatedBy: string
  reason: string
}
export interface WeatherReading {
  state: WeatherState
  conditionCode: string
  dataTime: string
  fetchedAt: string
  validUntil: string
}
export interface WeatherZone {
  serviceZone: {
    id: string
    code: string
    name: string
    status: 'ACTIVE' | 'INACTIVE'
  }
  configuration: WeatherConfiguration | null
  status: WeatherStatus
  state: WeatherState
  reading: WeatherReading | null
  lastAttemptAt: string | null
}
export interface WeatherPage extends Page<WeatherZone> {
  mode: 'PILOT_NO_CHARGE'
  provider: 'GOOGLE_WEATHER'
  globalEnabled: boolean
  serverTime: string
}
export interface WeatherConfigurationInput {
  enabled: boolean
  latitude: number
  longitude: number
  reason: string
}
const base = '/admin/weather-pilot'
export const weatherPilot = {
  list: (page: number, signal?: AbortSignal) =>
    api<WeatherPage>(
      `${base}?${queryString({ page, pageSize: 20 })}`,
      'GET',
      undefined,
      signal,
    ),
  configure: (id: string, input: WeatherConfigurationInput) =>
    api<WeatherZone>(`${base}/${encodeURIComponent(id)}`, 'PUT', input),
}
