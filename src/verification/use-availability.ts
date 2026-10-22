import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/context'
import { verification } from './service'
import { vkey } from './format'
import { documentaryAvailability } from './availability'

export function useRequirements() {
  const { user } = useAuth()
  return useQuery({
    queryKey: vkey(user?.id || 'anonymous', 'requirements'),
    queryFn: ({ signal }) => verification.requirements(signal),
    enabled:
      !!user && ['DRIVER', 'PROVIDER_ADMIN', 'SUPER_ADMIN'].includes(user.role),
    retry: false,
    gcTime: 0,
    staleTime: 0,
  })
}
export function useTermsQuery(providerId?: string, enabled = true) {
  const { user } = useAuth()
  const runtime = useRequirements()
  const scope = providerId ? 'FLEET' : 'DRIVER'
  return useQuery({
    queryKey: vkey(
      user?.id || 'anonymous',
      'terms',
      scope,
      providerId,
      runtime.data?.environment,
    ),
    queryFn: ({ signal }) => verification.terms(scope, providerId, signal),
    enabled: !!user && enabled && documentaryAvailability(runtime).canProceed,
    retry: false,
    gcTime: 0,
    staleTime: 0,
  })
}
