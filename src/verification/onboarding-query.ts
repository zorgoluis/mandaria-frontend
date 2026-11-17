import { queryOptions } from '@tanstack/react-query'
import { vkey } from './format'
import { verification } from './service'
import type { OnboardingView } from './types'

export const onboardingQuery = (actor: string, view: OnboardingView) =>
  queryOptions({
    queryKey: vkey(actor, 'onboarding', view),
    queryFn: ({ signal }) => verification.onboarding(view, signal),
  })
