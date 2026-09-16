import { useSearchParams } from 'react-router-dom'
export const resourceLink = (
  kind: 'drivers' | 'vehicles',
  providerId: string,
  id?: string,
) =>
  `/${kind}${id ? `/${encodeURIComponent(id)}` : ''}?providerId=${encodeURIComponent(providerId)}`

export function useResourceFilters() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(
    1,
    Math.min(100000, Math.trunc(Number(params.get('page')) || 1)),
  )
  return {
    page,
    search: params.get('search') ?? '',
    status: params.get('status') ?? '',
    availability: params.get('availability') ?? '',
    type: params.get('type') ?? '',
    onPage: (value: number) => {
      const next = new URLSearchParams(params)
      next.set('page', String(value))
      setParams(next)
    },
  }
}
