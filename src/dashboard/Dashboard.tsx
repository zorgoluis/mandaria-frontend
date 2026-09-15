import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Building2,
  PlugZap,
  Layers3,
  UserRound,
  Plus,
} from 'lucide-react'
import { providers } from '../providers/service'
import { useAuth } from '../auth/context'
import { Badge, ErrorState, Loading, PageTitle, Table } from '../components/ui'
import { MyProvider } from '../providers/pages'
export function Dashboard() {
  const { user } = useAuth()
  return user?.role === 'SUPER_ADMIN' ? (
    <AdminDashboard />
  ) : user?.role === 'PROVIDER_ADMIN' ? (
    <>
      <div className="welcome-banner">
        <span className="eyebrow">TU ESPACIO EN MANDARIA</span>
        <h1>Bienvenido a tu operación.</h1>
        <p>Información actualizada de tu red de proveedores.</p>
      </div>
      <MyProvider showActivity />
    </>
  ) : (
    <PageTitle
      title="Bienvenido a Mandaria"
      description="Tu rol todavía no tiene módulos administrativos habilitados."
    />
  )
}
function AdminDashboard() {
  const recent = useQuery({
    queryKey: ['providers', 'dashboard'],
    queryFn: ({ signal }) => providers.list({ pageSize: 5 }, signal),
  })
  const fleet = useQuery({
    queryKey: ['providers', 'count', 'FLEET'],
    queryFn: ({ signal }) =>
      providers.list({ pageSize: 1, type: 'FLEET' }, signal),
  })
  const independent = useQuery({
    queryKey: ['providers', 'count', 'INDEPENDENT'],
    queryFn: ({ signal }) =>
      providers.list({ pageSize: 1, type: 'INDEPENDENT' }, signal),
  })
  return (
    <>
      <PageTitle
        title="Vista general"
        description="Lo esencial de tu operación, en un solo lugar."
        action={
          <Link className="button" to="/providers/new">
            <Plus size={17} /> Nuevo proveedor
          </Link>
        }
      />
      <div className="welcome-banner">
        <div>
          <span className="eyebrow">TU RED, MEJOR CONECTADA</span>
          <h2>
            Construye una operación
            <br />
            que siga avanzando.
          </h2>
          <p>Administra tus conexiones y proveedores desde Mandaria.</p>
          <Link to="/integrations">
            Explorar integraciones <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="banner-art" aria-hidden="true">
          <span>
            <Building2 size={32} />
          </span>
          <i />
          <span>
            <PlugZap size={32} />
          </span>
        </div>
      </div>
      <div className="stat-grid">
        {[
          {
            title: 'Proveedores',
            query: recent,
            icon: Building2,
            note: 'Tu red logística',
            to: '/providers',
          },
          {
            title: 'Flotillas',
            query: fleet,
            icon: Layers3,
            note: 'Proveedores de tipo flotilla',
            to: '/providers?type=FLEET',
          },
          {
            title: 'Independientes',
            query: independent,
            icon: UserRound,
            note: 'Proveedores por cuenta propia',
            to: '/providers?type=INDEPENDENT',
          },
        ].map(({ title, query, icon: Icon, note, to }) => (
          <div className="stat-card" key={title}>
            <div>
              <span>{title}</span>
              <Icon size={20} />
            </div>
            {query.isError ? (
              <ErrorState
                error={query.error}
                retry={() => {
                  void query.refetch()
                }}
              />
            ) : (
              <strong>
                {query.isPending
                  ? '…'
                  : query.data.total.toLocaleString('es-MX')}
              </strong>
            )}
            <Link to={to}>
              {note}
              <ArrowUpRight size={15} />
            </Link>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-toolbar">
            <div>
              <h2>Proveedores recientes</h2>
              <p>Últimas incorporaciones a tu red</p>
            </div>
            <Link className="table-action" to="/providers">
              Ver todos <ArrowUpRight size={16} />
            </Link>
          </div>
          {recent.isPending ? (
            <Loading />
          ) : recent.isError ? (
            <ErrorState
              error={recent.error}
              retry={() => {
                void recent.refetch()
              }}
            />
          ) : (
            <Table
              rows={recent.data.items}
              columns={[
                {
                  label: 'Proveedor',
                  render: (row) => (
                    <Link className="entity-name" to={`/providers/${row.id}`}>
                      {row.name}
                      <small>{row.code}</small>
                    </Link>
                  ),
                },
                { label: 'Tipo', render: (row) => <Badge value={row.type} /> },
                {
                  label: 'Estado',
                  render: (row) => <Badge value={row.status} />,
                },
              ]}
            />
          )}
        </div>
        <div className="panel quick-links">
          <h2>Accesos rápidos</h2>
          <p>Continúa con lo importante.</p>
          {[
            {
              to: '/integrations/new',
              title: 'Conectar una plataforma',
              text: 'Crear una integración B2B',
              icon: PlugZap,
            },
            {
              to: '/providers/new',
              title: 'Ampliar tu red',
              text: 'Registrar un proveedor',
              icon: Building2,
            },
            {
              to: '/users',
              title: 'Consultar tu equipo',
              text: 'Administradores y usuarios',
              icon: UserRound,
            },
          ].map(({ to, title, text, icon: Icon }) => (
            <Link to={to} key={to}>
              <span className="quick-icon">
                <Icon size={19} />
              </span>
              <span>
                <strong>{title}</strong>
                <small>{text}</small>
              </span>
              <ArrowUpRight size={16} />
            </Link>
          ))}
        </div>
      </div>
      <p className="page-note">
        Datos de Mandaria Backend · Los indicadores consultan totales paginados,
        sin descargar el catálogo completo.
      </p>
    </>
  )
}
