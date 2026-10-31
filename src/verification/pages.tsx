import { AcceptanceHistory } from './acceptance-history'
import { CaseRetention, CaseRetentionLookup } from './retention'
import { useState } from 'react'
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/context'
import { Field, Loading, Pagination, Confirm } from '../components/ui'
import { ProviderScope } from '../logistics/components'
import { drivers } from '../drivers/service'
import { vehicles } from '../vehicles/service'
import type { ProviderContext } from '../logistics/types'
import { date } from '../utils/format'
import { verification } from './service'
import { Form, Warning, Recovery } from './common'
import { message, labels, vkey } from './format'
import { useCommand } from './hooks'
import { EmailVerification, TermsPanel } from './identity'
import { CaseForm, NewUnit } from './forms'
import { Evidence } from './evidence'
import { TermsDocuments } from './terms'
import { provenance } from './terms-contract'
import { documentaryAvailability, consultationError } from './availability'
import { useRequirements, useTermsQuery } from './use-availability'
import type { Area, SubjectType, VerificationCase, Requirements } from './types'
import './verification.css'
import './onboarding.css'
import './identity-case.css'
import { Bike, Car } from 'lucide-react'
import { labels as vehicleLabels } from '../utils/format'
import { RepresentativeCase } from './representatives'
export function VerificationLayout() {
  const { user } = useAuth()
  const location = useLocation()
  return (
    <div
      className={`verification-area ${location.pathname === '/driver/onboarding' || (user?.role === 'DRIVER' && location.pathname.startsWith('/verification/cases/')) ? 'driver-documentary-area' : ''}`}
      key={user?.id}
    >
      {user?.role === 'SUPER_ADMIN' &&
      location.pathname === '/admin/verification-publications' ? (
        <aside className="notice">
          La publicación administrativa es independiente del alta documental y
          no activa la admisión.
        </aside>
      ) : location.pathname === '/driver/onboarding' ? null : (
        <Warning />
      )}
      <Recovery showAccountLink={location.pathname !== '/driver/onboarding'} />
      <Outlet key={user?.id + ':' + location.pathname + location.search} />
    </div>
  )
}
export function DriverOnboarding() {
  const { user } = useAuth()
  const runtime = useRequirements()
  const terms = useTermsQuery()
  const q = useQuery({
    queryKey: vkey(user!.id, 'onboarding'),
    queryFn: ({ signal }) => verification.onboarding(signal),
    retry: false,
    gcTime: 0,
  })
  const state = documentaryAvailability(runtime, terms)
  const onboardingState = documentaryAvailability(runtime, {
    ...q,
    data: q.data ? { blockingReason: q.data.terms.blockingReason } : undefined,
  })
  const currentAcceptance =
    !!q.data?.terms.acceptance &&
    q.data.terms.acceptance.version === terms.data?.version &&
    q.data.terms.requiredVersion === terms.data?.version
  const receipt = q.data?.terms.acceptance ?? q.data?.terms.latestAcceptance
  const blocked =
    !state.canProceed || !onboardingState.canProceed || !currentAcceptance
  const profileStatus =
    q.data?.driver.independentProfile?.status || q.data?.driver.status
  const statuses = [
    {
      label: '1 · Correo',
      value: user?.emailVerifiedAt ? 'Confirmado' : 'Por confirmar',
      tone: user?.emailVerifiedAt ? 'ok' : 'pending',
    },
    {
      label: '2 · Términos',
      value:
        currentAcceptance && state.canProceed
          ? 'Vigentes'
          : state.kind === 'error'
            ? 'Sin confirmar'
            : 'Pendientes',
      tone: currentAcceptance && state.canProceed ? 'ok' : 'pending',
    },
    {
      label: '3 · Perfil',
      value: q.isError
        ? 'No disponible'
        : labels[profileStatus || ''] || profileStatus || 'Consultando…',
      tone: ['APPROVED', 'ACTIVE'].includes(profileStatus || '')
        ? 'ok'
        : ['REJECTED', 'SUSPENDED'].includes(profileStatus || '')
          ? 'blocked'
          : 'pending',
    },
    {
      label: '4 · Nuevas asignaciones',
      value: q.isError
        ? 'Sin confirmar'
        : q.data
          ? q.data.enforcementEnabled
            ? 'Control activo'
            : 'Control parcial'
          : 'Consultando…',
      tone: q.data?.enforcementEnabled ? 'ok' : 'pending',
    },
  ]
  return (
    <div className="driver-documentary">
      <header className="documentary-heading">
        <Link to="/profile">← Mi cuenta</Link>
        <h1>Mi verificación documental</h1>
        <p>
          Autenticación, correo confirmado, aprobación documental y habilitación
          operativa son estados diferentes.
        </p>
      </header>
      <div className="documentary-statuses" aria-live="polite">
        {statuses.map((s) => (
          <div className="documentary-status" key={s.label}>
            <span>{s.label}</span>
            <strong className={'state-' + s.tone}>
              <i aria-hidden="true" />
              {s.value}
            </strong>
          </div>
        ))}
      </div>
      <Warning />
      {q.isError && <p role="alert">{consultationError(q.error)}</p>}
      <div className="documentary-columns">
        <div className="documentary-main">
          <EmailVerification designed />
          <TermsPanel
            designed
            accepted={
              currentAcceptance &&
              state.canProceed &&
              onboardingState.canProceed
                ? (q.data?.terms.acceptance ?? undefined)
                : undefined
            }
          />
          {onboardingState.kind === 'missing_policy' &&
            state.kind !== 'missing_policy' && (
              <p role="alert">{onboardingState.text}</p>
            )}
          {!currentAcceptance && (
            <p role="status">
              Pendiente: consulta y acepta los términos vigentes antes de
              preparar evidencias. Después se requiere presentación y revisión
              manual.
            </p>
          )}
          {state.mode === 'PRODUCTION' &&
            q.data?.subjects.some((s) =>
              s.cases.some((c) => c.environment !== 'PRODUCTION'),
            ) && (
              <p role="status">
                Tu historial incluye expedientes sin procedencia productiva.
                Necesitas las aceptaciones vigentes, un nuevo expediente, nuevas
                cargas y revisión; no se copian documentos ni aprobaciones. Si
                hay un borrador histórico abierto, retíralo mediante la acción
                autorizada para preparar uno nuevo.
              </p>
            )}
          <section className="panel panel-body documentary-units">
            <h2>
              <span className="documentary-step">3</span>Unidades independientes
            </h2>
            {q.isPending ? (
              <Loading />
            ) : q.data?.driver.independentProfile ? (
              <>
                {q.data.driver.independentProfile.vehicles.map((v) => (
                  <article className="documentary-unit" key={v.id}>
                    <span
                      className="documentary-vehicle-icon"
                      aria-hidden="true"
                    >
                      {['MOTORCYCLE', 'BICYCLE'].includes(v.type) ? (
                        <Bike />
                      ) : (
                        <Car />
                      )}
                    </span>
                    <div>
                      <h3>{v.identifier}</h3>
                      <div className="documentary-chips">
                        <span
                          className={v.status === 'ACTIVE' ? 'chip-ok' : ''}
                        >
                          {vehicleLabels[v.status] || v.status}
                        </span>
                        <span>{vehicleLabels[v.type] || v.type}</span>
                      </div>
                    </div>
                    <CreateCase
                      area="driver"
                      subjectType="VEHICLE"
                      resourceId={v.id}
                      label="Preparar expediente de esta unidad"
                      disabled={blocked}
                    />
                  </article>
                ))}
                {!q.data.driver.independentProfile.vehicles.length && (
                  <p>Aún no tienes unidades independientes registradas.</p>
                )}
                <NewUnit disabled={blocked} />
              </>
            ) : (
              !q.isError && (
                <p>
                  Tu identidad de flotilla la presenta su administrador. Tu
                  aceptación personal no puede sustituirla otra cuenta.
                </p>
              )
            )}
          </section>
          <CaseList area="driver" designed />
        </div>
        <aside className="documentary-aside" aria-label="Resumen documental">
          <section className="panel panel-body documentary-receipt">
            <h2>
              {receipt
                ? 'Comprobante personal ' +
                  (currentAcceptance ? 'vigente' : 'anterior')
                : 'Tu verificación'}
            </h2>
            {receipt ? (
              <Link
                className="documentary-version"
                to={'/verification/acceptances/' + receipt.id}
              >
                {receipt.version}
              </Link>
            ) : (
              <p>Sin comprobante confirmado</p>
            )}
            {q.data && (
              <p>
                Proveedor:{' '}
                {q.data.driver.providerId
                  ? 'Vinculado a flotilla; expediente independiente separado'
                  : 'Independiente sin proveedor'}
                <br />
                Perfil: {labels[profileStatus || ''] || profileStatus}
              </p>
            )}
            {!currentAcceptance && (
              <p>No sustituye la aceptación de los términos vigentes.</p>
            )}
            {q.data?.driver.independentProfile && (
              <CreateCase
                area="driver"
                subjectType="DRIVER_IDENTITY"
                resourceId={q.data.driver.id}
                label="Preparar expediente de identidad independiente"
                disabled={blocked}
              />
            )}
          </section>
          <section className="panel panel-body">
            <h2>Control de nuevas asignaciones</h2>
            <p>
              {q.data
                ? q.data.enforcementEnabled
                  ? 'Activo; los recursos existentes también deben cumplir los requisitos.'
                  : 'Sin activar para recursos existentes; los nuevos independientes requieren revisión.'
                : 'Consulta pendiente.'}{' '}
              La aceptación no acredita licencia, vehículo ni crédito. Consulta
              el servicio ya comprometido en{' '}
              <Link to="/driver/my-service">Mi servicio</Link>.
            </p>
          </section>
          <AcceptanceHistory
            key={user!.id}
            compact
            currentId={
              currentAcceptance ? q.data?.terms.acceptance?.id : undefined
            }
          />
          <Notices area="driver" compact />
        </aside>
      </div>
    </div>
  )
}

