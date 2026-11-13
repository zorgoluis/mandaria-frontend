import type { ReactNode } from 'react'
import { useAuth } from '../auth/context'
import { ProviderScope } from '../logistics/components'
import type { ProviderContext } from '../logistics/types'
import { FleetGate } from './gate'
import { allows } from './permissions'

export function FleetResourceScope({
  children,
}: {
  children: (scope: ProviderContext) => ReactNode
}) {
  const { user } = useAuth()
  return (
    <ProviderScope>
      {(scope) =>
        scope.role === 'SUPER_ADMIN' ? (
          children(scope)
        ) : (
          <FleetGate
            key={`${user?.id}:${scope.providerId}`}
            providerId={scope.providerId}
          >
            {(context) =>
              allows(context, 'canManageResources') ? (
                children(scope)
              ) : (
                <p role="alert">
                  Sin permiso para administrar recursos de esta flotilla.
                </p>
              )
            }
          </FleetGate>
        )
      }
    </ProviderScope>
  )
}
