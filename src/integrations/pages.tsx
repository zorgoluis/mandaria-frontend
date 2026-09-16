import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, ArrowUpRight, Copy, KeyRound, Search } from 'lucide-react'
import { integrations } from './service'
import { queryClient } from '../services/query'
import {
  ActionForm,
  Badge,
  Confirm,
  ErrorState,
  Field,
  InfoGrid,
  Loading,
  Modal,
  PageTitle,
  Pagination,
  Table,
} from '../components/ui'
import { useFeedback } from '../components/feedback-context'
import { ApiError } from '../services/errors'
import { date } from '../utils/format'
import {
  scopes,
  type Credential,
  type OneTimeSecret,
  type Scope,
} from '../types/api'
const invalidate = () =>
  queryClient.invalidateQueries({ queryKey: ['integrations'] })

export function IntegrationsPage() {
  const query = useQuery({
    queryKey: ['integrations'],
    queryFn: ({ signal }) => integrations.list(signal),
  })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const rows =
    query.data?.filter((item) =>
      `${item.name} ${item.code}`.toLowerCase().includes(search.toLowerCase()),
    ) ?? []
  return (
    <>
      <PageTitle
        title="Integraciones"
        description="Conecta otros negocios con tu plataforma logística."
        action={
          <Link className="button" to="/integrations/new">
            <Plus size={17} /> Nueva integración
          </Link>
        }
      />
      <div className="panel">
        <div className="panel-toolbar">
          <div>
            <h2>Clientes B2B</h2>
            <p>Acceso seguro entre plataformas</p>
          </div>
          <label className="search">
            <Search size={17} />
            <input
              aria-label="Buscar integración"
              placeholder="Buscar nombre o código"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </label>
        </div>
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <ErrorState
            error={query.error}
            retry={() => {
              void query.refetch()
            }}
          />
        ) : (
          <>
            <Table
              rows={rows.slice((page - 1) * 10, page * 10)}
              columns={[
                {
                  label: 'Integración',
                  render: (row) => (
                    <Link
                      className="entity-name"
                      to={`/integrations/${row.id}`}
                    >
                      {row.name}
                      <small>{row.code}</small>
                    </Link>
                  ),
                },
                {
                  label: 'Estado',
                  render: (row) => <Badge value={row.status} />,
                },
                {
                  label: 'Credenciales',
                  render: (row) => row.credentials.length,
                },
                { label: 'Creación', render: (row) => date(row.createdAt) },
                {
                  label: 'Acciones',
                  render: (row) => (
                    <Link
                      className="table-action"
                      to={`/integrations/${row.id}`}
                    >
                      Ver detalle <ArrowUpRight size={15} />
                    </Link>
                  ),
                },
              ]}
            />
            <Pagination
              page={page}
              totalPages={Math.ceil(rows.length / 10)}
              total={rows.length}
              onPage={setPage}
            />
          </>
        )}
        <p className="panel-note">
          La API devuelve hasta 100 integraciones. La búsqueda y paginación se
          aplican a los registros recibidos.
        </p>
      </div>
    </>
  )
}
export function IntegrationNew() {
  const navigate = useNavigate()
  const notify = useFeedback()
  return (
    <>
      <PageTitle
        title="Nueva integración"
        description="Registra una plataforma que se conectará con Mandaria."
        back="/integrations"
      />
      <div className="panel form-panel">
        <h2>Información del cliente</h2>
        <ActionForm
          submitLabel="Crear integración"
          onSubmit={async (data) => {
            const created = await integrations.create({
              name: String(data.get('name')).trim(),
              code: String(data.get('code')).trim(),
            })
            await invalidate()
            notify('Integración creada correctamente.')
            navigate(`/integrations/${created.id}`)
          }}
        >
          <Field label="Nombre">
            <input
              name="name"
              required
              maxLength={100}
              pattern=".*\S.*"
              placeholder="Nombre de la empresa"
            />
          </Field>
          <Field
            label="Código"
            hint="De 2 a 50 caracteres: mayúsculas, números y guion bajo. Comienza con letra."
          >
            <input
              name="code"
              required
              pattern="[A-Z][A-Z0-9_]{1,49}"
              minLength={2}
              maxLength={50}
              placeholder="MI_EMPRESA"
            />
          </Field>
          <p className="notice">
            Se creará activa. Los permisos se asignan a cada credencial después
            de crear la integración.
          </p>
        </ActionForm>
      </div>
    </>
  )
}

