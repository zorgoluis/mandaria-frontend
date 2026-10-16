import { Button, ButtonLink, Modal } from '../components/ui'
import { useEffect, useRef, useState } from 'react'
import { HistoricalOperationsNotice } from '../verification/legacy'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import './layout.css'
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
  LogOut,
  ChevronDown,
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

export function AdminLayout() {
  const { user, logout } = useAuth()
  const notify = useFeedback()
  const location = useLocation()
  const [drawerAt, setDrawerAt] = useState<string | null>(null)
  const [accountAt, setAccountAt] = useState<string | null>(null)
  const open = drawerAt === location.key
  const menu = accountAt === location.key
  const account = useRef<HTMLDivElement>(null)
  const accountButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const desktop = window.matchMedia?.('(min-width: 1025px)')
    if (!desktop) return
    const resize = () => {
      if (desktop.matches) setDrawerAt(null)
    }
    desktop.addEventListener('change', resize)
    return () => desktop.removeEventListener('change', resize)
  }, [])
  useEffect(() => {
    if (!open) return
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [open])
  useEffect(() => {
    if (!menu) return
    const outside = (event: PointerEvent) => {
      if (!account.current?.contains(event.target as Node)) setAccountAt(null)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAccountAt(null)
        accountButton.current?.focus()
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [menu])
  const admin = user?.role === 'SUPER_ADMIN'
  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...(admin
      ? [
          { to: '/integrations', label: 'Integraciones', icon: PlugZap },
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
              to: '/provider/verification',
              label: 'Verificación documental',
              icon: BadgeCheck,
            },
            { to: '/services', label: 'Servicios', icon: Send },
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
          { to: '/driver/services', label: 'Servicios', icon: PackageSearch },
          { to: '/driver/my-service', label: 'Mi servicio', icon: Bike },
          { to: '/driver/vehicles', label: 'Mis vehículos', icon: Truck },
          { to: '/driver/credits', label: 'Créditos', icon: Coins },
        ]
      : []),
    { to: '/profile', label: 'Mi perfil', icon: UserRound },
    ...(admin
      ? [{ to: '/settings', label: 'Configuración', icon: Settings2 }]
      : []),
  ]

  const section =
    links
      .filter(
        ({ to }) =>
          location.pathname === to || location.pathname.startsWith(to + '/'),
      )
      .sort((a, b) => b.to.length - a.to.length)[0]?.label ??
    'Espacio de trabajo'
  const workspace = admin
    ? 'Administración'
    : user?.role === 'DRIVER'
      ? 'Mi operación'
      : 'Mi proveedor'
  const groupFor = (to: string) => {
    if (
      [
        '/profile',
        '/settings',
        '/provider/profile',
        '/provider/verification',
        '/driver/onboarding',
      ].includes(to)
    )
      return 'Cuenta'
    if (
      [
        '/drivers',
        '/vehicles',
        '/providers',
        '/independent-drivers',
        '/admin/partner-applications',
        '/admin/verification-cases',
      ].includes(to)
    )
      return 'Red logística'
    if (
      [
        '/integrations',
        '/users',
        '/invitations',
        '/credit-policies',
        '/service-zones',
      ].includes(to)
    )
      return 'Administración'
    return 'Operación'
  }
  const navigation = () => (
    <nav className="shell-navigation" aria-label="Navegación principal">
      {['Operación', 'Red logística', 'Administración', 'Cuenta'].map(
        (group) => {
          const items = links.filter((link) => groupFor(link.to) === group)
          return items.length ? (
            <section className="shell-nav-group" key={group} aria-label={group}>
              <h2>{group}</h2>
              {items.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} onClick={() => setDrawerAt(null)}>
                  <Icon className="ui-icon" aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </section>
          ) : null
        },
      )}
    </nav>
  )
  const brand = (
    <Link
      to="/dashboard"
      className="brand"
      onClick={() => setDrawerAt(null)}
      aria-label="Mandaria — inicio"
    >
      <img className="brand-mark" src="/mandaria.svg" alt="" />
      mandaria<span className="brand-period">.</span>
    </Link>
  )
  return (
    <div className="admin-app mandaria-shell">
      <a className="shell-skip" href="#main-content">
        Saltar al contenido
      </a>
      <aside className="shell-sidebar" aria-label="Espacio de trabajo">
        <div className="shell-brand">
          {brand}
          <p>Sin vueltas.</p>
        </div>
        {navigation()}
        <div className="shell-sidebar-end">
          <span>Mandaria Web</span>
          <strong>{workspace}</strong>
        </div>
      </aside>
      {open && (
        <Modal
          className="shell-drawer"
          title="Navegación"
          onClose={() => setDrawerAt(null)}
        >
          <div className="shell-brand">{brand}</div>
          {navigation()}
          <p className="shell-drawer-end">Mandaria. Sin vueltas.</p>
        </Modal>
      )}
      <div className="workspace">
        <header className="topbar">
          <div className="shell-context">
            <Button
              variant="ghost"
              className="icon-button shell-menu-toggle"
              aria-label="Abrir menú"
              aria-haspopup="dialog"
              aria-expanded={open}
              onClick={() => {
                setAccountAt(null)
                setDrawerAt(location.key)
              }}
            >
              <Menu className="ui-icon" aria-hidden="true" />
            </Button>
            <div>
              <span className="shell-workspace">{workspace}</span>
              <span className="shell-section">{section}</span>
            </div>
          </div>
          <div
            className="user-menu"
            ref={account}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                setAccountAt(null)
            }}
          >
            <Button
              ref={accountButton}
              variant="ghost"
              className="user-trigger"
              aria-label={`Opciones de cuenta: ${user?.email ?? 'Usuario'}`}
              aria-expanded={menu}
              aria-controls="account-options"
              onClick={() => setAccountAt(menu ? null : location.key)}
            >
              <span className="avatar" aria-hidden="true">
                {user?.email.slice(0, 2).toUpperCase()}
              </span>
              <span className="user-info">
                <strong>{user?.email}</strong>
                <small>{labels[user?.role ?? ''] ?? 'Usuario'}</small>
              </span>
              <ChevronDown className="ui-icon" aria-hidden="true" />
            </Button>
            {menu && (
              <div className="user-dropdown" id="account-options">
                <p className="shell-account-email">{user?.email}</p>
                <ButtonLink
                  variant="ghost"
                  to="/profile"
                  onClick={() => setAccountAt(null)}
                >
                  <UserRound className="ui-icon" aria-hidden="true" />
                  Mi perfil
                </ButtonLink>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setAccountAt(null)
                    void logout().catch((err: unknown) =>
                      notify(
                        `${errorMessage(err)} Se cerró la sesión local; no se confirmó la revocación remota.`,
                        true,
                      ),
                    )
                  }}
                >
                  <LogOut className="ui-icon" aria-hidden="true" />
                  Cerrar sesión
                </Button>
              </div>
            )}
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <HistoricalOperationsNotice />
          <Outlet />
        </main>
        <footer className="app-footer">
          <strong>
            Mandaria. <span>Sin vueltas.</span>
          </strong>
          <span>Mandados · Fletes · Viajes · Mudanzas</span>
        </footer>
      </div>
    </div>
  )
}
