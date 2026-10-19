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
import type { Area, SubjectType, VerificationCase, Requirements } from './types'
import './verification.css'
export function VerificationLayout() {
  const { user } = useAuth()
  const location = useLocation()
  return (
    <div className="verification-area" key={user?.id}>
      <Warning />
      <Recovery />
      <Outlet key={user?.id + ':' + location.pathname + location.search} />
    </div>
  )
}
export function DriverOnboarding() {
  const { user } = useAuth()
  const q = useQuery({
    queryKey: vkey(user!.id, 'onboarding'),
    queryFn: ({ signal }) => verification.onboarding(signal),
    retry: false,
    gcTime: 0,
  })
  return (
    <>
      <h1>Mi verificación documental</h1>
      <p>
        Autenticación, correo confirmado, aprobación documental y habilitación
        operativa son estados diferentes.
      </p>
      <EmailVerification />
      <TermsPanel />
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <p role="alert">{message(q.error)}</p>
      ) : (
        <>
          <p>
            Proveedor:{' '}
            {q.data.driver.providerId
              ? 'Vinculado a flotilla; expediente independiente separado'
              : 'Independiente sin proveedor'}
            . Perfil:{' '}
            {labels[
              q.data.driver.independentProfile?.status || q.data.driver.status
            ] || q.data.driver.status}
            .
          </p>
          <p>
            Control de nuevas asignaciones:{' '}
            {q.data.enforcementEnabled
              ? 'activo en backend, sin gracia para recursos existentes'
              : 'no activado para recursos legacy; los nuevos sin proveedor requieren revisión'}
            . La aceptación no acredita licencia, vehículo ni crédito. Consulta
            el servicio ya comprometido en{' '}
            <Link to="/driver/my-service">Mi servicio</Link>.
          </p>
          <p>
            {provenance(q.data.environment)}. Las aceptaciones y aprobaciones
            LOCAL_TEST se conservan como historia; no habilitan admisión
            productiva.
          </p>
          {q.data.terms.blockingReason && (
            <p role="alert">
              Falta una publicación vigente para este ámbito. Consulta al
              administrador antes de iniciar nuevas evidencias.
            </p>
          )}
          {!q.data.terms.acceptance && (
            <p role="status">
              Pendiente: consulta y acepta los términos vigentes antes de
              preparar evidencias. Después se requiere presentación y revisión
              manual.
            </p>
          )}
          {q.data.environment === 'PRODUCTION' &&
            q.data.subjects.some((s) =>
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
          {q.data.terms.acceptance && (
            <p>
              Comprobante personal vigente:{' '}
              <Link
                to={'/verification/acceptances/' + q.data.terms.acceptance.id}
              >
                {q.data.terms.acceptance.version}
              </Link>
            </p>
          )}
          {q.data.driver.independentProfile ? (
            <>
              <CreateCase
                area="driver"
                subjectType="DRIVER_IDENTITY"
                resourceId={q.data.driver.id}
                label="Preparar expediente de identidad independiente"
                disabled={
                  !q.data.terms.acceptance || !!q.data.terms.blockingReason
                }
              />
              <NewUnit />
              <h2>Unidades independientes</h2>
              {q.data.driver.independentProfile.vehicles.map((v) => (
                <section className="panel panel-body" key={v.id}>
                  <h3>{v.identifier}</h3>
                  <p>
                    {v.status} · {v.type}
                  </p>
                  <CreateCase
                    area="driver"
                    subjectType="VEHICLE"
                    resourceId={v.id}
                    label="Preparar expediente de esta unidad"
                    disabled={
                      !q.data.terms.acceptance || !!q.data.terms.blockingReason
                    }
                  />
                </section>
              ))}
            </>
          ) : (
            <p>
              Tu identidad de flotilla la presenta su administrador. Tu
              aceptación personal no puede sustituirla otra cuenta.
            </p>
          )}
        </>
      )}
      <CaseList area="driver" />
      <Notices area="driver" />
    </>
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
        Decisiones exclusivas SUPER_ADMIN. Identidad y unidades se revisan por
        separado.
      </p>
      <CaseList area="admin" />
    </>
  )
}
export function CaseList({
  area,
  providerId,
}: {
  area: Area
  providerId?: string
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
function Notices({ area }: { area: 'driver' | 'provider' }) {
  const { user } = useAuth()
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
        q.data.map((n) => (
          <p key={n.id}>
            <Link to={'/verification/cases/' + n.caseId}>
              {labels[n.case.status]}
            </Link>{' '}
            · {labels[n.status] || 'Estado de aviso consultado'} ·{' '}
            {date(n.createdAt)} {n.case.publicReason}
          </p>
        ))
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
  })
  const r = useQuery({
    queryKey: vkey(user!.id, 'requirements'),
    queryFn: ({ signal }) => verification.requirements(signal),
    retry: false,
    gcTime: 0,
  })
  if (q.isPending || r.isPending) return <Loading />
  if (q.isError || r.isError)
    return <p role="alert">{message(q.error || r.error)}</p>
  return (
    <CaseContent
      key={user!.id + ':' + q.data.id}
      record={q.data}
      requirements={r.data}
    />
  )
}
function CaseContent({
  record,
  requirements,
}: {
  record: VerificationCase
  requirements: Requirements
}) {
  const { user } = useAuth()
  const command = useCommand()
  const [confirm, setConfirm] = useState<'SUBMIT' | 'WITHDRAW' | null>(null)
  const canWrite =
    user?.role === 'PROVIDER_ADMIN' ||
    (user?.role === 'DRIVER' && record.scope.providerId === null)
  const currentEvidence =
    ['LOCAL_TEST', 'PRODUCTION'].includes(record.environment) &&
    record.environment === requirements.environment &&
    record.policyVersion === requirements.policyVersion
  return (
    <>
      <h1>
        {labels[record.subjectType]} · {labels[record.status]}
      </h1>
      <p>
        {provenance(record.environment)} · Checklist {record.policyVersion}.
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
      {record.publicReason && (
        <p role="status">Motivo de decisión: {record.publicReason}</p>
      )}
      {user?.role === 'SUPER_ADMIN' && record.internalNote && (
        <p>Nota interna: {record.internalNote}</p>
      )}
      {canWrite && currentEvidence && record.status === 'DRAFT' ? (
        <CaseForm key={record.id + ':' + record.revision} record={record} />
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
                        authorizationExpiresAt: 'Vencimiento de autorización',
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
        record={record}
        requirements={requirements}
        canWrite={canWrite && currentEvidence}
      />
      {canWrite && ['DRAFT', 'SUBMITTED'].includes(record.status) && (
        <section className="panel panel-body">
          {currentEvidence && record.status === 'DRAFT' && (
            <button
              disabled={command.blocked || command.busy}
              onClick={() => setConfirm('SUBMIT')}
            >
              Presentar para revisión
            </button>
          )}{' '}
          <button
            disabled={command.blocked || command.busy}
            onClick={() => setConfirm('WITHDRAW')}
          >
            Retirar expediente
          </button>
        </section>
      )}
      {canWrite && ['REJECTED', 'WITHDRAWN'].includes(record.status) && (
        <CreateCase
          area={record.scope.providerId ? 'provider' : 'driver'}
          subjectType={record.subjectType}
          resourceId={record.resourceId}
          label="Preparar nueva corrección"
        />
      )}
      {user?.role === 'SUPER_ADMIN' &&
        currentEvidence &&
        record.status === 'SUBMITTED' && (
          <Decision
            key={record.revision}
            record={record}
            requirements={requirements}
          />
        )}
      <section className="panel panel-body">
        <h2>Historial del expediente</h2>
        <ul>
          {record.events.map((e) => (
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
            await command.send(
              confirm,
              record.id,
              `/verification-cases/${record.id}/${confirm === 'SUBMIT' ? 'submit' : 'withdraw'}`,
              { expectedVersion: record.revision },
            )
          }}
        />
      )}
    </>
  )
}
function Decision({
  record,
  requirements,
}: {
  record: VerificationCase
  requirements: Requirements
}) {
  const command = useCommand()
  const [decision, setDecision] = useState('APPROVE')
  const required =
    record.subjectType === 'VEHICLE'
      ? requirements.vehicle.checks
      : requirements.identity.checks.filter(
          (c) => record.data.license || !c.startsWith('LICENSE_'),
        )
  return (
    <section className="panel panel-body">
      <h2>Decisión SUPER_ADMIN</h2>
      <Form
        label="Registrar decisión explícita"
        disabled={command.blocked || command.busy}
        onSubmit={(d) => {
          const passedChecks = required.filter((c) =>
            d.getAll('check').includes(c),
          )
          if (decision === 'APPROVE' && passedChecks.length !== required.length)
            throw new Error(
              'Confirma cada comprobación después de revisar las evidencias.',
            )
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
          label={decision === 'REJECT' ? 'Motivo público *' : 'Motivo público'}
        >
          <textarea
            name="publicReason"
            required={decision === 'REJECT'}
            maxLength={2000}
          />
        </Field>
        <Field label="Nota interna (sólo SUPER_ADMIN)">
          <textarea name="internalNote" maxLength={4000} />
        </Field>
      </Form>
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
