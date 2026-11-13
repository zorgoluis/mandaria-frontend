import { DriverExecutionRecovery } from '../driver-portal/execution'
import { IndependentRecovery } from '../driver-portal/recovery'
import { useQuery } from '@tanstack/react-query'
import { customer } from '../customer/service'
import { profileInitials } from '../customer/profile-format'
import { CustomerOperationNotice } from '../customer/pages'
import { useEffect, useRef, useState } from 'react'
import { ExecutionRecovery } from '../execution/components'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  PlugZap,
  Building2,
  UsersRound,
  MailPlus,
  Send,
  Settings2,
  UserRound,
  Menu,
  X,
  LogOut,
  ChevronDown,
  ArrowUpRight,
  Bike,
  Truck,
  PackageSearch,
  MapPinned,
  ReceiptText,
  BadgeCheck,
  Coins,
  Handshake,
} from 'lucide-react'
import { useAuth } from '../auth/context'
import { labels } from '../utils/format'
import { useFeedback } from '../components/feedback-context'
import { errorMessage } from '../services/errors'
import type { Onboarding } from '../verification/types'
import { verification } from '../verification/service'
export function AdminLayout() {
  const { user, logout } = useAuth()
  const { pathname, search } = useLocation()
  const onboarding = useQuery<Onboarding>({
    queryKey: ['verification', user?.id, 'onboarding'],
    queryFn: ({ signal }) => verification.onboarding(signal),
    enabled: false,
  })
  // Observe the existing profile cache; do not add requests for operational users.
  const profile = useQuery({
    queryKey: ['customer', user?.id, 'profile'],
    queryFn: customer.profile,
    enabled: false,
  })
  const displayName = profile.data?.active
    ? profile.data.displayName
    : user?.email
  const profilePath =
    user?.role === 'CUSTOMER' ? '/customer/profile' : '/profile'
  const notify = useFeedback()
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const sidebar = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement
    const focusable = () =>
      Array.from(
        sidebar.current?.querySelectorAll<HTMLElement>('a, button') ?? [],
      ).filter((element) => element.getClientRects().length > 0)
    focusable()[0]?.focus()
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
      if (event.key !== 'Tab') return
      const nodes = focusable()
      const first = nodes[0]
      const last = nodes.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener('keydown', keyboard)
    return () => {
      document.removeEventListener('keydown', keyboard)
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [open])
  const admin = user?.role === 'SUPER_ADMIN'
  if (
    user?.role === 'DRIVER' &&
    pathname === '/driver/onboarding' &&
    !new URLSearchParams(search).has('view') &&
    onboarding.data?.guidedRegistration &&
    onboarding.data.driver.independentProfile?.status === 'PENDING' &&
    onboarding.data.driver.independentProfile.vehicles.length <= 1
  )
    return (
      <div className="signup-workspace">
        <header className="signup-topbar">
          <Link
            className="brand"
            to="/profile"
            aria-label="Mandaria, mi cuenta"
          >
            <img src="/mandaria.svg" alt="" width="36" height="36" /> mandaria.
          </Link>
          <Link className="journey-profile-link" to="/profile">
            <UserRound size={16} aria-hidden="true" /> Mi cuenta
          </Link>
        </header>
        <main id="main-content">
          <DriverExecutionRecovery />
          <IndependentRecovery />
          <Outlet />
        </main>
      </div>
    )
  const links = [
    ...(user?.role === 'CUSTOMER'
      ? [
          { to: '/customer', label: 'Mis envíos', icon: PackageSearch },
          {
            to: '/customer/business',
            label: 'Cuenta Negocio',
            icon: Building2,
          },
        ]
      : []),
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...(['DRIVER', 'PROVIDER_ADMIN'].includes(user?.role || '')
      ? [
          {
            to: '/verification/representatives',
            label: 'Representación legal',
            icon: BadgeCheck,
          },
        ]
      : []),
    ...(admin
      ? [
          {
            to: '/admin/fleet-assistance',
            label: 'Asistencia y conciliación',
            icon: BadgeCheck,
          },
          {
            to: '/admin/fleet-exits',
            label: 'Salidas de flotilla',
            icon: BadgeCheck,
          },
          { to: '/integrations', label: 'Integraciones', icon: PlugZap },
          {
            to: '/admin/customer-business-applications',
            label: 'Solicitudes Negocio',
            icon: Building2,
          },
          { to: '/providers', label: 'Proveedores', icon: Building2 },
          { to: '/users', label: 'Administradores', icon: UsersRound },
          { to: '/invitations', label: 'Invitaciones', icon: MailPlus },
          {
            to: '/admin/partner-applications',
            label: 'Solicitudes de socio',
            icon: Handshake,
          },
        ]
      : user?.role === 'PROVIDER_ADMIN'
        ? [
            { to: '/provider/profile', label: 'Mi proveedor', icon: Building2 },
            {
              to: '/fleet-exits',
              label: 'Salidas de flotilla',
              icon: BadgeCheck,
            },
            {
              to: '/provider/verification',
              label: 'Verificación documental',
              icon: BadgeCheck,
            },
            {
              to: '/fleet-assistance',
              label: 'Asistencia y conciliación',
              icon: BadgeCheck,
            },
            { to: '/services', label: 'Servicios', icon: Send },
            {
              to: '/fleet-services',
              label: 'Envíos de mi flotilla',
              icon: Send,
            },
            { to: '/provider/credits', label: 'Créditos', icon: Coins },
          ]
        : []),
    ...(admin || user?.role === 'PROVIDER_ADMIN'
      ? [
          { to: '/drivers', label: 'Repartidores', icon: Bike },
          { to: '/vehicles', label: 'Vehículos', icon: Truck },
        ]
      : []),
    // V1.5/V1.6: requests, zones, rates and quotes are SUPER_ADMIN only; routes are guarded too.
    ...(admin
      ? [
          {
            to: '/delivery-requests',
            label: 'Solicitudes',
            icon: PackageSearch,
          },
          {
            to: '/delivery-quotes',
            label: 'Cotizaciones',
            icon: ReceiptText,
          },
          {
            to: '/service-zones',
            label: 'Zonas de servicio',
            icon: MapPinned,
          },
          {
            to: '/dispatches',
            label: 'Despachos',
            icon: Send,
          },
          {
            to: '/custody-incidents',
            label: 'Incidencias de custodia',
            icon: BadgeCheck,
          },
          {
            to: '/admin/verification-cases',
            label: 'Revisión documental',
            icon: BadgeCheck,
          },
        ]
      : []),
    // V1.9: independent driver administration is SUPER_ADMIN only and stands apart from Providers.
    ...(admin
      ? [
          {
            to: '/independent-drivers',
            label: 'Independientes',
            icon: BadgeCheck,
          },
          // V1.10-F: policies are global; each account's credits live inside its own file.
          {
            to: '/credit-policies',
            label: 'Políticas de créditos',
            icon: Coins,
          },
        ]
      : []),
    // V1.9: the temporary portal a DRIVER uses to take services on their own.
    ...(user?.role === 'DRIVER'
      ? [
          {
            to: '/driver/onboarding',
            label: 'Mi verificación',
            icon: BadgeCheck,
          },
          { to: '/driver/reception', label: 'Zonas y turno', icon: MapPinned },
          { to: '/driver/vehicles', label: 'Mis vehículos', icon: Truck },
          { to: '/driver/credits', label: 'Créditos', icon: Coins },
        ]
      : []),
    { to: profilePath, label: 'Mi perfil', icon: UserRound },
    ...(admin
      ? [{ to: '/settings', label: 'Configuración', icon: Settings2 }]
      : []),
  ]
  return (
    <div className="admin-app">
      {open && (
        <button
          className="sidebar-scrim"
          aria-label="Cerrar navegación"
          onClick={() => setOpen(false)}
        />
      )}
      <aside ref={sidebar} className={`sidebar ${open ? 'open' : ''}`}>
        <Link to="/dashboard" className="brand">
          <img
            className="brand-mark"
            src="/mandaria.svg"
            alt=""
            width={35}
            height={35}
          />
          mandaria<span className="brand-period">.</span>
        </Link>
        <button
          className="icon-button mobile-close"
          aria-label="Cerrar menú"
          onClick={() => setOpen(false)}
        >
          <X />
        </button>
        <span className="nav-label">ESPACIO DE TRABAJO</span>
        <nav aria-label="Navegación principal">
          {links
            .filter(
              (link) =>
                ![
                  '/providers',
                  '/drivers',
                  '/vehicles',
                  '/invitations',
                  '/admin/fleet-assistance',
                  '/admin/fleet-exits',
                  '/fleet-assistance',
                  '/fleet-exits',
                  '/fleet-services',
                  '/admin/partner-applications',
                ].includes(link.to),
            )
            .map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={
                  to === '/customer' &&
                  (pathname === '/customer/profile' ||
                    pathname.startsWith('/customer/business'))
                }
                className={({ isActive }) =>
                  isActive ||
                  (to === '/driver/onboarding' &&
                    pathname.startsWith('/verification/cases/')) ||
                  (to === profilePath && pathname === '/customer/profile')
                    ? 'active'
                    : undefined
                }
                onClick={() => setOpen(false)}
              >
                <Icon size={19} aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <Link className="sidebar-privacy" to="/privacy/deletion">
            Baja y privacidad
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          <div className="sidebar-card">
            <strong>Una operación conectada.</strong>
            <p>La base de lo que viene.</p>
            <div className="version">
              MANDARIA WEB <span>V1.10</span>
            </div>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="workspace-label">
            <button
              className="icon-button mobile-menu"
              aria-label="Abrir menú"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              <Menu />
            </button>
            <span className="workspace-dot" /> Panel administrativo
          </div>
          <div className="user-menu">
            <button
              className="user-trigger"
              onClick={() => setMenu(!menu)}
              aria-expanded={menu}
            >
              <span className="avatar">
                {profileInitials(displayName ?? '')}
              </span>
              <span className="user-info">
                <strong>{displayName}</strong>
                <small>{labels[user?.role ?? ''] ?? 'Usuario'}</small>
              </span>
              <ChevronDown size={15} />
            </button>
            {menu && (
              <div className="user-dropdown">
                <Link to={profilePath} onClick={() => setMenu(false)}>
                  <UserRound size={16} />
                  Mi perfil
                </Link>
                <button
                  onClick={() => {
                    setMenu(false)
                    void logout().catch((err: unknown) =>
                      notify(
                        `${errorMessage(err)} Se cerró la sesión local; no se confirmó la revocación remota.`,
                        true,
                      ),
                    )
                  }}
                >
                  <LogOut size={16} />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </header>
        <main id="main-content">
          <ExecutionRecovery />
          <CustomerOperationNotice />
          <DriverExecutionRecovery />
          <IndependentRecovery />
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>Mandaria · Administración</span>
          <span>Logística que avanza contigo.</span>
        </footer>
      </div>
    </div>
  )
}
