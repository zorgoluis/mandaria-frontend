export const zoneKeys = {
  all: ['service-zones'] as const,
  list: (filters: object) => ['service-zones', 'list', filters] as const,
  detail: (id: string) => ['service-zones', 'detail', id] as const,
}
export const ratePlanKeys = {
  all: ['rate-plans'] as const,
  list: (filters: object) => ['rate-plans', 'list', filters] as const,
  detail: (id: string) => ['rate-plans', 'detail', id] as const,
}
