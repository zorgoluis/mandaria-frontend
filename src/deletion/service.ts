import { apiOnce, publicApi } from '../services/api'
import { ApiError } from '../services/errors'
import { commandReceipt } from './receipt'
import {
  snapshot,
  type CreateBody,
  type Snapshot,
  type Task,
  type WorkItem,
  type Replacement,
} from './contract'
const base = '/privacy/deletion-requests',
  admin = '/admin' + base,
  enc = encodeURIComponent
async function read(path: string, signal?: AbortSignal) {
  return snapshot(await apiOnce<unknown>(path, 'GET', undefined, signal))
}
export const deletion = {
  commandReceipt: async (id: string, key: string, signal?: AbortSignal) =>
    commandReceipt(
      await apiOnce(
        `${admin}/${enc(id)}/commands/by-key/${enc(key)}`,
        'GET',
        undefined,
        signal,
      ),
      id,
      key,
    ),
  create: async (key: string, body: CreateBody) =>
    snapshot(
      await apiOnce(base, 'POST', body, undefined, { 'Idempotency-Key': key }),
    ),
  get: (id: string, signal?: AbortSignal) => read(`${base}/${enc(id)}`, signal),
  byKey: (key: string, signal?: AbortSignal) =>
    read(`${base}/by-key/${enc(key)}`, signal),
  receipt: (id: string, signal?: AbortSignal) =>
    read(`${base}/${enc(id)}/receipt`, signal),
  list: async (signal?: AbortSignal) =>
    (await apiOnce<unknown[]>(admin, 'GET', undefined, signal)).map((r) =>
      snapshot(r),
    ),
  tasks: async (id: string, signal?: AbortSignal): Promise<Task[]> =>
    (
      await apiOnce<Task[]>(
        `${admin}/${enc(id)}/tasks`,
        'GET',
        undefined,
        signal,
      )
    ).map(({ id, kind, status, dueAt, ownerId, deputyId, restrictions }) => ({
      id,
      kind: kind.split(':')[0],
      status,
      dueAt,
      ownerId,
      deputyId,
      ...(kind.startsWith('RESTRICTION_REVIEW:')
        ? { objectId: kind.split(':')[1] }
        : {}),
      restrictions: restrictions?.map(
        ({ id, kind, active, reviewReason, reviewedAt, reviewDueAt }) => ({
          id,
          kind,
          active,
          reviewReason,
          reviewedAt,
          reviewDueAt,
        }),
      ),
    })),
  items: async (id: string, signal?: AbortSignal): Promise<WorkItem[]> =>
    (
      await apiOnce<WorkItem[]>(
        `${admin}/${enc(id)}/work-items`,
        'GET',
        undefined,
        signal,
      )
    ).map(
      ({
        id,
        attachmentId,
        caseId,
        classification,
        status,
        attempts,
        retryAt,
        errorCode,
        baselineAt,
        reviewStep,
        nextReviewAt,
        lastReviewedAt,
        finalVerifiedAt,
        watchUntil,
        incidentCode,
        incidentAt,
      }) => ({
        id,
        attachmentId,
        caseId,
        classification,
        status,
        attempts,
        retryAt,
        errorCode,
        baselineAt,
        reviewStep,
        nextReviewAt,
        lastReviewedAt,
        finalVerifiedAt,
        watchUntil,
        incidentCode,
        incidentAt,
      }),
    ),
  replacements: async (id: string, signal?: AbortSignal) =>
    (
      await apiOnce<Replacement[]>(
        `${admin}/${enc(id)}/replacements`,
        'GET',
        undefined,
        signal,
      )
    ).map(({ newCaseId, oldCaseId, acceptedAt }) => ({
      newCaseId,
      oldCaseId,
      acceptedAt,
    })),
  command: async (
    key: string,
    id: string,
    op: string,
    body: unknown,
  ): Promise<Snapshot | undefined> => {
    const raw = await apiOnce<unknown>(
      `${op === 'cancel' ? base : admin}/${enc(id)}/${op}`,
      'POST',
      body,
      undefined,
      { 'Idempotency-Key': key },
    )
    if (op === 'resolve' || op === 'cancel') return snapshot(raw)
    const result = raw as {
      recorded?: boolean
      restoreBlocked?: boolean
      externalRestoreScriptsProtected?: boolean
    } | null
    if (
      op === 'retention-decisions'
        ? result?.recorded !== true
        : result?.restoreBlocked !== true ||
          result?.externalRestoreScriptsProtected !== false
    )
      throw new ApiError(0, 'Respuesta incompleta')
    return undefined
  },
  access: (id: string, body: { verifiedEmail: string; evidenceRef: string }) =>
    apiOnce<{ accepted: boolean }>(
      `${admin}/${enc(id)}/assisted-access`,
      'POST',
      body,
    ),
  privateStatus: async (token: string, signal?: AbortSignal) =>
    snapshot(
      await publicApi(
        '/privacy/deletion-access/status',
        'POST',
        { token },
        signal,
      ),
    ),
}
