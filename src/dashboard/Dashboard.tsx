import { useQuery } from '@tanstack/react-query'
import { Link, Navigate } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bike,
  Building2,
  ChevronRight,
  Coins,
  FileCheck2,
  PlugZap,
  Layers3,
  MapPinned,
  UserRound,
  UsersRound,
  Plus,
  PackageCheck,
  PackageX,
  Handshake,
  Send,
  Settings2,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react'
import { providers } from '../providers/service'
import { useAuth } from '../auth/context'
import { Badge, ErrorState, Loading, PageTitle, Table } from '../components/ui'
import { MyProvider } from '../providers/pages'
import { deliveryRequests } from '../delivery-requests/service'
import { deliveryRequestKeys } from '../delivery-requests/queries'
import { partnerApplications } from '../partner-applications/service'
import { partnerApplicationKeys } from '../partner-applications/queries'
import { verification } from '../verification/service'
import { independentDrivers } from '../independent-drivers/service'
import { business } from '../customer-business/service'
export function Dashboard() {
  const { user } = useAuth()
  return user?.role === 'CUSTOMER' ? (
    <Navigate to="/customer" replace />
  ) : user?.role === 'SUPER_ADMIN' ? (
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
  const today = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
  return (
    <>
      <span className="eyebrow dash-date">{today.toUpperCase()}</span>
      <PageTitle
        title="Operación de hoy"
        description="Expediente, habilitación comercial y recepción se revisan por separado."
        action={
          <div className="dash-actions">
            <Link className="button secondary" to="/dispatches">
              Consultar despachos
            </Link>
            <Link className="button" to="/admin/verification-cases">
              Revisar expedientes <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        }
      />
      <div className="dash-grid">
        <div className="dash-main">
          <PendingQueues />
          <DeliveryRequestCounts />
          <section className="panel dash-ops" aria-labelledby="dash-ops">
            <div className="panel-toolbar">
              <div>
                <h2 id="dash-ops">Operación independiente</h2>
                <p>Revisión, despacho e incidencias del día</p>
              </div>
            </div>
            <div className="dash-op-grid">
              {[
                {
                  to: '/independent-drivers',
                  title: 'Revisar independientes y zonas propias',
                  text: 'Habilitar, suspender y autorizar zonas',
                  icon: Bike,
                },
                {
                  to: '/admin/verification-cases',
                  title: 'Revisar expediente, términos y licencia',
                  text: 'Revisión documental',
                  icon: BadgeCheck,
                },
                {
                  to: '/dispatches',
                  title: 'Consultar despachos e historial',
                  text: 'Búsquedas, asignación y resultado',
                  icon: Send,
                },
                {
                  to: '/custody-incidents',
                  title: 'Resolver incidencias autorizadas',
                  text: 'Custodia y resolución',
                  icon: ShieldAlert,
                },
              ].map(({ to, title, text, icon: Icon }) => (
                <Link className="dash-op" to={to} key={to}>
                  <span className="dash-op-icon">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <span className="dash-op-text">
                    <strong>{title}</strong>
                    <small>{text}</small>
                  </span>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>
        </div>
        <aside className="dash-side">
          <section className="panel dash-config" aria-labelledby="dash-config">
            <h2 id="dash-config">Configuración de la plataforma</h2>
            {[
              {
                to: '/integrations',
                title: 'Integraciones',
                text: 'Plataformas B2B y webhooks',
                icon: PlugZap,
              },
              {
                to: '/service-zones',
                title: 'Zonas de servicio',
                text: 'Cobertura y tarifas',
                icon: MapPinned,
              },
              {
                to: '/credit-policies',
                title: 'Políticas de créditos',
                text: 'Versiones vigentes',
                icon: Coins,
              },
              {
                to: '/users',
                title: 'Administradores',
                text: 'Cuentas e invitaciones',
                icon: UsersRound,
              },
              {
                to: '/settings',
                title: 'Configuración',
                text: 'Parámetros generales',
                icon: Settings2,
              },
            ].map(({ to, title, text, icon: Icon }) => (
              <Link className="dash-config-link" to={to} key={to}>
                <span className="dash-config-icon">
                  <Icon size={17} aria-hidden="true" />
                </span>
                <span>
                  <strong>{title}</strong>
                  <small>{text}</small>
                </span>
                <ChevronRight size={16} aria-hidden="true" />
              </Link>
            ))}
          </section>
          <section className="panel dash-about">
            <h2>Sobre estos números</h2>
            <p>
              Los indicadores consultan totales paginados del backend, sin
              descargar el catálogo completo. Un pendiente no se resuelve desde
              aquí: abre su cola para decidir.
            </p>
          </section>
        </aside>
      </div>
    </>
  )
}
// Read-only server totals for each decision queue; deciding happens on each queue's own page.
function PendingQueues() {
  const cases = useQuery({
    queryKey: ['dashboard', 'verification-cases', 'SUBMITTED'],
    queryFn: ({ signal }) =>
      verification.review(1, 'SUBMITTED', undefined, '', signal),
  })
  const independents = useQuery({
    queryKey: ['dashboard', 'independent-drivers', 'PENDING'],
    queryFn: ({ signal }) =>
      independentDrivers.list({ pageSize: 1, status: 'PENDING' }, signal),
  })
  const applications = useQuery({
    queryKey: ['dashboard', 'customer-business-applications', 'PENDING'],
    queryFn: () => business.list(true, 1, 'PENDING'),
  })
  const partners = useQuery({
    queryKey: partnerApplicationKeys.count('RECEIVED'),
    queryFn: ({ signal }) =>
      partnerApplications.list({ pageSize: 1, status: 'RECEIVED' }, signal),
  })
  const queues: {
    title: string
    text: string
    to: string
    icon: LucideIcon
    total?: number
    failed: boolean
  }[] = [
    {
      title: 'Expedientes en revisión',
      text: 'Identidad y unidades',
      to: '/admin/verification-cases',
      icon: FileCheck2,
      total: cases.data?.total,
      failed: cases.isError,
    },
    {
      title: 'Independientes pendientes',
      text: 'Habilitación por cuenta propia',
      to: '/independent-drivers',
      icon: Bike,
      total: independents.data?.total,
      failed: independents.isError,
    },
    {
      title: 'Solicitudes Negocio',
      text: 'Acceso comercial por aprobar',
      to: '/admin/customer-business-applications',
      icon: Building2,
      total: applications.data?.total,
      failed: applications.isError,
    },
    {
      title: 'Socios por atender',
      text: 'Llegadas desde la landing',
      to: '/admin/partner-applications?status=RECEIVED',
      icon: Handshake,
      total: partners.data?.total,
      failed: partners.isError,
    },
  ]
  const known = queues.filter((queue) => typeof queue.total === 'number')
  const sum = known.reduce((total, queue) => total + (queue.total ?? 0), 0)
  return (
    <section className="dash-queues" aria-labelledby="dash-queues">
      <div className="dash-queues-head">
        <div>
          <h2 id="dash-queues">Pendientes de decisión</h2>
          <strong>
            {known.length ? sum.toLocaleString('es-MX') : '…'}
            <span> por atender</span>
          </strong>
        </div>
        <small>Cada cola se decide en su propia pantalla</small>
      </div>
      <div className="dash-queue-grid">
        {queues.map(({ title, text, to, icon: Icon, total, failed }) => (
          <Link className="dash-queue" to={to} key={title}>
            <span className="dash-queue-count">
              {failed ? (
                <Icon size={18} aria-label="Sin dato" />
              ) : typeof total === 'number' ? (
                total.toLocaleString('es-MX')
              ) : (
                '…'
              )}
            </span>
            <span className="dash-queue-text">
              <strong>{title}</strong>
              <small>{failed ? 'No se pudo consultar el total' : text}</small>
            </span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  )
}
/** Preserved historical fleet dashboard; not part of current operational navigation. */
export function HistoricalProviderDashboard() {
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
      <DeliveryRequestCounts />
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
// pageSize=1 returns the server-side count; requests are never downloaded to be counted.
function DeliveryRequestCounts() {
  const created = useQuery({
    queryKey: deliveryRequestKeys.count('CREATED'),
    queryFn: ({ signal }) =>
      deliveryRequests.list({ pageSize: 1, status: 'CREATED' }, signal),
  })
  const cancelled = useQuery({
    queryKey: deliveryRequestKeys.count('CANCELLED'),
    queryFn: ({ signal }) =>
      deliveryRequests.list({ pageSize: 1, status: 'CANCELLED' }, signal),
  })
  const received = useQuery({
    queryKey: partnerApplicationKeys.count('RECEIVED'),
    queryFn: ({ signal }) =>
      partnerApplications.list({ pageSize: 1, status: 'RECEIVED' }, signal),
  })
  return (
    <div className="stat-grid">
      {[
        {
          title: 'Solicitudes creadas',
          query: created,
          icon: PackageCheck,
          note: 'Solicitudes vigentes',
          to: '/delivery-requests?status=CREATED',
        },
        {
          title: 'Solicitudes canceladas',
          query: cancelled,
          icon: PackageX,
          note: 'Canceladas por integración o administración',
          to: '/delivery-requests?status=CANCELLED',
        },
        {
          title: 'Solicitudes de socio',
          query: received,
          icon: Handshake,
          note: 'Recibidas desde la landing, sin atender',
          to: '/admin/partner-applications?status=RECEIVED',
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
              {query.isPending ? '…' : query.data.total.toLocaleString('es-MX')}
            </strong>
          )}
          <Link to={to}>
            {note}
            <ArrowUpRight size={15} />
          </Link>
        </div>
      ))}
    </div>
  )
}
