import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Send } from 'lucide-react'
import {
  ActionForm,
  Confirm,
  Empty,
  ErrorState,
  Field,
  Loading,
  Modal,
  Pagination,
  Table,
} from '../components/ui'
import { useFeedback } from '../components/feedback-context'
import { providers } from '../providers/service'
import { date, labels } from '../utils/format'
import { invitations } from './service'
import { invalidateInvitations, invitationKeys } from './queries'
import {
  accountStatusLabels,
  invitationStatusLabels,
  isOpen,
  membershipRoleLabels,
  statusTone,
} from './format'
import {
  invitableRoles,
  invitationStatuses,
  membershipRoles,
  type AccountStatus,
  type InvitationDispatch,
  type InvitationScope,
  type InvitationStatus,
  type MembershipRole,
  type UserInvitation,
} from './types'

const PAGE_SIZE = 20

export function StatusBadge({
  status,
}: {
  status: InvitationStatus | AccountStatus
}) {
  const label =
    status in invitationStatusLabels
      ? invitationStatusLabels[status as InvitationStatus]
      : accountStatusLabels[status as AccountStatus]
  return (
    <span className={`badge ${statusTone[status] ?? ''}`}>
      <span className="status-dot" />
      {label ?? 'Desconocido'}
    </span>
  )
}

/** Feedback for invite/resend: the invitation exists even when the email failed. */
function useDispatchFeedback() {
  const notify = useFeedback()
  return (result: InvitationDispatch, sent: string) =>
    result.emailDelivery === 'SENT'
      ? notify(sent)
      : notify(
          'La invitación quedó registrada, pero el correo no pudo enviarse. Reenvíala desde la lista de invitaciones.',
          true,
        )
}

export function InvitationsPanel({
  scope,
  title = 'Invitaciones',
  description,
  action,
  showProvider = true,
  roleFilter = false,
}: {
  scope: InvitationScope
  title?: string
  description?: string
  action?: ReactNode
  showProvider?: boolean
  roleFilter?: boolean
}) {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [role, setRole] = useState('')
  const [search, setSearch] = useState('')
  const filters = {
    page,
    pageSize: PAGE_SIZE,
    status: status || undefined,
    role: role || undefined,
    search: search || undefined,
  }
  const query = useQuery({
    queryKey: invitationKeys.list(scope, filters),
    queryFn: ({ signal }) => invitations.list(scope, filters, signal),
  })
  const [target, setTarget] = useState<{
    action: 'resend' | 'revoke'
    item: UserInvitation
  } | null>(null)
  const notify = useFeedback()
  const dispatched = useDispatchFeedback()
  return (
    <section className="panel" aria-label={title}>
      <div className="panel-toolbar">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
      <div className="filters">
        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault()
            setSearch(
              String(new FormData(e.currentTarget).get('search')).trim(),
            )
            setPage(1)
          }}
        >
          <Search size={17} />
          <input
            name="search"
            aria-label="Buscar invitación por correo"
            placeholder="Correo electrónico"
            maxLength={254}
          />
          <button
            className="text-button"
            type="submit"
            aria-label="Buscar invitaciones"
          >
            Buscar
          </button>
        </form>
        <select
          aria-label="Filtrar invitaciones por estado"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
        >
          <option value="">Todos los estados</option>
          {invitationStatuses.map((value) => (
            <option key={value} value={value}>
              {invitationStatusLabels[value]}
            </option>
          ))}
        </select>
        {roleFilter && (
          <select
            aria-label="Filtrar invitaciones por rol"
            value={role}
            onChange={(e) => {
              setRole(e.target.value)
              setPage(1)
            }}
          >
            <option value="">Todos los roles</option>
            {invitableRoles.map((value) => (
              <option key={value} value={value}>
                {labels[value]}
              </option>
            ))}
          </select>
        )}
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
      ) : query.data.items.length ? (
        <>
          <Table
            stacked
            rows={query.data.items}
            columns={[
              {
                label: 'Correo',
                render: (row) => (
                  <span className="entity-name">
                    {row.email}
                    {row.driverName && <small>{row.driverName}</small>}
                  </span>
                ),
              },
              {
                label: 'Rol',
                render: (row) => (
                  <span className="cell-meta">
                    {labels[row.role] ?? 'Rol no compatible'}
                    {row.membershipRole && (
                      <small>{membershipRoleLabels[row.membershipRole]}</small>
                    )}
                  </span>
                ),
              },
              ...(showProvider
                ? [
                    {
                      label: 'Proveedor',
                      render: (row: UserInvitation) => row.provider.name,
                    },
                  ]
                : []),
              {
                label: 'Estado',
                render: (row) => <StatusBadge status={row.status} />,
              },
              {
                label: 'Invitación',
                render: (row) => date(row.createdAt),
              },
              {
                label: 'Expira',
                render: (row) =>
                  row.status === 'ACCEPTED'
                    ? `Aceptada ${date(row.acceptedAt)}`
                    : row.status === 'REVOKED'
                      ? `Revocada ${date(row.revokedAt)}`
                      : date(row.expiresAt),
              },
              {
                label: 'Acciones',
                render: (row) =>
                  isOpen(row.status) ? (
                    <span className="row-actions">
                      <button
                        className="text-button"
                        aria-label={`Reenviar invitación a ${row.email}`}
                        onClick={() =>
                          setTarget({ action: 'resend', item: row })
                        }
                      >
                        Reenviar invitación
                      </button>
                      <button
                        className="text-button destructive"
                        aria-label={`Revocar invitación de ${row.email}`}
                        onClick={() =>
                          setTarget({ action: 'revoke', item: row })
                        }
                      >
                        Revocar invitación
                      </button>
                    </span>
                  ) : (
                    '—'
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
      ) : (
        <Empty
          title={
            status === 'PENDING'
              ? 'No hay invitaciones pendientes'
              : 'No hay invitaciones'
          }
          description={
            status || search || role
              ? 'Ninguna invitación coincide con los filtros aplicados.'
              : 'Las invitaciones enviadas aparecerán aquí.'
          }
        />
      )}
      <p className="panel-note">
        Los enlaces de activación sólo se envían por correo. Mandaria Web nunca
        muestra tokens ni contraseñas.
      </p>
      {target?.action === 'resend' && (
        <Confirm
          title="Reenviar invitación"
          description={`Se enviará un nuevo enlace a ${target.item.email}. El enlace anterior dejará de funcionar y la vigencia se reinicia.`}
          label="Reenviar invitación"
          onClose={() => setTarget(null)}
          onConfirm={async () => {
            const result = await invitations.resend(scope, target.item.id)
            await invalidateInvitations()
            dispatched(result, 'Invitación reenviada correctamente.')
          }}
        />
      )}
      {target?.action === 'revoke' && (
        <Confirm
          title="Revocar invitación"
          description={`El enlace enviado a ${target.item.email} dejará de funcionar. La cuenta no se elimina y podrá invitarse de nuevo.`}
          label="Revocar invitación"
          onClose={() => setTarget(null)}
          onConfirm={async () => {
            await invitations.revoke(scope, target.item.id)
            await invalidateInvitations()
            notify('Invitación revocada correctamente.')
          }}
        />
      )}
    </section>
  )
}

function ProviderPicker() {
  const [search, setSearch] = useState('')
  const query = useQuery({
    queryKey: ['providers', 'invitation-options', search],
    queryFn: ({ signal }) =>
      providers.list({ pageSize: 100, search: search || undefined }, signal),
  })
  return (
    <>
      <Field label="Buscar proveedor" hint="Nombre o código.">
        <input
          type="search"
          maxLength={100}
          onChange={(e) => setSearch(e.target.value.trim())}
        />
      </Field>
      <Field label="Proveedor">
        <select name="providerId" required defaultValue="">
          <option value="" disabled>
            {query.isPending
              ? 'Cargando proveedores…'
              : 'Selecciona un proveedor'}
          </option>
          {query.data?.items.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name} · {provider.code}
            </option>
          ))}
        </select>
      </Field>
      {query.isError && (
        <p className="inline-error" role="alert">
          No fue posible cargar los proveedores.
        </p>
      )}
    </>
  )
}

