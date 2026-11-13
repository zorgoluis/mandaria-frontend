import { ApiError } from '../services/errors'
import schemas from './schemas.json'
type Schema = {
  type?: string | string[]
  enum?: unknown[]
  const?: unknown
  anyOf?: Schema[]
  oneOf?: Schema[]
  properties?: Record<string, Schema>
  required?: string[]
  items?: Schema
  pattern?: string
  format?: string
  minimum?: number
  maximum?: number
  additionalProperties?: boolean
}
export const uuid = (s: unknown): s is string =>
  typeof s === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
export const revision = (s: unknown): s is string =>
  typeof s === 'string' &&
  /^(0|[1-9][0-9]{0,18})$/.test(s) &&
  BigInt(s) <= 9223372036854775807n
function valid(s: Schema, v: unknown): boolean {
  if (s.anyOf) return s.anyOf.some((x) => valid(x, v))
  if (s.oneOf) return s.oneOf.filter((x) => valid(x, v)).length === 1
  if (s.const !== undefined && s.const !== v) return false
  if (s.enum && !s.enum.includes(v)) return false
  if (Array.isArray(s.type))
    return s.type.some((type) => valid({ ...s, type }, v))
  if (s.type === 'null') return v === null
  if (s.type === 'object') {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return false
    const r = v as Record<string, unknown>
    return (
      (s.required ?? []).every((k) => k in r) &&
      Object.entries(r).every(([k, value]) =>
        s.properties?.[k]
          ? valid(s.properties[k], value) &&
            (!/revision$/i.test(k) || revision(value))
          : s.additionalProperties !== false,
      )
    )
  }
  if (s.type === 'array')
    return Array.isArray(v) && v.every((x) => !s.items || valid(s.items, x))
  if (s.type === 'boolean') return typeof v === 'boolean'
  if (s.type === 'integer' || s.type === 'number')
    return (
      typeof v === 'number' &&
      Number.isFinite(v) &&
      (s.type !== 'integer' || Number.isInteger(v)) &&
      (s.minimum === undefined || v >= s.minimum) &&
      (s.maximum === undefined || v <= s.maximum)
    )
  if (s.type === 'string')
    return (
      typeof v === 'string' &&
      (!s.pattern || new RegExp(s.pattern).test(v)) &&
      (s.format !== 'uuid' || uuid(v)) &&
      (s.format !== 'date-time' ||
        (/^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v))))
    )
  return true
}
export function parse<T>(name: keyof typeof schemas, value: unknown): T {
  if (!valid(schemas[name] as Schema, value))
    throw new ApiError(
      502,
      'Respuesta de salidas incompatible; no se habilitan comandos.',
    )
  return value as T
}