export function CreateCase({
  area,
  subjectType,
  resourceId,
  label,
  disabled = false,
}: {
  area: 'driver' | 'provider'
  subjectType: SubjectType
  resourceId: string
  label: string
  disabled?: boolean
}) {
  const command = useCommand()
  const navigate = useNavigate()
  return (
    <Form
      label={label}
      disabled={disabled || command.blocked || command.busy || !resourceId}
      onSubmit={async () => {
        const r = await command.send(
          'CREATE_CASE',
          resourceId,
          `/${area}/verification-cases`,
          { subjectType, subjectId: resourceId },
        )
        navigate('/verification/cases/' + r.id)
      }}
    />
  )
}
export function ProviderVerification() {
  return (
    <>
      <h1>Verificación de mi flotilla</h1>
      <EmailVerification />
      <ProviderScope>
        {(scope) => <ProviderWorkspace key={scope.providerId} scope={scope} />}
      </ProviderScope>
    </>
  )
}
function ProviderWorkspace({ scope }: { scope: ProviderContext }) {
  const { user } = useAuth()
  const runtime = useRequirements()
  const terms = useTermsQuery(scope.providerId)
  const state = documentaryAvailability(runtime, terms)
  const [kind, setKind] = useState<SubjectType>('DRIVER_IDENTITY')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState('')
  const q = useQuery({
    queryKey: vkey(user!.id, 'resources', scope.providerId, kind, page),
    queryFn: async ({ signal }) =>
      kind === 'DRIVER_IDENTITY'
        ? drivers.list(scope, { page, pageSize: 20 }, signal)
        : vehicles.list(scope, { page, pageSize: 20 }, signal),
    retry: false,
    gcTime: 0,
  })
  return (
    <>
      <TermsPanel providerId={scope.providerId} providerName={scope.name} />
      <p>
        <Link
          to={
            '/verification/representatives?providerId=' +
            encodeURIComponent(scope.providerId)
          }
        >
          Mi representación legal en esta flotilla
        </Link>
      </p>
      <section className="panel panel-body">
        <h2>Preparar expediente</h2>
        <p>
          Antes de capturar la identidad deben aceptar personalmente el
          conductor y un representante vigente. Si falta una aceptación, backend
          rechaza la carga. No uses credenciales del conductor.
        </p>
        <Field label="Recurso">
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as SubjectType)
              setSelected('')
              setPage(1)
            }}
          >
            <option value="DRIVER_IDENTITY">Conductor</option>
            <option value="VEHICLE">Unidad</option>
          </select>
        </Field>
        {q.isPending ? (
          <Loading />
        ) : q.isError ? (
          <p role="alert">{message(q.error)}</p>
        ) : (
          <>
            <Field label="Seleccionar recurso autorizado">
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">Selecciona</option>
                {q.data.items.map((r) => (
                  <option key={r.id} value={r.id}>
                    {'name' in r ? r.name : r.identifier}
                  </option>
                ))}
              </select>
            </Field>
            <Pagination
              page={page}
              total={q.data.total}
              totalPages={q.data.totalPages}
              onPage={(p) => {
                setPage(p)
                setSelected('')
              }}
            />
          </>
        )}
        <CreateCase
          area="provider"
          subjectType={kind}
          resourceId={selected}
          label="Crear borrador de flotilla"
          disabled={!state.canProceed}
        />
        <p>
          <Link to={'/drivers/new?providerId=' + scope.providerId}>
            Alta de conductor existente
          </Link>{' '}
          ·{' '}
          <Link to={'/vehicles/new?providerId=' + scope.providerId}>
            Alta de unidad
          </Link>
        </p>
      </section>
      <CaseList area="provider" providerId={scope.providerId} />
      <Notices area="provider" />
    </>
  )
}
export function AdminVerification() {
  return (
    <>
      <h1>Revisión documental</h1>
      <p>
        <Link to="/admin/verification-publications">
          Publicación de términos y privacidad
        </Link>
      </p>
      <p>
        <Link to="/admin/fleet-representatives">
          Vínculos de representación legal
        </Link>
      </p>
      <p>
        Decisiones exclusivas SUPER_ADMIN. Identidad y unidades se revisan por
        separado de representación legal.
      </p>
      <CaseList area="admin" />
    </>
  )
}
export function CaseList({
  area,
  providerId,
  designed = false,
}: {
  area: Area
  providerId?: string
  designed?: boolean
}) {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [provider, setProvider] = useState('')
  const q = useQuery({
    queryKey: vkey(
      user!.id,
      'list',
      area,
      providerId || provider,
      page,
      status,
    ),
    queryFn: ({ signal }) =>
      verification.list(
        area,
        page,
        status,
        providerId || provider || undefined,
        signal,
      ),
    gcTime: 0,
    retry: false,
  })
  return (
    <section className="panel panel-body">
      <h2>Expedientes e historial</h2>
      {designed ? (
        <div
          className="documentary-filter"
          role="radiogroup"
          aria-label="Estado del expediente"
        >
          {['', 'APPROVED', 'SUBMITTED', 'DRAFT', 'REJECTED', 'WITHDRAWN'].map(
            (s) => (
              <label key={s} className={status === s ? 'selected' : ''}>
                <input
                  type="radio"
                  name="case-status"
                  value={s}
                  checked={status === s}
                  onChange={() => {
                    setStatus(s)
                    setPage(1)
                  }}
                />
                {s ? labels[s] : 'Todos'}
              </label>
            ),
          )}
        </div>
      ) : (
        <Field label="Estado del expediente">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="">Todos</option>
            {['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'WITHDRAWN'].map(
              (s) => (
                <option key={s} value={s}>
                  {labels[s]}
                </option>
              ),
            )}
          </select>
        </Field>
      )}
      {area === 'admin' && (
        <details>
          <summary>Filtrar por proveedor</summary>
          <ProviderScope>
            {(p) => (
              <button
                type="button"
                onClick={() => {
                  setProvider(p.providerId)
                  setPage(1)
                }}
              >
                Filtrar: {p.name}
              </button>
            )}
          </ProviderScope>
          {provider && (
            <button onClick={() => setProvider('')}>
              Quitar filtro de proveedor
            </button>
          )}
        </details>
      )}
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <>
          <p role="alert">{message(q.error)}</p>
          <button onClick={() => void q.refetch()}>
            Consultar expedientes
          </button>
        </>
      ) : (
        <>
          {!q.data.items.length ? (
            <p>No hay expedientes en este ámbito.</p>
          ) : designed ? (
            <table className="documentary-table">
              <thead>
                <tr>
                  <th>Expediente</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Nota</th>
                </tr>
              </thead>
              <tbody>
                {q.data.items.map((c) => (
                  <tr key={c.id}>
                    <td data-label="Expediente">
                      <Link to={'/verification/cases/' + c.id}>
                        Revisión {c.revision}
                      </Link>
                    </td>
                    <td data-label="Estado">
                      <span
                        className={
                          'documentary-badge ' +
                          (c.status === 'APPROVED'
                            ? 'chip-ok'
                            : ['REJECTED'].includes(c.status)
                              ? 'chip-blocked'
                              : '')
                        }
                      >
                        {labels[c.status] || c.status}
                      </span>
                    </td>
                    <td data-label="Fecha">{date(c.createdAt)}</td>
                    <td data-label="Nota">{c.publicReason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <ul className="verification-files">
              {q.data.items.map((c) => (
                <li key={c.id}>
                  <Link to={'/verification/cases/' + c.id}>
                    Expediente · {labels[c.status]}
                  </Link>{' '}
                  · Revisión {c.revision} · {date(c.createdAt)}
                  {c.publicReason && <p>{c.publicReason}</p>}
                </li>
              ))}
            </ul>
          )}
          <Pagination
            page={page}
            totalPages={q.data.totalPages}
            total={q.data.total}
            onPage={setPage}
          />
        </>
      )}
    </section>
  )
}
function Notices({
  area,
  compact = false,
}: {
  area: 'driver' | 'provider'
  compact?: boolean
}) {
  const { user } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const q = useQuery({
    queryKey: vkey(user!.id, 'notices', area),
    queryFn: ({ signal }) => verification.notices(area, signal),
    retry: false,
    gcTime: 0,
  })
  return (
    <section className="panel panel-body">
      <h2>Mis avisos de decisiones</h2>
      <p>
        Últimos 100 avisos propios autorizados. Un fallo del correo no revierte
        la decisión.
      </p>
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <p role="alert">{message(q.error)}</p>
      ) : q.data.length ? (
        <>
          {(compact && !expanded ? q.data.slice(0, 3) : q.data).map((n) => (
            <p key={n.id}>
              <Link to={'/verification/cases/' + n.caseId}>
                {labels[n.case.status]}
              </Link>{' '}
              · {labels[n.status] || 'Estado de aviso consultado'} ·{' '}
              {date(n.createdAt)} {n.case.publicReason}
            </p>
          ))}
          {compact && q.data.length > 3 && (
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Ver menos' : 'Ver todos'}
            </button>
          )}
        </>
      ) : (
        <p>Sin avisos.</p>
      )}
    </section>
  )
}
export function CaseDetail() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const q = useQuery({
    queryKey: vkey(user!.id, 'case', id),
    queryFn: ({ signal }) => verification.get(id, signal),
    retry: false,
    gcTime: 0,
    staleTime: 0,
    refetchInterval: (query) =>
      query.state.data?.subjectType === 'REPRESENTATIVE' ? 10000 : false,
  })
  const r = useRequirements()
  if (q.isPending || r.isPending) return <Loading />
  if (q.isError)
    return (
      <>
        <p role="alert">{message(q.error)}</p>
        <CaseRetentionLookup key={user!.id + ':' + id} caseId={id} />
        <Link to="/privacy/deletion">Seguimiento de baja y privacidad</Link>
      </>
    )
  if (r.isError) return <p role="alert">{consultationError(r.error)}</p>
  if (q.data.subjectType === 'REPRESENTATIVE')
    return (
      <>
        <CaseRetention
          key={user!.id + ':' + id + ':retention'}
          record={q.data}
          refreshing={q.isFetching}
        />
        <RepresentativeCase
          key={user!.id + ':' + id}
          record={q.data}
          requirements={r.data}
        />
      </>
    )
  return (
    <>
      {!(
        user?.role === 'DRIVER' &&
        ['DRIVER_IDENTITY', 'VEHICLE'].includes(q.data.subjectType)
      ) && (
        <CaseRetention
          key={user!.id + ':' + id + ':retention'}
          record={q.data}
          refreshing={q.isFetching}
        />
      )}
      <CaseContent
        key={user!.id + ':' + q.data.id}
        record={q.data}
        requirements={r.data}
        runtimeReady={documentaryAvailability(r).canProceed}
      />
    </>
  )
}
function CaseContent({
  record,
  requirements,
  runtimeReady,
}: {
  record: VerificationCase
  requirements: Requirements
  runtimeReady: boolean
}) {
  const { user } = useAuth()
  const designed =
    user?.role === 'DRIVER' &&
    ['DRIVER_IDENTITY', 'VEHICLE'].includes(record.subjectType)
  const unit = record.subjectType === 'VEHICLE'
  const requiredCategories = unit
    ? [
        ...requirements.vehicle.required.filter(
          (c) =>
            c !== 'REGISTRATION_CARD' ||
            record.registrationCardRequired !== false,
        ),
        requirements.vehicle[record.data.ownershipEvidenceType || 'OWNED'],
      ]
    : [
        ...requirements.identity.required,
        ...(record.data.license
          ? [requirements.identity.motorizedLicense]
          : []),
      ]
  const completeCount = requiredCategories.filter((c) =>
    record.attachments.some(
      (a) => a.category === c && a.status === 'VALIDATED',
    ),
  ).length
  const dataComplete = unit
    ? !!(
        record.data.declaredOwnerName?.trim() &&
        record.data.serialNumber?.trim() &&
        record.data.ownershipEvidenceType
      )
    : !!(
        record.data.fullName?.trim() &&
        record.data.contactPhone?.trim() &&
        record.data.operatingCity?.trim() &&
        record.data.documentType === 'INE'
      )
  const checklistComplete =
    dataComplete && completeCount === requiredCategories.length
  const command = useCommand()
  const [confirm, setConfirm] = useState<'SUBMIT' | 'WITHDRAW' | null>(null)
  const canWrite =
    user?.role === 'PROVIDER_ADMIN' ||
    (user?.role === 'DRIVER' && record.scope.providerId === null)
  const terms = useTermsQuery(record.scope.providerId || undefined, canWrite)
  const state = documentaryAvailability(
    { data: requirements },
    canWrite ? terms : undefined,
  )

  const blocked = !runtimeReady || !state.canProceed
  const currentEvidence =
    ['LOCAL_TEST', 'PRODUCTION'].includes(record.environment) &&
    record.environment === requirements.environment &&
    record.policyVersion === requirements.policyVersion
  return (
    <div
      className={
        designed
          ? 'driver-documentary identity-case' + (unit ? ' unit-case' : '')
          : undefined
      }
    >
      {designed && <Link to="/driver/onboarding">← Mi verificación</Link>}
      <header className="identity-heading">
        <h1>
          {designed ? (
            <>
              {unit ? 'Unidad' : 'Identidad'}{' '}
              <span className={'identity-status status-' + record.status}>
                {labels[record.status]}
              </span>
            </>
          ) : (
            <>
              {labels[record.subjectType]} · {labels[record.status]}
            </>
          )}
        </h1>
        <p className={designed ? 'identity-limit-chips' : undefined}>
          <span>{provenance(record.environment)}</span>
          <span>Checklist {record.policyVersion}</span>
        </p>

        {!currentEvidence && (
          <p role="alert">
            Expediente histórico o sin procedencia vigente acreditada. Para
            continuar se requieren aceptaciones vigentes, un nuevo expediente,
            nuevas evidencias y revisión. No se copian ni borran documentos
            históricos. Puedes retirar un borrador abierto mediante la acción
            autorizada.
          </p>
        )}
        <p>
          Revisión {record.revision}. Estado documental:{' '}
          {labels[record.verificationStatus] || record.verificationStatus}.{' '}
          {record.scope.providerId
            ? 'Ámbito de flotilla'
            : 'Ámbito independiente'}
          .
        </p>
        <p>
          Conserva los servicios comprometidos. La revisión no acredita cobro ni
          modifica créditos.
        </p>
      </header>
      {designed && <Warning />}
      {record.publicReason && (
        <p role="status">Motivo de decisión: {record.publicReason}</p>
      )}
      {canWrite && !state.canProceed && (
        <p role={state.kind === 'loading' ? 'status' : 'alert'}>{state.text}</p>
      )}
      {user?.role === 'SUPER_ADMIN' && record.internalNote && (
        <p>Nota interna: {record.internalNote}</p>
      )}
      <div className={designed ? 'identity-body' : undefined}>
        <div className={designed ? 'identity-main' : undefined}>
          {canWrite && currentEvidence && record.status === 'DRAFT' ? (
            <CaseForm
              key={record.id + ':' + record.revision}
              record={record}
              designed={designed}
              disabled={blocked}
            />
          ) : (
            <section className="panel panel-body">
              <h2>Datos presentados</h2>
              <dl>
                {Object.entries(record.data)
                  .filter(([k]) => k !== 'license')
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt>
                        {(
                          {
                            fullName: 'Nombre',
                            contactPhone: 'Teléfono',
                            operatingCity: 'Ciudad',
                            documentType: 'Identificación',
                            declaredOwnerName: 'Titular',
                            serialNumber: 'Serie',
                            ownershipEvidenceType: 'Propiedad o uso',
                            authorizationExpiresAt:
                              'Vencimiento de autorización',
                          } as Record<string, string>
                        )[k] || k}
                      </dt>
                      <dd>{typeof v === 'string' ? labels[v] || v : ''}</dd>
                    </div>
                  ))}
              </dl>
              {record.data.license && (
                <p>
                  Licencia: {record.data.license.issuer} ·{' '}
                  {record.data.license.category} · vence{' '}
                  {date(record.data.license.expiresAt)} ·{' '}
                  {record.data.license.vehicleTypes.join(', ')}
                </p>
              )}
            </section>
          )}
          <Evidence
            designed={designed}
            record={record}
            requirements={requirements}
            canWrite={canWrite && currentEvidence}
            disabled={blocked}
            removalDisabled={!runtimeReady}
          />
          {canWrite && ['REJECTED', 'WITHDRAWN'].includes(record.status) && (
            <CreateCase
              area={record.scope.providerId ? 'provider' : 'driver'}
              subjectType={record.subjectType}
              resourceId={record.resourceId}
              label="Preparar nueva corrección"
              disabled={blocked}
            />
          )}
          {user?.role === 'SUPER_ADMIN' &&
            currentEvidence &&
            record.status === 'SUBMITTED' && (
              <Decision
                key={record.revision}
                record={record}
                requirements={requirements}
                disabled={!runtimeReady}
              />
            )}
          <section className="panel panel-body">
            <h2>Historial del expediente</h2>
            {!record.events.length && (
              <div className="identity-empty">
                <strong>Sin movimientos todavía</strong>
                <p>Los cambios del expediente aparecerán aquí.</p>
              </div>
            )}
            <ul className="identity-events">
              {[...record.events]
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((e) => (
                  <li key={e.id}>
                    {(
                      {
                        CREATE_CASE: 'Borrador creado',
                        UPDATE_CASE: 'Datos guardados',
                        CREATE_UPLOAD: 'Carga iniciada',
                        COMPLETE_UPLOAD: 'Formato validado',
                        REMOVE_ATTACHMENT: 'Referencia retirada',
                        SUBMIT: 'Presentado',
                        WITHDRAW: 'Retirado',
                        DECIDE: 'Decisión registrada',
                      } as Record<string, string>
                    )[e.kind] || 'Actividad registrada'}{' '}
                    · {date(e.createdAt)}
                  </li>
                ))}
            </ul>
          </section>
        </div>
        <aside className={designed ? 'identity-aside' : undefined}>
          {canWrite && ['DRAFT', 'SUBMITTED'].includes(record.status) && (
            <section className="panel panel-body identity-submit">
              {designed && (
                <>
                  <h2>Enviar expediente</h2>
                  <p>
                    Datos del borrador:{' '}
                    <strong>{dataComplete ? 'Completo' : 'Pendiente'}</strong>
                  </p>
                  <p>
                    Evidencias:{' '}
                    <strong>
                      {completeCount} de {requiredCategories.length}
                    </strong>
                  </p>
                  {record.submittedAt && (
                    <p>Enviado para revisión el {date(record.submittedAt)}</p>
                  )}
                </>
              )}
              {currentEvidence && record.status === 'DRAFT' && (
                <button
                  disabled={
                    blocked ||
                    command.blocked ||
                    command.busy ||
                    (designed && !checklistComplete)
                  }
                  onClick={() => setConfirm('SUBMIT')}
                >
                  Presentar para revisión
                </button>
              )}{' '}
              <button
                className="identity-withdraw"
                disabled={!runtimeReady || command.blocked || command.busy}
                onClick={() => setConfirm('WITHDRAW')}
              >
                Retirar expediente
              </button>
            </section>
          )}

          {designed && <CaseRetention record={record} compact />}
        </aside>
      </div>
      {confirm && (
        <Confirm
          title={
            confirm === 'SUBMIT' ? 'Presentar expediente' : 'Retirar expediente'
          }
          description={
            confirm === 'SUBMIT'
              ? 'Se congelarán esta versión y sus evidencias para revisión. Presentar no aprueba.'
              : 'No se borran archivos ni se revierte una decisión. Una corrección deberá usar un nuevo borrador.'
          }
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            if (!runtimeReady || (confirm === 'SUBMIT' && blocked))
              throw new Error(
                'Consulta los requisitos vigentes antes de continuar.',
              )
            await command.send(
              confirm,
              record.id,
              `/verification-cases/${record.id}/${confirm === 'SUBMIT' ? 'submit' : 'withdraw'}`,
              { expectedVersion: record.revision },
            )
          }}
        />
      )}
    </div>
  )
}
export function Decision({
  record,
  requirements,
  disabled,
}: {
  record: VerificationCase
  requirements: Requirements
  disabled: boolean
}) {
  const command = useCommand()
  const [decision, setDecision] = useState('APPROVE')
  const representative = record.subjectType === 'REPRESENTATIVE'
  const [confirmation, setConfirmation] = useState<Record<
    string,
    unknown
  > | null>(null)
  const required = representative
    ? requirements.representative?.checks || []
    : record.subjectType === 'VEHICLE'
      ? requirements.vehicle.checks
      : requirements.identity.checks.filter(
          (c) => record.data.license || !c.startsWith('LICENSE_'),
        )
  return (
    <section className="panel panel-body">
      <h2>Decisión SUPER_ADMIN</h2>
      <Form
        label="Registrar decisión explícita"
        disabled={disabled || command.blocked || command.busy}
        onSubmit={async (d) => {
          const passedChecks = required.filter((c) =>
            d.getAll('check').includes(c),
          )
          if (decision === 'APPROVE' && passedChecks.length !== required.length)
            throw new Error(
              'Confirma cada comprobación después de revisar las evidencias.',
            )
          if (representative) {
            if (!String(d.get('publicReason') || '').trim())
              throw new Error('Indica un motivo público de la decisión.')
            if (
              decision === 'APPROVE' &&
              (!required.length || record.data.jointSignatureRequired)
            )
              throw new Error(
                'No se puede aprobar una firma conjunta pendiente ni sin checklist vigente.',
              )
            setConfirmation({
              expectedVersion: record.revision,
              decision,
              checklistVersion: requirements.policyVersion,
              passedChecks,
              publicReason: String(d.get('publicReason')).trim(),
              ...(d.get('internalNote')
                ? { internalNote: String(d.get('internalNote')) }
                : {}),
            })
            return
          }
          return command.send(
            'DECIDE',
            record.id,
            `/admin/verification-cases/${record.id}/decision`,
            {
              expectedVersion: record.revision,
              decision,
              checklistVersion: requirements.policyVersion,
              passedChecks,
              ...(d.get('publicReason')
                ? { publicReason: String(d.get('publicReason')) }
                : {}),
              ...(d.get('internalNote')
                ? { internalNote: String(d.get('internalNote')) }
                : {}),
            },
          )
        }}
      >
        <Field label="Resultado">
          <select
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
          >
            <option value="APPROVE">Aprobar</option>
            <option value="REJECT">Rechazar</option>
          </select>
        </Field>
        {decision === 'APPROVE' &&
          required.map((c) => (
            <label className="verification-check" key={c}>
              <input name="check" type="checkbox" value={c} />
              {labels[c] || c}
            </label>
          ))}
        <Field
          label={
            representative || decision === 'REJECT'
              ? 'Motivo público *'
              : 'Motivo público'
          }
        >
          <textarea
            name="publicReason"
            required={representative || decision === 'REJECT'}
            maxLength={2000}
          />
        </Field>
        <Field label="Nota interna (sólo SUPER_ADMIN)">
          <textarea name="internalNote" maxLength={4000} />
        </Field>
      </Form>
      {confirmation && (
        <Confirm
          title="Confirmar decisión de representación"
          description={`Revisión ${record.revision}: ${confirmation.decision === 'APPROVE' ? 'acreditar representación' : 'rechazar con motivo'}. No acepta FLEET, no aprueba conductor/unidad ni activa admisión.`}
          onClose={() => setConfirmation(null)}
          onConfirm={() =>
            command
              .send(
                'DECIDE',
                record.id,
                `/admin/verification-cases/${record.id}/decision`,
                confirmation,
              )
              .then(() => undefined)
          }
        />
      )}
      <p>
        Se decide sobre la revisión {record.revision}. Un conflicto exige
        revisar de nuevo; no se reenvía automáticamente.
      </p>
    </section>
  )
}
export function ReceiptPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const q = useQuery({
    queryKey: vkey(user!.id, 'receipt', id),
    queryFn: ({ signal }) => verification.acceptance(id, signal),
    retry: false,
    gcTime: 0,
  })
  return (
    <>
      <h1>Comprobante histórico de aceptación</h1>
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <p role="alert">{message(q.error)}</p>
      ) : (
        <>
          <p>
            Versión {q.data.terms.version}, aceptada {date(q.data.acceptedAt)}.
            No reemplaza términos vigentes ni acredita aprobación documental u
            operación.
          </p>
          <p>
            {q.data.productionApplicable === true &&
            q.data.environment === 'PRODUCTION'
              ? 'Aceptación de publicación productiva registrada; no es dictamen jurídico.'
              : 'No se acredita aceptación productiva. La evidencia de prueba no habilita producción.'}
          </p>
          <TermsDocuments terms={q.data.terms} />
          {q.data.scope === 'FLEET' && (
            <p>
              {q.data.representationEvidence === 'ACCREDITED_AT_ACCEPTANCE'
                ? 'La aceptación estuvo vinculada a un expediente acreditado al registrarse.'
                : 'Aceptación histórica sin acreditación de facultades asociada.'}{' '}
              Este comprobante no demuestra facultades vigentes.
            </p>
          )}
          <p>
            Aviso reconocido:{' '}
            {q.data.privacyVersion || 'No registrado en este recibo histórico'}.
          </p>
          <p>
            Consentimientos registrados:{' '}
            {q.data.specificConsents?.map((c) => c.id).join(', ') ||
              'Ninguno registrado'}
            . Consultar el aviso no equivale a otorgarlos todos.
          </p>
        </>
      )}
    </>
  )
}