/** SUPER_ADMIN only. The global role is fixed to PROVIDER_ADMIN by the service call. */
export function InviteProviderAdminDialog({
  provider,
  onClose,
}: {
  provider?: { id: string; name: string }
  onClose: () => void
}) {
  const dispatched = useDispatchFeedback()
  return (
    <Modal title="Invitar administrador" onClose={onClose}>
      <p className="modal-description">
        {provider
          ? `La persona administrará ${provider.name}.`
          : 'La persona administrará el proveedor que selecciones.'}{' '}
        Recibirá un correo para crear su propia contraseña.
      </p>
      <ActionForm
        submitLabel="Enviar invitación"
        cancelLabel="Volver"
        onCancel={onClose}
        onSubmit={async (data) => {
          const providerId = provider?.id ?? String(data.get('providerId'))
          const result = await invitations.inviteProviderAdmin(providerId, {
            email: String(data.get('email')).trim().toLowerCase(),
            membershipRole: String(
              data.get('membershipRole'),
            ) as MembershipRole,
          })
          await invalidateInvitations()
          dispatched(result, `Invitación enviada a ${result.email}.`)
          onClose()
        }}
      >
        <Field label="Correo electrónico">
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="off"
          />
        </Field>
        {!provider && <ProviderPicker />}
        <Field label="Rol dentro del proveedor">
          <select name="membershipRole" defaultValue="ADMIN">
            {membershipRoles.map((value) => (
              <option key={value} value={value}>
                {membershipRoleLabels[value]}
              </option>
            ))}
          </select>
        </Field>
        <p className="notice">Rol de la cuenta: Administrador de proveedor.</p>
      </ActionForm>
    </Modal>
  )
}

export function InviteDriverDialog({
  scope,
  providerName,
  onClose,
}: {
  scope: InvitationScope & { providerId: string }
  providerName: string
  onClose: () => void
}) {
  const dispatched = useDispatchFeedback()
  return (
    <Modal title="Invitar repartidor" onClose={onClose}>
      <p className="modal-description">
        El repartidor se incorporará a {providerName} al activar su cuenta.
        Mientras esté pendiente, la invitación ocupa un lugar de la capacidad
        del proveedor.
      </p>
      <ActionForm
        submitLabel="Enviar invitación"
        cancelLabel="Volver"
        onCancel={onClose}
        onSubmit={async (data) => {
          const result = await invitations.inviteDriver(scope, {
            email: String(data.get('email')).trim().toLowerCase(),
            driverName: String(data.get('driverName')).trim(),
          })
          await invalidateInvitations()
          dispatched(result, `Invitación enviada a ${result.email}.`)
          onClose()
        }}
      >
        <Field label="Correo electrónico">
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="off"
          />
        </Field>
        <Field label="Nombre operativo">
          <input name="driverName" required maxLength={100} pattern=".*\S.*" />
        </Field>
      </ActionForm>
    </Modal>
  )
}

export function InviteButton({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button className="button" onClick={onClick} disabled={disabled}>
      <Send size={16} /> {label}
    </button>
  )
}
