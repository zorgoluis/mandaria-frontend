import type { Requirements, VerificationCase } from './types'

export function uploadQuota(
  record: VerificationCase,
  requirements: Requirements,
) {
  // Only an explicit backend capability changes the legacy all-attempts quota.
  const validatedOnly = requirements.fileLimitMode === 'VALIDATED'
  const used = validatedOnly
    ? record.attachments.filter((a) => a.status === 'VALIDATED').length
    : record.attachments.length
  return {
    validatedOnly,
    used,
    remaining: Math.max(0, requirements.maxFiles - used),
    full: used >= requirements.maxFiles,
  }
}