export function SecretDialog({
  secret,
  onClose,
}: {
  secret: OneTimeSecret
  onClose: () => void
}) {
  const notify = useFeedback()
  useEffect(() => {
    window.addEventListener('pagehide', onClose)
    return () => window.removeEventListener('pagehide', onClose)
  }, [onClose])
  async function copy() {
    try {
      await navigator.clipboard.writeText(secret.clientSecret)
      notify('Secreto copiado. Guárdalo en el backend que consumirá Mandaria.')
    } catch {
      notify(
        'No fue posible copiar. Selecciona el secreto y cópialo manualmente.',
        true,
      )
    }
  }
  return (
    <Modal title="Guarda tu nueva credencial" onClose={onClose}>
      <div className="notice warning">
        <KeyRound size={20} />
        <strong>Este secreto sólo se mostrará una vez.</strong>
        <p>Guarda este secreto ahora. No podrá consultarse nuevamente.</p>
      </div>
      <Field label="Client ID">
        <input readOnly value={secret.clientId} />
      </Field>
      <Field label="Client secret">
        <textarea
          aria-label="Client secret"
          readOnly
          value={secret.clientSecret}
          rows={3}
          autoComplete="off"
          spellCheck={false}
        />
      </Field>
      <button
        className="button secondary"
        onClick={() => {
          void copy()
        }}
      >
        <Copy size={16} /> Copiar secreto
      </button>
      <p className="panel-note">
        Al cerrar se elimina de esta pantalla. El portapapeles es administrado
        por tu dispositivo; reemplaza su contenido después de guardarlo.
      </p>
      <div className="form-actions">
        <button className="button" onClick={onClose}>
          Ya lo guardé, cerrar
        </button>
      </div>
    </Modal>
  )
}
function CreateCredential({
  id,
  onSecret,
  onClose,
}: {
  id: string
  onSecret: (secret: OneTimeSecret) => void
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  const mounted = useRef(true)
  useEffect(
    () => () => {
      mounted.current = false
    },
    [],
  )
  return (
    <Modal
      title="Crear credencial"
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <ActionForm
        initialDirty
        submitLabel="Generar credencial"
        onSubmit={async (data) => {
          const expires = String(data.get('expiresAt') ?? '')
          if (expires && new Date(expires).getTime() <= Date.now())
            throw new ApiError(
              400,
              'La fecha de expiración debe estar en el futuro.',
            )
          setBusy(true)
          try {
            const secret = await integrations.createCredential(id, {
              scopes: data.getAll('scopes') as Scope[],
              ...(expires
                ? { expiresAt: new Date(expires).toISOString() }
                : {}),
            })
            if (mounted.current) onSecret(secret)
            void invalidate()
          } finally {
            if (mounted.current) setBusy(false)
          }
        }}
      >
        <p>Selecciona los permisos de esta credencial.</p>
        <div className="scope-options">
          {scopes.map((scope) => (
            <label key={scope}>
              <input type="checkbox" name="scopes" value={scope} />
              <code>{scope}</code>
            </label>
          ))}
        </div>
        <Field
          label="Expiración (opcional)"
          hint="Hora local del dispositivo. Vacío: sin expiración."
        >
          <input type="datetime-local" name="expiresAt" />
        </Field>
      </ActionForm>
    </Modal>
  )
}
export function IntegrationDetail() {
  const { id = '' } = useParams()
  const query = useQuery({
    queryKey: ['integrations', id],
    queryFn: ({ signal }) => integrations.get(id, signal),
  })
  const credentials = useQuery({
    queryKey: ['integrations', id, 'credentials'],
    queryFn: ({ signal }) => integrations.credentials(id, signal),
  })
  const [create, setCreate] = useState(false)
  const [secret, setSecret] = useState<OneTimeSecret | null>(null)
  const [action, setAction] = useState<{
    type: 'status' | 'rotate' | 'revoke'
    credential?: Credential
  } | null>(null)
  const notify = useFeedback()
  const mounted = useRef(true)
  useEffect(
    () => () => {
      mounted.current = false
    },
    [],
  )
  if (query.isPending) return <Loading />
  if (query.isError)
    return (
      <ErrorState
        error={query.error}
        retry={() => {
          void query.refetch()
        }}
      />
    )
  const item = query.data
  return (
    <>
      <PageTitle
        title={item.name}
        description={item.code}
        back="/integrations"
        action={
          item.status !== 'REVOKED' && (
            <button
              className="button secondary"
              onClick={() => setAction({ type: 'status' })}
            >
              {item.status === 'ACTIVE'
                ? 'Suspender integración'
                : 'Activar integración'}
            </button>
          )
        }
      />
      <div className="panel">
        <div className="panel-toolbar">
          <h2>Información general</h2>
          <div className="row-actions">
            <Link
              className="table-action"
              to={`/delivery-requests?integrationClientId=${encodeURIComponent(item.id)}`}
            >
              Ver solicitudes <ArrowUpRight size={15} />
            </Link>
            <Badge value={item.status} />
          </div>
        </div>
        <InfoGrid
          items={[
            ['Código', item.code],
            ['Creación', date(item.createdAt)],
            ['Última actualización', date(item.updatedAt)],
          ]}
        />
        <p className="panel-note">
          El nombre y el código no son editables en la API actual.
        </p>
      </div>
      <div className="panel">
        <div className="panel-toolbar">
          <div>
            <h2>Credenciales de acceso</h2>
            <p>Permisos y actividad disponible de cada conexión</p>
          </div>
          <button
            className="button"
            disabled={item.status !== 'ACTIVE'}
            onClick={() => setCreate(true)}
          >
            <Plus size={16} /> Crear credencial
          </button>
        </div>
        {credentials.isPending ? (
          <Loading />
        ) : credentials.isError ? (
          <ErrorState
            error={credentials.error}
            retry={() => {
              void credentials.refetch()
            }}
          />
        ) : (
          <Table
            rows={credentials.data}
            columns={[
              {
                label: 'Client ID',
                render: (row) => <code className="id-code">{row.id}</code>,
              },
              {
                label: 'Estado',
                render: (row) => <Badge value={row.status} />,
              },
              {
                label: 'Permisos',
                render: (row) => (
                  <div className="scopes">
                    {row.scopes.length
                      ? row.scopes.map((scope) => (
                          <code key={scope}>{scope}</code>
                        ))
                      : 'Sin permisos'}
                  </div>
                ),
              },
              {
                label: 'Actividad',
                render: (row) => (
                  <span className="cell-meta">
                    Uso: {date(row.lastUsedAt)}
                    <small>
                      Expira:{' '}
                      {row.expiresAt ? date(row.expiresAt) : 'Sin expiración'}
                    </small>
                  </span>
                ),
              },
              {
                label: 'Acciones',
                render: (row) =>
                  row.status === 'ACTIVE' && (
                    <div className="row-actions">
                      <button
                        className="text-button"
                        disabled={
                          item.status !== 'ACTIVE' ||
                          (!!row.expiresAt &&
                            new Date(row.expiresAt) <= new Date())
                        }
                        onClick={() =>
                          setAction({ type: 'rotate', credential: row })
                        }
                      >
                        Rotar
                      </button>
                      <button
                        className="text-button destructive"
                        onClick={() =>
                          setAction({ type: 'revoke', credential: row })
                        }
                      >
                        Revocar
                      </button>
                    </div>
                  ),
              },
            ]}
          />
        )}
        <p className="panel-note">
          Hasta 100 credenciales. Los secretos creados anteriormente no pueden
          recuperarse.
        </p>
      </div>
      {create && (
        <CreateCredential
          id={id}
          onClose={() => setCreate(false)}
          onSecret={(value) => {
            setCreate(false)
            setSecret(value)
          }}
        />
      )}{' '}
      {secret && (
        <SecretDialog secret={secret} onClose={() => setSecret(null)} />
      )}{' '}
      {action && (
        <Confirm
          title={
            action.type === 'rotate'
              ? 'Rotar credencial'
              : action.type === 'revoke'
                ? 'Revocar credencial'
                : item.status === 'ACTIVE'
                  ? 'Suspender integración'
                  : 'Activar integración'
          }
          description={
            action.type === 'rotate'
              ? 'Se generará una credencial con los mismos permisos y expiración. La anterior seguirá activa: revócala explícitamente después de actualizar el backend consumidor.'
              : action.type === 'revoke'
                ? 'Esta acción impedirá que esta credencial vuelva a autenticarse. No se puede deshacer.'
                : item.status === 'ACTIVE'
                  ? 'Se bloqueará el acceso B2B de esta integración hasta reactivarla.'
                  : 'Se permitirá nuevamente el acceso con sus credenciales activas.'
          }
          label={action.type === 'revoke' ? 'Revocar' : 'Confirmar'}
          onClose={() => setAction(null)}
          onConfirm={async () => {
            if (action.type === 'status') {
              await integrations.status(
                id,
                item.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
              )
              notify(
                item.status === 'ACTIVE'
                  ? 'Integración suspendida.'
                  : 'Integración activada.',
              )
            } else if (action.type === 'rotate' && action.credential) {
              const result = await integrations.rotate(id, action.credential.id)
              if (mounted.current) setSecret(result)
            } else if (action.credential) {
              await integrations.revoke(id, action.credential.id)
              notify('Credencial revocada.')
            }
            void invalidate()
          }}
        />
      )}
    </>
  )
}
