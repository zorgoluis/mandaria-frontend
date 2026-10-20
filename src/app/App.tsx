import {
  VerificationLayout,
  DriverOnboarding,
  ProviderVerification,
  AdminVerification,
  CaseDetail,
  ReceiptPage,
} from '../verification/pages'
import { Register, RegistrationConfirm } from '../verification/identity'
import { PublicationPage } from '../verification/publications'
import {
  RepresentativesPage,
  AdminRepresentatives,
} from '../verification/representatives'
import {
  PrivacyLayout,
  DeletionHome,
  NewDeletion,
  DeletionDetail,
  AdminDeletionList,
  PrivateDeletion,
} from '../deletion/pages'
import { WebhookEventPage, WebhookHealthPage } from '../webhooks/pages'
import { Component, type ReactNode } from 'react'
import {
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { useAuth } from '../auth/context'
import { Login } from '../auth/Login'
import { RestrictedActiveService } from '../deletion/ActiveService'
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
import {
  IndependentDriversPage,
  IndependentDriverDetail,
} from '../independent-drivers/pages'
import {
  AvailableServicesPage,
  DriverServiceDetail,
  MyServicePage,
  DriverVehiclesPage,
} from '../driver-portal/pages'
import { InvitationsPage } from '../invitations/pages'
import { ActivateAccount } from '../auth/ActivateAccount'
import { ProviderServicesPage, ProviderServiceDetail } from '../dispatch/pages'
import { AdminDispatchesPage, AdminDispatchDetail } from '../dispatch/admin'
import {
  CreditPoliciesPage,
  CreditPolicyDetail,
  CreditPolicyNew,
} from '../credit-policies/pages'
import { DriverCreditsPage, MyCreditsPage } from '../credits/pages'
import {
  PartnerApplicationsPage,
  PartnerApplicationDetail,
} from '../partner-applications/pages'
import type { Role } from '../types/api'
export function Protected({ roles }: { roles?: Role[] }) {
  const auth = useAuth()
  const route = useLocation()
  if (auth.loading) return <Loading />
  if (auth.restricted) {
    if (
      !roles &&
      (/^\/privacy\/deletion(?:\/[0-9a-f-]{36})?$/i.test(route.pathname) ||
        route.pathname === '/privacy/active-service')
    )
      return <Outlet />
    return <Navigate to="/privacy/deletion" replace />
  }
  if (auth.error)
    return (
      <>
        <Link to="/privacy/deletion-access">
          Seguimiento privado de baja sin sesión operativa
        </Link>
        <ErrorState
          error={auth.error}
          retry={() => {
            void auth.restore()
          }}
        />
      </>
    )
  if (!auth.user)
    return (
      <Navigate
        to={
          /^\/(driver\/onboarding|provider\/verification|admin\/verification-cases|verification\/)/.test(
            route.pathname,
          )
            ? '/login?next=onboarding'
            : '/login'
        }
        replace
      />
    )
  if (roles && !roles.includes(auth.user.role)) return <ErrorPage code={403} />
  return <Outlet />
}
export function App() {
  const location = useLocation()
  const auth = useAuth()
  if (auth.loading && location.pathname !== '/privacy/deletion-access')
    return <Loading />
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/privacy/deletion-access"
        element={
          <PrivateDeletion
            key={auth.user?.id ?? auth.restricted?.identity.id ?? 'private'}
          />
        }
      />
      <Route path="/driver/register" element={<Register />} />
      <Route path="/driver/verify" element={<RegistrationConfirm />} />
      {/* Public: invited people have no session yet. */}
      <Route path="/activate-account" element={<ActivateAccount />} />
      <Route element={<Protected />}>
        <Route element={<PrivacyLayout />}>
          <Route
            path="/privacy/active-service"
            element={<RestrictedActiveService />}
          />
          <Route path="/privacy/deletion" element={<DeletionHome />} />
          <Route path="/privacy/deletion/new" element={<NewDeletion />} />
          <Route path="/privacy/deletion/:id" element={<DeletionDetail />} />
          <Route element={<Protected roles={['SUPER_ADMIN']} />}>
            <Route
              path="/admin/privacy/deletion"
              element={<AdminDeletionList />}
            />
            <Route
              path="/admin/privacy/deletion/:id"
              element={<DeletionDetail admin />}
            />
          </Route>
        </Route>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route element={<VerificationLayout />}>
            <Route element={<Protected roles={['DRIVER', 'PROVIDER_ADMIN']} />}>
              <Route
                path="verification/representatives"
                element={<RepresentativesPage />}
              />
              <Route
                path="verification/representatives/:subjectId"
                element={<RepresentativesPage />}
              />
            </Route>
            <Route element={<Protected roles={['DRIVER']} />}>
              <Route path="driver/onboarding" element={<DriverOnboarding />} />
            </Route>
            <Route element={<Protected roles={['PROVIDER_ADMIN']} />}>
              <Route
                path="provider/verification"
                element={<ProviderVerification />}
              />
            </Route>
            <Route element={<Protected roles={['SUPER_ADMIN']} />}>
              <Route
                path="admin/fleet-representatives"
                element={<AdminRepresentatives />}
              />
              <Route
                path="admin/verification-publications"
                element={<PublicationPage />}
              />
              <Route
                path="admin/verification-cases"
                element={<AdminVerification />}
              />
            </Route>
            <Route path="verification/cases/:id" element={<CaseDetail />} />
            <Route
              path="verification/acceptances/:id"
              element={<ReceiptPage />}
            />
          </Route>

          <Route
            path="verification-entry"
            element={
              <Navigate
                to={
                  auth.user?.role === 'DRIVER'
                    ? '/driver/onboarding'
                    : auth.user?.role === 'PROVIDER_ADMIN'
                      ? '/provider/verification'
                      : '/admin/verification-cases'
                }
                replace
              />
            }
          />
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
            <Route
              path="integrations/:id/webhooks/:eventId"
              element={<WebhookEventPage key={location.pathname} />}
            />
            <Route path="webhooks/health" element={<WebhookHealthPage />} />
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
            <Route path="dispatches" element={<AdminDispatchesPage />} />
            <Route
              path="custody-incidents"
              element={
                <p>
                  La ejecución detallada no está disponible en este backend
                  main. Conserva los intentos pendientes y consulta el entorno
                  donde se iniciaron.
                </p>
              }
            />
            <Route
              path="custody-incidents/:dispatchId/:incidentId"
              element={
                <p>
                  Incidencia detallada no disponible en este backend main. No se
                  cerró ni repitió ningún intento.
                </p>
              }
            />
            <Route
              path="dispatches/:id"
              element={<AdminDispatchDetail key={location.pathname} />}
            />
            <Route
              path="independent-drivers"
              element={<IndependentDriversPage />}
            />
            <Route
              path="independent-drivers/:driverId"
              element={<IndependentDriverDetail key={location.pathname} />}
            />
            <Route path="credit-policies" element={<CreditPoliciesPage />} />
            <Route path="credit-policies/new" element={<CreditPolicyNew />} />
            <Route
              path="credit-policies/:id"
              element={<CreditPolicyDetail key={location.pathname} />}
            />
            {/* Landing leads: SUPER_ADMIN only; the backend also gates it. */}
            <Route
              path="admin/partner-applications"
              element={<PartnerApplicationsPage />}
            />
            <Route
              path="admin/partner-applications/:reference"
              element={<PartnerApplicationDetail key={location.pathname} />}
            />
            <Route path="users" element={<UsersPage />} />
            <Route path="invitations" element={<InvitationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          {/* V1.9: temporary web portal for the independent driver; the backend also gates it. */}
          <Route element={<Protected roles={['DRIVER']} />}>
            <Route
              path="driver"
              element={<Navigate to="/driver/services" replace />}
            />
            <Route path="driver/services" element={<AvailableServicesPage />} />
            <Route
              path="driver/services/:id"
              element={<DriverServiceDetail key={location.pathname} />}
            />
            <Route path="driver/my-service" element={<MyServicePage />} />
            <Route path="driver/vehicles" element={<DriverVehiclesPage />} />
            <Route path="driver/credits" element={<DriverCreditsPage />} />
          </Route>
          <Route element={<Protected roles={['PROVIDER_ADMIN']} />}>
            <Route path="provider/profile" element={<MyProvider />} />
            {/* V1.10-F: the provider reads its own credits; recharging stays with SUPER_ADMIN. */}
            <Route path="provider/credits" element={<MyCreditsPage />} />
            {/* V1.7: provider dispatch claiming is PROVIDER_ADMIN only (backend enforces it too). */}
            <Route path="services" element={<ProviderServicesPage />} />
            <Route
              path="services/:id"
              element={<ProviderServiceDetail key={location.pathname} />}
            />
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
