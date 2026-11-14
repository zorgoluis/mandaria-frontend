import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/context'
import { Panel } from '../components/design'
import { Badge, ErrorState, Loading, Pagination, Table } from '../components/ui'
import { ApiError } from '../services/errors'
import { date } from '../utils/format'
import { verification } from '../verification/service'
import { labels, vkey } from '../verification/format'

/** Identity and unit cases of one independent profile, newest activity first. */
export function IndependentVerificationCases({
  profileId,
}: {
  profileId: string
}) {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: vkey(user!.id, 'independent-cases', profileId, page),
    queryFn: ({ signal }) =>
      verification.review(page, '', undefined, '', signal, profileId),
    retry: false,
    gcTime: 0,
  })
  const pending = query.data?.counts?.SUBMITTED
  return (
    <Panel
      title="Revisiones documentales"
      description={
        pending
          ? `${pending} en revisión · identidad y unidades de este repartidor`
          : 'Identidad y unidades de este repartidor'
      }
      actions={
        <Link className="button secondary small" to="/admin/verification-cases">
          Revisión documental
        </Link>
      }
    >
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        query.error instanceof ApiError && query.error.status === 400 ? (
          <p className="panel-body" role="status">
            Consultar las revisiones por repartidor requiere la versión
            actualizada del backend. Puedes buscarlas en Revisión documental.
          </p>
        ) : (
          <ErrorState
            error={query.error}
            retry={() => {
              void query.refetch()
            }}
          />
        )
      ) : (
        <>
          <Table
            stacked
            rows={query.data.items}
            emptyTitle="Sin revisiones documentales"
            empty="Este repartidor todavía no tiene expedientes de identidad ni de unidad."
            columns={[
              {
                label: 'Revisión',
                render: (c) => <strong>Revisión {c.revision}</strong>,
              },
              {
                label: 'Tipo',
                render: (c) =>
                  c.subjectType ? labels[c.subjectType] : 'Expediente',
              },
              {
                label: 'Estado',
                render: (c) => (
                  <Badge value={c.status} label={labels[c.status]} />
                ),
              },
              {
                label: 'Actualizado',
                render: (c) => date(c.updatedAt ?? c.createdAt),
              },
              {
                label: 'Acción',
                render: (c) => (
                  <Link
                    to={'/verification/cases/' + encodeURIComponent(c.id)}
                    aria-label={`${c.status === 'SUBMITTED' ? 'Revisar' : 'Ver'} revisión ${c.revision}`}
                  >
                    {c.status === 'SUBMITTED' ? 'Revisar' : 'Ver'}
                  </Link>
                ),
              },
            ]}
          />
          <Pagination
            page={page}
            total={query.data.total}
            totalPages={query.data.totalPages}
            onPage={setPage}
          />
        </>
      )}
    </Panel>
  )
}
