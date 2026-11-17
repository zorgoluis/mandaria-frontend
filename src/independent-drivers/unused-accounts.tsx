import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { Notice, Panel } from '../components/design'
import {
  ActionForm,
  Badge,
  Empty,
  ErrorState,
  Field,
  InfoGrid,
  Loading,
  Modal,
  PageTitle,
  Pagination,
  Table,
} from '../components/ui'
import { ApiError } from '../services/errors'
import { date } from '../utils/format'
import { independentStatusLabels } from './format'
import { independentKeys } from './queries'
import {
  REASON_MAX,
  REASON_MIN,
  type IndependentStatus,
  type UnusedAccountStatus,
  type UnusedDriverAccount,
} from './types'
import {
  unusedAccountKeys,
  unusedAccountMessages,
  unusedDriverAccounts,
} from './unused-accounts-service'

const accountStatuses: UnusedAccountStatus[] = ['ACTIVE', 'DISABLED', 'ALL']
const nameOf = (account: UnusedDriverAccount) =>
  account.name?.trim() || 'Registro sin nombre'
const canDeactivate = (account: UnusedDriverAccount) =>
  account.active === true &&
  account.canDeactivate === true &&
  account.hasServiceActivity === false &&
  ['NONE', 'INDEPENDENT'].includes(account.category) &&
  Number.isFinite(Date.parse(account.updatedAt))
const blockMessage = (account: UnusedDriverAccount) =>
  (account.blockReason && unusedAccountMessages[account.blockReason]) ||
  'El estado de esta cuenta no permite darla de baja desde este listado.'

