import { QueryClient } from '@tanstack/react-query'
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: false, refetchOnWindowFocus: true },
    mutations: { retry: false },
  },
})
export function queryString(
  params: Record<string, string | number | undefined>,
) {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => [key, String(value)])
  return new URLSearchParams(entries).toString()
}
