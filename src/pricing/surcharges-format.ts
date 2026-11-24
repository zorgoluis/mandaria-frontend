import type { Surcharge } from './surcharges-service'

export function surchargeStatus(row: Surcharge, now: number) {
  if (row.disabledAt) return { value: 'INACTIVE', label: 'Desactivado' }
  if (row.expiresAt && Date.parse(row.expiresAt) <= now)
    return { value: 'EXPIRED', label: 'Vencido' }
  return {
    value: 'ACTIVE',
    label:
      row.kind === 'SCHEDULE'
        ? 'Programado'
        : row.kind === 'AUTOMATIC_RAIN'
          ? 'Condicionado a lluvia'
          : 'Vigente',
  }
}
