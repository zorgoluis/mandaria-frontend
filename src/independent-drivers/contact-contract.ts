import type { IndependentDriverProfile } from './types'

export type AdminIndependentDriverDetail = IndependentDriverProfile & {
  declaredContact?: DeclaredContact
}
export type DeclaredContact = {
  availability: 'AVAILABLE' | 'NOT_RECORDED' | 'UNAVAILABLE'
  phone: string | null
  source: 'DRIVER_IDENTITY_DECLARATION'
}
export function declaredContact(value: unknown): DeclaredContact | undefined {
  if (!value || typeof value !== 'object') return undefined
  const v = value as Record<string, unknown>
  if (v.source !== 'DRIVER_IDENTITY_DECLARATION') return undefined
  if (
    v.availability === 'AVAILABLE' &&
    typeof v.phone === 'string' &&
    v.phone.trim()
  )
    return { availability: 'AVAILABLE', phone: v.phone, source: v.source }
  if (
    (v.availability === 'NOT_RECORDED' || v.availability === 'UNAVAILABLE') &&
    v.phone === null
  )
    return { availability: v.availability, phone: null, source: v.source }
  return undefined
}
