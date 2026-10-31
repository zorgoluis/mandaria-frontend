import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/context'
import { Loading, Pagination } from '../components/ui'
import { date } from '../utils/format'
import { verification } from './service'
import { vkey } from './format'

export function AcceptanceHistory({
  currentId,
  compact = false,
}: {
  currentId?: string
  compact?: boolean
}) {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const q = useQuery({
    queryKey: vkey(
      user!.id,
      'acceptance-history',
      page,
      ...(compact ? [5] : []),
    ),
    queryFn: ({ signal }) =>
      compact
        ? verification.acceptanceHistory(page, signal, 5)
        : verification.acceptanceHistory(page, signal),
    retry: false,
    gcTime: 0,
  })
  return (
    <section
      className="panel panel-body"
      aria-label="Historial de aceptaciones personales"
    >
      <h2>Historial de aceptaciones personales</h2>
      <p>
        Consultar un comprobante no acepta nuevos términos ni acredita
        aprobación documental.
      </p>
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <>
          <p role="alert">
            No se pudo consultar el historial. Esto no significa que tus
            aceptaciones hayan desaparecido.
          </p>
          <button disabled={q.isFetching} onClick={() => void q.refetch()}>
            Reintentar historial
          </button>
        </>
      ) : (
        <>
          {q.data.items.length === 0 ? (
            <p>No hay aceptaciones en esta página.</p>
          ) : (
            <ul>
              {q.data.items.map((item) => (
                <li key={item.id}>
                  <Link to={'/verification/acceptances/' + item.id}>
                    {item.version}
                  </Link>
                  {' · '}
                  {date(item.acceptedAt)}
                  {' · '}
                  {item.id === currentId
                    ? 'Aceptación vigente'
                    : 'Comprobante histórico'}
                </li>
              ))}
            </ul>
          )}
          <Pagination
            page={page}
            totalPages={q.data.totalPages}
            total={q.data.total}
            onPage={setPage}
          />
        </>
      )}
    </section>
  )
}
