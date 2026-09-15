import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import {
  LayoutDashboard,
  PlugZap,
  Building2,
  UsersRound,
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
} from 'lucide-react'
import { useAuth } from '../auth/context'
import { labels } from '../utils/format'
import { useFeedback } from '../components/feedback-context'
import { errorMessage } from '../services/errors'
export function AdminLayout() {
  const { user, logout } = useAuth()
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
  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...(admin
      ? [
          { to: '/integrations', label: 'Integraciones', icon: PlugZap },
          { to: '/providers', label: 'Proveedores', icon: Building2 },
          { to: '/users', label: 'Administradores', icon: UsersRound },
        ]
      : user?.role === 'PROVIDER_ADMIN'
        ? [{ to: '/provider/profile', label: 'Mi proveedor', icon: Building2 }]
        : []),
    ...(admin || user?.role === 'PROVIDER_ADMIN'
      ? [
          { to: '/drivers', label: 'Repartidores', icon: Bike },
          { to: '/vehicles', label: 'Vehículos', icon: Truck },
        ]
      : []),
    // V1.5: DeliveryRequests are SUPER_ADMIN only; the route is guarded too.
    ...(admin
      ? [
          {
            to: '/delivery-requests',
            label: 'Solicitudes',
            icon: PackageSearch,
          },
        ]
      : []),
    { to: '/profile', label: 'Mi perfil', icon: UserRound },
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
          <span className="brand-mark">
            m<span>↗</span>
          </span>
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
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}>
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="sidebar-emblem">
            <ArrowUpRight size={22} />
          </span>
          <strong>Una operación conectada.</strong>
          <p>La base de lo que viene.</p>
          <div className="version">
            MANDARIA WEB <span>V1.5</span>
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
                {user?.email.slice(0, 2).toUpperCase()}
              </span>
              <span className="user-info">
                <strong>{user?.email}</strong>
                <small>{labels[user?.role ?? ''] ?? 'Usuario'}</small>
              </span>
              <ChevronDown size={15} />
            </button>
            {menu && (
              <div className="user-dropdown">
                <Link to="/profile" onClick={() => setMenu(false)}>
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
