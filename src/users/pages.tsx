import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { users } from './service'
import { useAuth } from '../auth/context'
import {
  ErrorState,
  InfoGrid,
  Loading,
  PageTitle,
  Pagination,
  Table,
} from '../components/ui'
import { date, labels } from '../utils/format'
export function UsersPage() {
  const query = useQuery({
    queryKey: ['users'],
    queryFn: ({ signal }) => users.list(signal),
  })
  const [page, setPage] = useState(1)
  return (
    <>
      <PageTitle
        title="Administradores y usuarios"
        description="Consulta las cuentas registradas en Mandaria."
      />
      <div className="panel">
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
                  render: (row) => (row.active ? 'Activo' : 'Inactivo'),
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
        )}
        <p className="panel-note">
          Últimos 100 usuarios. La API actual sólo permite consulta; el alta,
          cambio de rol y desactivación se administran fuera de Mandaria Web.
        </p>
      </div>
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