export function UnusedDriverAccounts({
  actor,
  tabs,
}: {
  actor: string
  tabs: ReactNode
}) {
  const [params, setParams] = useSearchParams()
  const page = Math.max(
    1,
    Math.min(100000, Math.trunc(Number(params.get('unusedPage')) || 1)),
  )
  const search = (params.get('unusedSearch') || '').trim().slice(0, 100)
  const status = params.get('accountStatus') || 'ACTIVE'
  const validStatus = accountStatuses.includes(status as UnusedAccountStatus)
  const [text, setText] = useState(search)
  const [selected, setSelected] = useState<UnusedDriverAccount | null>(null)
  const filters = {
    page,
    pageSize: 20,
    search: search || undefined,
    accountStatus: status as UnusedAccountStatus,
  }
  const query = useQuery({
    queryKey: unusedAccountKeys.list(actor, filters),
    queryFn: ({ signal }) => unusedDriverAccounts.list(filters, signal),
    enabled: validStatus,
    staleTime: 0,
    retry: false,
  })
  const unsupported =
    query.error instanceof ApiError && [400, 404].includes(query.error.status)
  return (
    <>
      <PageTitle
        title="Repartidores independientes"
        description="Revisa cuentas sin servicios y administra su acceso."
      />
      {tabs}
      <Panel
        title="Cuentas sin servicios"
        description="Nunca han tomado ni realizado un servicio. Incluye registros incompletos sin perfil de conductor."
        actions={
          <button
            className="button secondary small"
            disabled={query.isFetching || !validStatus}
            onClick={() => void query.refetch()}
          >
            Actualizar listado
          </button>
        }
      >
        <div className="panel-body">
          <Notice>
            La baja lógica desactiva el acceso a la cuenta y conserva sus
            documentos e historial. Se revisa cada cuenta antes de confirmar.
          </Notice>
        </div>
        <form
          className="filters"
          onSubmit={(event) => {
            event.preventDefault()
            setParams((current) => {
              const next = new URLSearchParams(current)
              if (text.trim())
                next.set('unusedSearch', text.trim().slice(0, 100))
              else next.delete('unusedSearch')
              next.set('unusedPage', '1')
              return next
            })
          }}
        >
          <label className="search">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              aria-label="Buscar cuenta por nombre o correo"
              placeholder="Nombre o correo"
              maxLength={100}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <button className="button secondary small" type="submit">
            Buscar
          </button>
          <select
            aria-label="Filtrar cuentas por acceso"
            value={status}
            onChange={(event) => {
              const value = event.target.value
              setParams((current) => {
                const next = new URLSearchParams(current)
                next.set('accountStatus', value)
                next.set('unusedPage', '1')
                return next
              })
            }}
          >
            <option value="ACTIVE">Con acceso activo</option>
            <option value="DISABLED">Dadas de baja</option>
            <option value="ALL">Todas las cuentas</option>
          </select>
        </form>
        {!validStatus ? (
          <div className="panel-body">
            <Notice tone="warning">El filtro de acceso no es válido.</Notice>
          </div>
        ) : query.isPending ? (
          <Loading />
        ) : unsupported ? (
          <div className="panel-body">
            <Notice tone="warning">
              Este listado requiere actualizar Mandaria. No es posible consultar
              ni dar de baja cuentas desde aquí por ahora.
            </Notice>
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error} retry={() => void query.refetch()} />
        ) : query.data.items.length ? (
          <>
            <Table
              stacked
              rows={query.data.items.map((account) => ({
                ...account,
                id: account.userId,
              }))}
              columns={[
                {
                  label: 'Cuenta',
                  render: (row) => (
                    <span className="entity-name">
                      {nameOf(row)}
                      <small>{row.email}</small>
                    </span>
                  ),
                },
                { label: 'Registro', render: (row) => date(row.createdAt) },
                {
                  label: 'Habilitación',
                  render: (row) =>
                    row.independentProfileStatus ? (
                      <Badge
                        value={row.independentProfileStatus}
                        label={
                          independentStatusLabels[
                            row.independentProfileStatus as IndependentStatus
                          ] || 'Estado no confirmado'
                        }
                      />
                    ) : (
                      'Sin perfil independiente'
                    ),
                },
                {
                  label: 'Acceso',
                  render: (row) => (
                    <Badge
                      value={row.active ? 'ACTIVE' : 'INACTIVE'}
                      label={row.active ? 'Activo' : 'Baja lógica'}
                    />
                  ),
                },
                {
                  label: 'Acciones',
                  render: (row) => (
                    <div>
                      <div className="row-actions">
                        {row.driverId && row.independentProfileId && (
                          <Link
                            className="table-action"
                            to={`/independent-drivers/${encodeURIComponent(row.driverId)}`}
                          >
                            Ver perfil
                          </Link>
                        )}
                        {row.active && (
                          <button
                            className="button secondary small destructive"
                            aria-label={`Dar de baja a ${nameOf(row)} (${row.email})`}
                            disabled={query.isFetching || !canDeactivate(row)}
                            onClick={() => setSelected(row)}
                          >
                            Dar de baja
                          </button>
                        )}
                      </div>
                      {row.active && !canDeactivate(row) && (
                        <small>{blockMessage(row)}</small>
                      )}
                    </div>
                  ),
                },
              ]}
            />
            <Pagination
              page={page}
              total={query.data.total}
              totalPages={query.data.totalPages}
              onPage={(nextPage) =>
                setParams((current) => {
                  const next = new URLSearchParams(current)
                  next.set('unusedPage', String(nextPage))
                  return next
                })
              }
            />
          </>
        ) : (
          <Empty
            title="No hay cuentas sin servicios con estos filtros."
            description={
              search
                ? `Ninguna cuenta coincide con «${search}».`
                : 'Cambia el filtro de acceso o vuelve a consultar más tarde.'
            }
          />
        )}
      </Panel>
      {selected && (
        <DeactivateAccount
          key={selected.userId}
          actor={actor}
          account={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}

function DeactivateAccount({
  actor,
  account,
  onClose,
}: {
  actor: string
  account: UnusedDriverAccount
  onClose: () => void
}) {
  const client = useQueryClient()
  const [reason, setReason] = useState('')
  const [requestId] = useState(() => crypto.randomUUID())
  const [phase, setPhase] = useState<
    'review' | 'sending' | 'uncertain' | 'done'
  >('review')
  const query = useQuery({
    queryKey: unusedAccountKeys.detail(actor, account.userId),
    queryFn: ({ signal }) => unusedDriverAccounts.get(account.userId, signal),
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: phase === 'review',
  })
  const current = query.data
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: independentKeys.all }),
      client.invalidateQueries({ queryKey: ['users'] }),
      client.invalidateQueries({ queryKey: ['drivers'] }),
      client.invalidateQueries({ queryKey: ['driver-portal'] }),
    ])
  const readBack = async () => {
    const result = await query.refetch()
    if (
      result.isSuccess &&
      result.data?.userId === account.userId &&
      result.data.active === false
    ) {
      setPhase('done')
      await refresh()
    }
  }
  const selected = current?.userId === account.userId ? current : account
  return (
    <Modal
      title="Dar de baja la cuenta"
      onClose={() => phase !== 'sending' && onClose()}
    >
      <InfoGrid
        items={[
          ['Nombre', nameOf(selected)],
          ['Correo', selected.email],
          ['Registro', date(selected.createdAt)],
        ]}
      />
      <p>
        Esta acción desactiva el acceso. Los documentos, el perfil y el
        historial se conservan; no se eliminan datos ni se cancelan servicios.
      </p>
      {phase === 'done' ? (
        <>
          <Notice>La cuenta está dada de baja.</Notice>
          <button className="button" onClick={onClose}>
            Cerrar
          </button>
        </>
      ) : phase === 'uncertain' ? (
        <>
          <Notice tone="warning">
            No pudimos confirmar el resultado. Consulta el estado de la cuenta
            antes de tomar otra decisión. La baja no se reenviará
            automáticamente.
          </Notice>
          {query.isError && <ErrorState error={query.error} />}
          {current?.active === true && !query.isFetching && (
            <p>La última consulta todavía muestra la cuenta activa.</p>
          )}
          <button
            className="button secondary"
            disabled={query.isFetching}
            onClick={() => void readBack()}
          >
            Consultar estado
          </button>
        </>
      ) : query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <ActionForm
          initialDirty
          submitLabel="Confirmar baja"
          onCancel={onClose}
          submitDisabled={
            query.isFetching ||
            !current ||
            current.userId !== account.userId ||
            !canDeactivate(current) ||
            reason.trim().length < REASON_MIN ||
            reason.trim().length > REASON_MAX
          }
          onSubmit={async () => {
            const trimmed = reason.trim()
            if (trimmed.length < REASON_MIN || trimmed.length > REASON_MAX)
              throw new ApiError(
                400,
                `Escribe un motivo de ${REASON_MIN} a ${REASON_MAX} caracteres.`,
              )
            const fresh = await query.refetch()
            if (fresh.isError) throw fresh.error
            if (
              !fresh.data ||
              fresh.data.userId !== account.userId ||
              !canDeactivate(fresh.data)
            ) {
              await refresh()
              throw new ApiError(
                409,
                fresh.data
                  ? blockMessage(fresh.data)
                  : 'No se pudo confirmar el estado de la cuenta.',
              )
            }
            if (fresh.data.updatedAt !== current?.updatedAt)
              throw new ApiError(
                409,
                unusedAccountMessages.ACCOUNT_STATE_CHANGED,
              )
            setPhase('sending')
            try {
              await unusedDriverAccounts.deactivate(account.userId, {
                requestId,
                expectedUpdatedAt: fresh.data.updatedAt,
                reason: trimmed,
              })
              setPhase('done')
              await refresh()
            } catch (error) {
              if (
                !(error instanceof ApiError) ||
                error.status === 0 ||
                error.status >= 500
              ) {
                setPhase('uncertain')
              } else {
                setPhase('review')
                await refresh()
                throw error
              }
            }
          }}
        >
          {current && !canDeactivate(current) && (
            <Notice tone="warning">{blockMessage(current)}</Notice>
          )}
          <Field
            label="Motivo de baja"
            hint="Entre 3 y 500 caracteres. No incluyas datos personales."
          >
            <textarea
              rows={3}
              maxLength={REASON_MAX}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
        </ActionForm>
      )}
    </Modal>
  )
}
