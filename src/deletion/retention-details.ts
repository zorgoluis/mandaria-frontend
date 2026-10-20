import { ApiError } from '../services/errors'
export interface RetentionDetailsData {
  noticeState: 'PENDING' | 'ACCEPTED' | 'BLOCKED' | 'NOT_APPLICABLE'
  exceptions: {
    id: string
    category: string
    scope: 'LIMITED_DOCUMENT_IMAGES' | 'LIMITED_PROCEDURE_DATA'
    state: 'ACTIVE' | 'REVIEW_DUE' | 'EXPIRED'
    reasonCode: 'DOCUMENTED_RETENTION'
    publicReason: string
    reviewAt: string
    expiresAt: string | null
    administrative?: {
      purpose: string
      basis: string
      ownerId: string
      objectId: string | null
    }
  }[]
  history: { kind: string; recordedAt: string }[]
  historyTruncated: boolean
}
export function retentionDetails(raw: unknown): RetentionDetailsData {
  const r = raw as RetentionDetailsData
  const date = (v: unknown) =>
    typeof v === 'string' && Number.isFinite(Date.parse(v))
  if (
    !r ||
    !['PENDING', 'ACCEPTED', 'BLOCKED', 'NOT_APPLICABLE'].includes(
      r.noticeState,
    ) ||
    !Array.isArray(r.exceptions) ||
    !Array.isArray(r.history) ||
    typeof r.historyTruncated !== 'boolean' ||
    r.exceptions.some(
      (e) =>
        !e ||
        typeof e.id !== 'string' ||
        typeof e.category !== 'string' ||
        !['LIMITED_DOCUMENT_IMAGES', 'LIMITED_PROCEDURE_DATA'].includes(
          e.scope,
        ) ||
        !['ACTIVE', 'REVIEW_DUE', 'EXPIRED'].includes(e.state) ||
        e.reasonCode !== 'DOCUMENTED_RETENTION' ||
        typeof e.publicReason !== 'string' ||
        !date(e.reviewAt) ||
        (e.expiresAt !== null && !date(e.expiresAt)) ||
        (e.administrative &&
          [
            e.administrative.purpose,
            e.administrative.basis,
            e.administrative.ownerId,
          ].some((v) => typeof v !== 'string')),
    ) ||
    r.history.some(
      (e) => !e || typeof e.kind !== 'string' || !date(e.recordedAt),
    )
  )
    throw new ApiError(
      0,
      'Proyección de conservación incompleta; vuelve a consultar.',
    )
  return {
    noticeState: r.noticeState,
    exceptions: r.exceptions.map((e) => ({
      id: e.id,
      category: e.category,
      scope: e.scope,
      state: e.state,
      reasonCode: e.reasonCode,
      publicReason: e.publicReason,
      reviewAt: e.reviewAt,
      expiresAt: e.expiresAt,
      ...(e.administrative
        ? {
            administrative: {
              purpose: e.administrative.purpose,
              basis: e.administrative.basis,
              ownerId: e.administrative.ownerId,
              objectId: e.administrative.objectId,
            },
          }
        : {}),
    })),
    history: r.history.map((e) => ({ kind: e.kind, recordedAt: e.recordedAt })),
    historyTruncated: r.historyTruncated,
  }
}
