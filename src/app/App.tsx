import { Component, type ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { Login } from '../auth/Login'
import { AdminLayout } from '../layouts/AdminLayout'
import { ErrorPage, ErrorState, Loading } from '../components/ui'
import { Dashboard } from '../dashboard/Dashboard'
import {
  IntegrationsPage,
  IntegrationDetail,
  IntegrationNew,
} from '../integrations/pages'
import {
  ProvidersPage,
  ProviderDetail,
  ProviderNew,
  MyProvider,
} from '../providers/pages'
import { ProfilePage, SettingsPage, UsersPage } from '../users/pages'
import { DriversPage, DriverNew, DriverDetail } from '../drivers/pages'
import { VehiclesPage, VehicleNew, VehicleDetail } from '../vehicles/pages'
import {
  DeliveryRequestsPage,
  DeliveryRequestDetail,
} from '../delivery-requests/pages'
import {
  ServiceZonesPage,
  ServiceZoneNew,
  ServiceZoneDetail,
} from '../pricing/zones'
import { RatePlanDetail } from '../pricing/rate-plans'
import { QuotesPage, QuoteDetail } from '../quotes/pages'
import { InvitationsPage } from '../invitations/pages'
import { ActivateAccount } from '../auth/ActivateAccount'
import type { Role } from '../types/api'
export function Protected({ roles }: { roles?: Role[] }) {
  const auth = useAuth()
  if (auth.loading) return <Loading />
  if (auth.error)
    return (
      <ErrorState
        error={auth.error}
        retry={() => {
          void auth.restore()
        }}
      />
    )
  if (!auth.user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(auth.user.role)) return <ErrorPage code={403} />
  return <Outlet />
}
export function App() {
  const location = useLocation()
  const auth = useAuth()
  if (auth.loading) return <Loading />
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* Public: invited people have no session yet. */}
      <Route path="/activate-account" element={<ActivateAccount />} />
      <Route element={<Protected />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route
            element={<Protected roles={['SUPER_ADMIN', 'PROVIDER_ADMIN']} />}
          >
            <Route path="drivers" element={<DriversPage />} />
            <Route path="drivers/new" element={<DriverNew />} />
            <Route
              path="drivers/:id"
              element={<DriverDetail key={location.pathname} />}
            />
            <Route path="vehicles" element={<VehiclesPage />} />
            <Route path="vehicles/new" element={<VehicleNew />} />
            <Route
              path="vehicles/:id"
              element={<VehicleDetail key={location.pathname} />}
            />
          </Route>
          <Route element={<Protected roles={['SUPER_ADMIN']} />}>
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="integrations/new" element={<IntegrationNew />} />
            <Route
              path="integrations/:id"
              element={<IntegrationDetail key={location.pathname} />}
            />
            <Route path="providers" element={<ProvidersPage />} />
            <Route path="providers/new" element={<ProviderNew />} />
            <Route
              path="providers/:id"
              element={<ProviderDetail key={location.pathname} />}
            />
            <Route
              path="delivery-requests"
              element={<DeliveryRequestsPage />}
            />
            <Route
              path="delivery-requests/:publicId"
              element={<DeliveryRequestDetail key={location.pathname} />}
            />
            <Route path="service-zones" element={<ServiceZonesPage />} />
            <Route path="service-zones/new" element={<ServiceZoneNew />} />
            <Route
              path="service-zones/:id"
              element={<ServiceZoneDetail key={location.pathname} />}
            />
            <Route
              path="rate-plans/:id"
              element={<RatePlanDetail key={location.pathname} />}
            />
            <Route path="delivery-quotes" element={<QuotesPage />} />
            <Route
              path="delivery-quotes/:publicId"
              element={<QuoteDetail key={location.pathname} />}
            />
            <Route path="users" element={<UsersPage />} />
            <Route path="invitations" element={<InvitationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route element={<Protected roles={['PROVIDER_ADMIN']} />}>
            <Route path="provider/profile" element={<MyProvider />} />
          </Route>
          <Route path="403" element={<ErrorPage code={403} />} />
          <Route path="*" element={<ErrorPage code={404} />} />
        </Route>
      </Route>
    </Routes>
  )
}
export class AppBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <div className="state full-state">
        <h1>No fue posible mostrar esta página</h1>
        <p>Vuelve a cargar Mandaria para continuar.</p>
        <button className="button" onClick={() => window.location.reload()}>
          Volver a cargar
        </button>
      </div>
    ) : (
      this.props.children
    )
  }
}
