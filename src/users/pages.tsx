import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight } from 'lucide-react'
import { useAuth } from '../auth/context'
import {
  Empty,
  ErrorState,
  InfoGrid,
  Loading,
  PageTitle,
  Pagination,
  Table,
} from '../components/ui'
import { accounts } from '../invitations/service'
import {
  InviteButton,
  InviteProviderAdminDialog,
  StatusBadge,
} from '../invitations/components'
import { accountStatusLabels } from '../invitations/format'
import { accountStatuses } from '../invitations/types'
import { date, labels } from '../utils/format'
export function UsersPage() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [inviting, setInviting] = useState(false)
  const query = useQuery({
    queryKey: ['users', 'accounts', status],
    queryFn: ({ signal }) => accounts.list(status || undefined, signal),
  })
  return (
    <>
      <PageTitle
        title="Administradores y usuarios"
        description="Consulta las cuentas de Mandaria e incorpora administradores por invitación."
        action={
          <InviteButton
            label="Invitar administrador"
            onClick={() => setInviting(true)}
          />
        }
      />
      <div className="panel">
        <div className="panel-toolbar">
          <div>
            <h2>Cuentas</h2>
            <p>Las cuentas nuevas se crean al aceptar una invitación.</p>
          </div>
          <Link className="table-action" to="/invitations">
            Ver invitaciones <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="filters">
          <select
            aria-label="Filtrar por estado de cuenta"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="">Todos los estados</option>
            {accountStatuses.map((value) => (
              <option key={value} value={value}>
                {accountStatusLabels[value]}
              </option>
            ))}
          </select>
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
        ) : query.data.length ? (
          <>
            <Table
              stacked
              rows={query.data.slice((page - 1) * 20, page * 20)}
              columns={[
                {
                  label: 'Correo electrónico',
                  render: (row) => (
                    <span className="entity-name">
                      {row.email}
                      <small>{row.id}</small>
                    </span>
                  ),
                },
                {
                  label: 'Rol',
                  render: (row) => labels[row.role] ?? 'No compatible',
                },
                {
                  label: 'Estado',
                  render: (row) => <StatusBadge status={row.status} />,
                },
                { label: 'Creación', render: (row) => date(row.createdAt) },
              ]}
            />
            <Pagination
              page={page}
              total={query.data.length}
              totalPages={Math.ceil(query.data.length / 20)}
              onPage={setPage}
            />
          </>
        ) : (
          <Empty
            title="No hay administradores"
            description={
              status
                ? 'Ninguna cuenta coincide con el estado seleccionado.'
                : 'Invita a un administrador para comenzar.'
            }
          />
        )}
        <p className="panel-note">
          Últimos 100 usuarios según la API. Una cuenta con invitación pendiente
          todavía no tiene contraseña ni acceso. La API no permite cambiar roles
          ni deshabilitar cuentas desde Mandaria Web.
        </p>
      </div>
      {inviting && (
        <InviteProviderAdminDialog onClose={() => setInviting(false)} />
      )}
    </>
  )
}
export function ProfilePage() {
  const { user } = useAuth()
  return (
    <>
      <PageTitle
        title="Mi perfil"
        description="Tu identidad y acceso a Mandaria."
      />
      <div className="panel">
        <InfoGrid
          items={[
            ['Correo', user?.email],
            ['Rol', labels[user?.role ?? '']],
            ['Estado', user?.active ? 'Activo' : 'Inactivo'],
            ['Creación', date(user?.createdAt)],
          ]}
        />
        <p className="panel-note">
          Contacta a tu administrador para actualizar tu cuenta.
        </p>
      </div>
    </>
  )
}
export function SettingsPage() {
  return (
    <>
      <PageTitle
        title="Configuración"
        description="Información de este espacio de trabajo."
      />
      <div className="panel">
        <div className="panel-toolbar">
          <h2>Mandaria Web</h2>
          <span className="tag">V1.3</span>
        </div>
        <InfoGrid
          items={[
            ['Idioma', 'Español (México)'],
            ['Zona horaria', Intl.DateTimeFormat().resolvedOptions().timeZone],
            ['Acceso', 'Autenticación de usuarios'],
            ['Plataforma', 'Mandaria Backend'],
          ]}
        />
        <p className="panel-note">
          Esta versión no ofrece parámetros globales editables.
        </p>
      </div>
    </>
  )
}
