import type { Terms } from './types'

export function provenance(environment?: string) {
  return environment === 'PRODUCTION'
    ? 'Entorno documental productivo'
    : environment === 'LOCAL_TEST'
      ? 'PRUEBA LOCAL — no habilita producción'
      : 'Procedencia no informada; no se acredita aplicación productiva'
}
export function termsKey(t: Terms) {
  return JSON.stringify([
    t.scope,
    t.environment,
    t.version,
    t.hash,
    t.privacyVersion,
    t.privacyHash,
    t.specificConsents,
  ])
}
export function completeTerms(t: Terms) {
  const hash = (h: unknown) => typeof h === 'string' && /^[a-f0-9]{64}$/.test(h)
  if (!t.text?.trim() || !t.version || !hash(t.hash)) return false
  if (t.environment === 'LOCAL_TEST') return true
  return (
    t.environment === 'PRODUCTION' &&
    Number.isFinite(Date.parse(t.publishedAt || '')) &&
    !!t.privacyVersion &&
    !!t.privacyText?.trim() &&
    hash(t.privacyHash) &&
    Array.isArray(t.specificConsents) &&
    t.specificConsents.length <= 10 &&
    new Set(t.specificConsents.map((c) => c.id)).size ===
      t.specificConsents.length &&
    t.specificConsents.every(
      (c) =>
        /^[A-Za-z0-9_-]{1,60}$/.test(c.id) && !!c.text?.trim() && hash(c.hash),
    )
  )
}
