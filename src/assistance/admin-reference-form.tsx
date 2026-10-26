import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/context'
import {
  loadReferences,
  referenceSections,
  type ReferenceCatalog,
} from './admin-references'
import { useAssistanceAccess } from './command-context'
import { CommandForm } from './forms'
import type { CommandBodies } from './contract'
import type { Options } from './form-model'
import type { CaseDetail, Scope } from './types'

export function AdminReferenceForm({
  scope,
  detail,
  operation,
  extraOptions,
}: {
  scope: Scope
  detail: CaseDetail
  operation: keyof CommandBodies
  extraOptions: Options
}) {
  const { user } = useAuth()
  const client = useQueryClient()
  const [generation, setGeneration] = useState(0)
  const authorized =
    user?.id === scope.actor &&
    user.role === 'SUPER_ADMIN' &&
    user.active !== false
  const query = useQuery({
    queryKey: [
      'assistance',
      scope.actor,
      'admin-references',
      detail.summary.id,
      detail.summary.revision,
      generation,
    ],
    enabled: authorized,
    retry: false,
    gcTime: 0,
    staleTime: 0,
    queryFn: async ({ signal }) => {
      const pages = await Promise.all(
        referenceSections.map(
          async (section) =>
            [
              section,
              await loadReferences(scope, detail.summary.id, section, signal),
            ] as const,
        ),
      )
      return Object.fromEntries(pages) as ReferenceCatalog
    },
  })
  useEffect(
    () => () => {
      const queryKey = [
        'assistance',
        scope.actor,
        'admin-references',
        detail.summary.id,
        detail.summary.revision,
        generation,
      ]
      void client.cancelQueries({ queryKey, exact: true })
      client.removeQueries({ queryKey, exact: true })
    },
    [
      client,
      scope.actor,
      detail.summary.id,
      detail.summary.revision,
      generation,
      authorized,
    ],
  )
  useAssistanceAccess(query.error)
  const catalog = query.data
  const stale =
    catalog &&
    Object.values(catalog).some(
      (p) =>
        p.caseRevision !== detail.summary.revision ||
        (detail.materialRevision !== undefined &&
          p.materialRevision !== detail.materialRevision),
    )
  return (
    <section aria-label="Referencias administrativas">
      {!authorized ? (
        <p role="alert">Acceso administrativo no autorizado.</p>
      ) : (
        <>
          <p>
            Referencias del caso, sólo en memoria. Seleccionar no verifica
            identidad, acredita dinero ni aplica una resolución. Una lista vacía
            no prueba ausencia de obligaciones.
          </p>
          <button
            type="button"
            disabled={query.isFetching}
            onClick={() => setGeneration((g) => g + 1)}
          >
            Recargar referencias y revisar
          </button>
          {query.isFetching ? (
            <p role="status">Cargando todas las páginas de referencias…</p>
          ) : query.isError ? (
            <p role="alert">
              No se pudieron consultar las referencias. Si el cursor venció o
              cambió la fuente, recarga desde el principio y revisa de nuevo.
            </p>
          ) : stale ? (
            <p role="alert">
              El expediente cambió. Actualiza el caso antes de preparar otra
              intención.
            </p>
          ) : catalog ? (
            <CommandForm
              key={`${operation}:${generation}:${query.dataUpdatedAt}`}
              operation={operation}
              detail={detail}
              admin
              extraOptions={extraOptions}
              administrativeReferences={catalog}
            />
          ) : null}
        </>
      )}
    </section>
  )
}
