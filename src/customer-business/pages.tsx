import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/context'
import {
  ActionForm,
  Confirm,
  Empty,
  ErrorPage,
  ErrorState,
  Field,
  Loading,
  PageTitle,
  Table,
} from '../components/ui'
import { ApiError, normalizeError } from '../services/errors'
import { customer } from '../customer/service'
import { date as formatDate } from '../utils/format'
import { business } from './service'
import {
  accessLabels,
  applicationLabels,
  hasBusinessContract,
  type AdminApplication,
  type Administration,
  type Application,
  type ApplicationStatus,
  type BusinessAccess,
  type Intention,
  type Receipt,
} from './contract'
import {
  hasOriginalBody,
  recoverBusiness,
  startBusiness,
  useBusinessMarkers,
} from './pending'
import './business.css'

export function AccessSummary({ access }: { access: BusinessAccess }) {
  return (
    <section className="panel business-panel">
      <h2>{accessLabels[access.state] ?? 'Contrato incompatible'}</h2>
      {access.state === 'REVIEW_REQUIRED' && (
        <p>
          Tu cuenta Negocio existente requiere revisión obligatoria. No se
          concedió aprobación automática.
        </p>
      )}
      {access.state === 'RESTRICTED' && (
        <p>
          El acceso comercial está restringido. Puedes consultar tus servicios y
          continuar las operaciones ya comprometidas que autorice Mandaria.
        </p>
      )}
      {access.reapplicationBlocked && (
        <p role="status">
          Sólo SUPER_ADMIN puede habilitar una nueva solicitud. Cambiar a
          Personal no elimina este bloqueo.
        </p>
      )}
      <p>
        Negocio no concede una integración B2B, proveedor, repartidor ni
        permisos operativos.
      </p>
    </section>
  )
}
function ReceiptView({ receipt }: { receipt: Receipt }) {
  return (
    <section className="notice" role="status">
      <h3>Resultado original del intento</h3>
      <p>
        {receipt.outcome === 'CLOSED'
          ? 'Intento cerrado. No cancela servicios ni revierte operaciones ya aplicadas.'
          : receipt.outcome === 'REJECTED'
            ? 'El comando fue rechazado. No significa que la solicitud comercial haya sido rechazada.'
            : receipt.result.applicationStatus === 'REJECTED'
              ? 'El rechazo administrativo se registró correctamente.'
              : 'Operación registrada correctamente.'}
      </p>
      {receipt.code && (
        <p>{normalizeError(409, { code: receipt.code }).message}</p>
      )}
      <p>
        {formatDate(receipt.committedAt)}. Este recibo es histórico; las
        secciones de abajo muestran el estado vigente consultado.
      </p>
    </section>
  )
}
function Operations({
  account,
  children,
}: {
  account: string
  children: (
    prepare: (intent: Intention) => void,
    blocked: boolean,
  ) => ReactNode
}) {
  const { user } = useAuth(),
    { markers, error: storageError } = useBusinessMarkers()
  const pending = markers.find((m) => m.account === account)
  const [intent, setIntent] = useState<Intention | null>(null),
    [close, setClose] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [receipt, setReceipt] = useState<Receipt | null>(null),
    [unknown, setUnknown] = useState(false),
    [retryAt, setRetryAt] = useState(0),
    [now, setNow] = useState(Date.now)
  const lock = useRef(false),
    alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  useEffect(() => {
    if (!retryAt) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [retryAt])
  const cooldown = Math.max(0, Math.ceil((retryAt - now) / 1000))
  const blocked = busy || !!pending || !!storageError || cooldown > 0
  async function execute(work: () => Promise<Receipt | null>) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError(undefined)
    try {
      const r = await work()
      if (alive.current) {
        setReceipt(r)
        setUnknown(!r)
      }
    } catch (e) {
      if (alive.current) {
        setError(e)
        setUnknown(true)
        if (e instanceof ApiError && e.retryAfterMs > 0) {
          setRetryAt(Date.now() + e.retryAfterMs)
          setNow(Date.now())
        }
      }
    } finally {
      lock.current = false
      if (alive.current) setBusy(false)
    }
  }
  return (
    <>
      {receipt && <ReceiptView receipt={receipt} />}
      {!!(storageError || error) && (
        <ErrorState error={storageError || error} />
      )}
      {cooldown > 0 && (
        <p role="status">
          Espera {cooldown} s según Retry-After antes de reenviar.
        </p>
      )}
      {pending && (
        <section
          className="notice business-panel"
          aria-label="Recuperación comercial"
        >
          <h2>Pendiente de reconciliación</h2>
          <p>
            No repitas la operación con otra clave. No encontrar un recibo
            todavía no demuestra que haya fallado.
          </p>
          {unknown && (
            <p>
              El resultado no pudo confirmarse. El bloqueo se conserva también
              al recargar.
            </p>
          )}
          {pending.actor !== user?.id ? (
            <p>
              Sólo la identidad que inició este intento puede consultarlo o
              cerrarlo. No se enviarán operaciones desde esta sesión para eludir
              el bloqueo.
            </p>
          ) : (
            <div className="form-actions">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  void execute(() => recoverBusiness(user.id, pending.key))
                }
              >
                Consultar intento original
              </button>
              {hasOriginalBody(pending.key) && (
                <button
                  className="button secondary"
                  disabled={busy || cooldown > 0}
                  onClick={() =>
                    void execute(() =>
                      recoverBusiness(user.id, pending.key, 'replay'),
                    )
                  }
                >
                  Reenviar exactamente el original
                </button>
              )}
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setClose(true)}
              >
                Cerrar intento explícitamente
              </button>
            </div>
          )}
        </section>
      )}
      {children((next) => {
        if (!blocked) {
          setReceipt(null)
          setIntent(structuredClone(next))
        }
      }, blocked)}
      {intent && (
        <Confirm
          title="Confirmar operación comercial"
          description="Se enviarán estos datos con las revisiones consultadas. Mandaria comprobará las condiciones actuales; no se aplicará ni repetirá automáticamente otra intención."
          label="Confirmar operación"
          onClose={() => setIntent(null)}
          onConfirm={async () => {
            const original = intent
            setIntent(null)
            await execute(() => startBusiness(user!.id, account, original))
          }}
        />
      )}
      {close && pending && (
        <Confirm
          title="¿Cerrar el intento original?"
          description="El cierre impide que una petición tardía aplique esta intención. Si ya se aplicó, se recuperará su recibo. No cancela servicios ni revierte operaciones. Una respuesta perdida mantiene el bloqueo hasta consultar."
          label="Confirmar cierre"
          onClose={() => setClose(false)}
          onConfirm={async () => {
            setClose(false)
            await execute(() => recoverBusiness(user!.id, pending.key, 'close'))
          }}
        />
      )}
    </>
  )
}
export function BusinessCustomerPage() {
  const { user } = useAuth()
  return <CustomerContent key={user?.id} />
}
function CustomerContent() {
  const { user } = useAuth(),
    { id } = useParams()
  const profile = useQuery({
    queryKey: ['customer', user?.id, 'profile'],
    queryFn: customer.profile,
    retry: false,
  })
  const cap = useQuery({
    queryKey: ['customer', user?.id, 'capabilities'],
    queryFn: customer.capabilities,
    enabled: !!profile.data,
    retry: false,
  })
  const detail = useQuery({
    queryKey: ['business', user?.id, 'detail', id],
    queryFn: () => business.detail(id!),
    enabled: !!id && !!profile.data,
    retry: false,
  })
  if (profile.isPending) return <Loading />
  if (profile.isError)
    return (
      <>
        <ErrorState error={profile.error} />
        <Link to="/customer/profile">
          Verificar correo o anexar perfil Personal
        </Link>
      </>
    )
  const p = profile.data
  if (
    !hasBusinessContract(p) ||
    !Number.isInteger(p.revision) ||
    p.revision < 1
  )
    return <Incompatible />
  const ready =
    hasBusinessContract(cap.data) &&
    cap.data.customerAccountId === p.customerAccountId &&
    !cap.isFetching &&
    !cap.isError &&
    !profile.isFetching
  return (
    <div className="business-page">
      <PageTitle
        title="Cuenta Negocio"
        description="Solicita acceso comercial sujeto a revisión administrativa."
        back="/customer/profile"
      />
      <AccessSummary access={p.businessAccess} />
      {cap.isError && <ErrorState error={cap.error} />}
      {!cap.isPending && !hasBusinessContract(cap.data) && <Incompatible />}
      <Operations account={p.customerAccountId}>
        {(prepare, blocked) => (
          <>
            {id ? (
              detail.isPending ? (
                <Loading />
              ) : detail.isError ? (
                <ErrorState error={detail.error} />
              ) : (
                <>
                  <ApplicationInfo application={detail.data} />
                  {detail.data.status === 'PENDING' && (
                    <button
                      className="button secondary"
                      disabled={blocked || !ready || detail.isFetching}
                      onClick={() =>
                        prepare({
                          operation: 'WITHDRAW',
                          target: detail.data.id,
                          body: {
                            expectedApplicationRevision: detail.data.revision,
                          },
                        })
                      }
                    >
                      Retirar solicitud
                    </button>
                  )}
                  {['REJECTED', 'WITHDRAWN'].includes(detail.data.status) && (
                    <p>
                      Este registro no se modifica.{' '}
                      <Link to="/customer/business">
                        Preparar una nueva solicitud con datos corregidos
                      </Link>
                      .
                    </p>
                  )}
                </>
              )
            ) : (
              <>
                {p.businessAccess.canApply &&
                !p.businessAccess.reapplicationBlocked ? (
                  <section className="panel business-panel">
                    <h2>Solicitar cuenta Negocio</h2>
                    <p>
                      Se reutilizará tu correo verificado. El volumen estimado
                      no calcula precio, cuota ni cobertura.
                    </p>
                    <ActionForm
                      initialDirty
                      submitLabel="Revisar solicitud"
                      submitDisabled={blocked || !ready}
                      onSubmit={async (d) => {
                        const text = (key: string) =>
                          String(d.get(key) ?? '').trim()
                        for (const [key, max] of [
                          ['businessName', 160],
                          ['activity', 500],
                          ['city', 100],
                          ['estimatedDeliveryVolume', 100],
                        ] as const)
                          if (!text(key) || text(key).length > max)
                            throw new ApiError(
                              400,
                              'Completa los campos obligatorios y sus límites.',
                            )
                        const note = text('note')
                        if (note.length > 1000)
                          throw new ApiError(
                            400,
                            'La nota admite hasta 1000 caracteres.',
                          )
                        prepare({
                          operation: 'SUBMIT',
                          body: {
                            expectedAccountRevision: p.revision,
                            businessName: text('businessName'),
                            activity: text('activity'),
                            city: text('city'),
                            estimatedDeliveryVolume: text(
                              'estimatedDeliveryVolume',
                            ),
                            ...(note ? { note } : {}),
                          },
                        })
                      }}
                    >
                      <Field label="Nombre del negocio *">
                        <input
                          name="businessName"
                          required
                          maxLength={160}
                          defaultValue={p.businessName ?? ''}
                        />
                      </Field>
                      <Field label="Actividad *">
                        <textarea name="activity" required maxLength={500} />
                      </Field>
                      <Field label="Ciudad *">
                        <input name="city" required maxLength={100} />
                      </Field>
                      <Field
                        label="Volumen estimado de envíos *"
                        hint="Indica cantidad y periodo; no es una cuota contratada."
                      >
                        <input
                          name="estimatedDeliveryVolume"
                          required
                          maxLength={100}
                        />
                      </Field>
                      <Field label="Nota (opcional)">
                        <textarea name="note" maxLength={1000} />
                      </Field>
                    </ActionForm>
                  </section>
                ) : (
                  <p>
                    No puedes presentar otra solicitud ahora. Revisa el acceso y
                    la solicitud vigente.
                  </p>
                )}
                {p.businessApplication && (
                  <p>
                    Solicitud {applicationLabels[p.businessApplication.status]}:{' '}
                    <Link to={'/customer/business/' + p.businessApplication.id}>
                      Consultar detalle
                    </Link>
                  </p>
                )}
              </>
            )}
            {p.businessAccess.canDowngrade && (
              <section className="panel business-panel">
                <h2>Cambiar a Personal</h2>
                <p>
                  Requiere cero solicitudes abiertas. No modifica contratos
                  anteriores ni elimina un bloqueo administrativo de readmisión.
                </p>
                <button
                  className="button secondary"
                  disabled={blocked || !ready}
                  onClick={() =>
                    prepare({
                      operation: 'DOWNGRADE',
                      target: p.customerAccountId,
                      body: { type: 'PERSONAL', expectedRevision: p.revision },
                    })
                  }
                >
                  Preparar descenso a Personal
                </button>
              </section>
            )}
          </>
        )}
      </Operations>
      <ApplicationList admin={false} />
    </div>
  )
}
function Incompatible() {
  return (
    <p role="alert" className="notice">
      El servidor no expone el contrato comercial compatible. Las nuevas
      acciones comerciales están bloqueadas; tus servicios existentes siguen
      disponibles en <Link to="/customer">Mis envíos</Link>.
    </p>
  )
}
function ApplicationInfo({ application: a }: { application: Application }) {
  return (
    <section className="panel business-panel">
      <h2>{a.snapshot.businessName}</h2>
      <p>
        Solicitud {applicationLabels[a.status]} · {formatDate(a.submittedAt)}
      </p>
      <dl>
        <dt>Actividad</dt>
        <dd>{a.snapshot.activity}</dd>
        <dt>Ciudad</dt>
        <dd>{a.snapshot.city}</dd>
        <dt>Volumen estimado</dt>
        <dd>{a.snapshot.estimatedDeliveryVolume}</dd>
        {a.snapshot.note && (
          <>
            <dt>Nota de solicitud</dt>
            <dd>{a.snapshot.note}</dd>
          </>
        )}
        {a.publicReason && (
          <>
            <dt>Motivo público</dt>
            <dd>{a.publicReason}</dd>
          </>
        )}
        {a.resolvedAt && (
          <>
            <dt>Resolución</dt>
            <dd>{formatDate(a.resolvedAt)}</dd>
          </>
        )}
      </dl>
      <p>
        El estado histórico de esta solicitud no acredita acceso Negocio
        vigente.
      </p>
    </section>
  )
}
function ApplicationList({ admin }: { admin: boolean }) {
  const { user } = useAuth(),
    [page, setPage] = useState(1),
    [status, setStatus] = useState<ApplicationStatus | ''>(''),
    [account, setAccount] = useState(''),
    [accountDraft, setAccountDraft] = useState('')
  const q = useQuery({
    queryKey: [
      'business',
      user?.id,
      admin ? 'admin-list' : 'list',
      page,
      status,
      account,
    ],
    queryFn: () =>
      business.list(admin, page, status || undefined, account || undefined),
    retry: false,
  })
  return (
    <section className="panel business-panel">
      <h2>
        {admin ? 'Solicitudes de cuenta Negocio' : 'Historial de solicitudes'}
      </h2>
      <div className="business-filters">
        <Field label="Estado de solicitud">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ApplicationStatus | '')
              setPage(1)
            }}
          >
            <option value="">Todos</option>
            {Object.entries(applicationLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        {admin && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setAccount(accountDraft.trim())
              setPage(1)
            }}
          >
            <Field
              label="Filtrar por cuenta cliente"
              hint="Identificador de cuenta obtenido del detalle; no es un grant."
            >
              <input
                value={accountDraft}
                onChange={(e) => setAccountDraft(e.target.value)}
                pattern="[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}"
              />
            </Field>
            <button className="button secondary">Aplicar filtro</button>
          </form>
        )}
      </div>
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorState error={q.error} retry={() => void q.refetch()} />
      ) : (
        <>
          <Table
            stacked
            rows={q.data.items}
            columns={[
              {
                label: 'Negocio',
                render: (a) => (
                  <Link
                    to={
                      (admin
                        ? '/admin/customer-business-applications/'
                        : '/customer/business/') + a.id
                    }
                  >
                    {a.snapshot.businessName}
                  </Link>
                ),
              },
              { label: 'Estado', render: (a) => applicationLabels[a.status] },
              { label: 'Fecha', render: (a) => formatDate(a.submittedAt) },
            ]}
          />
          <nav
            className="form-actions"
            aria-label="Paginación de solicitudes Negocio"
          >
            <span>
              {q.data.total} registros · Página {q.data.page} de{' '}
              {Math.max(1, Math.ceil(q.data.total / q.data.pageSize))}
            </span>
            <button
              className="button secondary"
              disabled={q.isFetching || page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </button>
            <button
              className="button secondary"
              disabled={q.isFetching || page * q.data.pageSize >= q.data.total}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
            </button>
          </nav>
        </>
      )}
    </section>
  )
}
export function BusinessAdminPage() {
  const { user } = useAuth()
  if (user?.role !== 'SUPER_ADMIN') return <ErrorPage code={403} />
  return (
    <div className="business-page">
      <PageTitle
        title="Cuentas Negocio"
        description="Revisión comercial independiente de solicitudes de socios y proveedores."
      />
      <ApplicationList key={user.id} admin />
    </div>
  )
}
export function BusinessAdminDetail() {
  const { user } = useAuth()
  if (user?.role !== 'SUPER_ADMIN') return <ErrorPage code={403} />
  return <AdminContent key={user.id} />
}
function AdminContent() {
  const { user } = useAuth(),
    { id, accountId } = useParams()
  const app = useQuery({
    queryKey: ['business', user?.id, 'admin-detail', id],
    queryFn: () => business.adminDetail(id!),
    enabled: !!id,
    retry: false,
  })
  const account = accountId ?? app.data?.customerAccount.id
  const access = useQuery({
    queryKey: ['business', user?.id, 'access', account],
    queryFn: () => business.access(account!),
    enabled: !!account,
    retry: false,
  })
  if (app.isError || access.isError)
    return <ErrorState error={app.error || access.error} />
  if ((id && app.isPending) || access.isPending) return <Loading />
  if (!access.data || !account) return <Empty />
  const a = access.data,
    c = a.customerAccount
  if (
    c.id !== account ||
    !Number.isInteger(c.revision) ||
    c.revision < 1 ||
    !a.businessAccessAdministration ||
    typeof a.businessAccessAdministration.canRevoke !== 'boolean' ||
    typeof a.businessAccessAdministration.canAllowReapplication !== 'boolean' ||
    a.businessAccessAdministration.activeGrant === undefined ||
    a.businessAccessAdministration.lastAdministrativeRevocation === undefined ||
    !hasBusinessContract({
      customerAccountId: c.id,
      businessAccess: c.businessAccess,
      businessApplication: null,
    })
  )
    return <Incompatible />
  const stale = access.isFetching || app.isFetching
  return (
    <div className="business-page">
      <PageTitle
        title="Revisión de cuenta Negocio"
        back="/admin/customer-business-applications"
      />
      <AccessSummary access={c.businessAccess} />
      <section className="panel business-panel">
        <h2>Estado actual de la cuenta</h2>
        <p>
          {c.verifiedEmail ?? 'Sin correo verificado'} ·{' '}
          {c.type === 'PERSONAL' ? 'Personal' : 'Negocio'}
        </p>
        <p>Cuenta: {c.id}</p>
        <p>
          Solicitudes operativas abiertas: {c.activeRequestCount}. Incluye
          conversiones pendientes de aceptación. El servidor decide la condición
          de aprobación atómicamente.
        </p>
        <Link to={'/admin/customer-business-access/' + c.id}>
          Consultar acceso administrativo
        </Link>
      </section>
      {app.data && (
        <>
          <ApplicationInfo application={app.data} />
          {app.data.internalNote && (
            <section className="panel business-panel">
              <h2>Nota interna administrativa</h2>
              <p>{app.data.internalNote}</p>
            </section>
          )}
        </>
      )}
      <Operations account={c.id}>
        {(prepare, blocked) => (
          <>
            {app.data?.status === 'PENDING' && (
              <DecisionForm
                key={app.data.id + ':' + app.data.revision + ':' + c.revision}
                app={app.data}
                access={a}
                disabled={blocked || stale}
                prepare={prepare}
              />
            )}
            <AdministrationActions
              access={a}
              disabled={blocked || stale}
              prepare={prepare}
            />
          </>
        )}
      </Operations>
    </div>
  )
}
function DecisionForm({
  app,
  access,
  disabled,
  prepare,
}: {
  app: AdminApplication
  access: Administration
  disabled: boolean
  prepare: (i: Intention) => void
}) {
  const [decision, setDecision] = useState<'APPROVE' | 'REJECT'>('APPROVE')
  return (
    <section className="panel business-panel">
      <h2>Decidir solicitud</h2>
      <ActionForm
        initialDirty
        submitLabel="Revisar decisión"
        submitDisabled={
          disabled ||
          (decision === 'APPROVE' &&
            access.customerAccount.activeRequestCount > 0)
        }
        onSubmit={async (d) => {
          const publicReason = String(d.get('publicReason') ?? '').trim(),
            internalNote = String(d.get('internalNote') ?? '').trim()
          if (decision === 'REJECT' && !publicReason)
            throw new ApiError(400, 'Indica el motivo público del rechazo.')
          prepare({
            operation: 'DECIDE',
            target: app.id,
            body: {
              decision,
              expectedApplicationRevision: app.revision,
              expectedAccountRevision: access.customerAccount.revision,
              ...(publicReason ? { publicReason } : {}),
              ...(internalNote ? { internalNote } : {}),
            },
          })
        }}
      >
        <Field label="Decisión">
          <select
            value={decision}
            onChange={(e) =>
              setDecision(e.target.value === 'REJECT' ? 'REJECT' : 'APPROVE')
            }
          >
            <option value="APPROVE">Aprobar</option>
            <option value="REJECT">Rechazar</option>
          </select>
        </Field>
        <ReasonFields required={decision === 'REJECT'} />
      </ActionForm>
      {access.customerAccount.activeRequestCount > 0 && (
        <p>
          No se puede aprobar con solicitudes abiertas. No habrá activación
          parcial ni automática posterior.
        </p>
      )}
    </section>
  )
}
function ReasonFields({ required = true }: { required?: boolean }) {
  return (
    <>
      <Field label={'Motivo público' + (required ? ' *' : ' (opcional)')}>
        <textarea name="publicReason" maxLength={500} required={required} />
      </Field>
      <Field label="Nota interna (sólo administración)">
        <textarea name="internalNote" maxLength={2000} />
      </Field>
    </>
  )
}
function AdministrationActions({
  access,
  disabled,
  prepare,
}: {
  access: Administration
  disabled: boolean
  prepare: (i: Intention) => void
}) {
  const { customerAccount: c, businessAccessAdministration: a } = access
  return (
    <section className="panel business-panel">
      <h2>Acceso administrativo</h2>
      {a.activeGrant ? (
        <p>Grant activo desde {formatDate(a.activeGrant.grantedAt)}.</p>
      ) : (
        <p>Sin grant activo.</p>
      )}
      {a.lastAdministrativeRevocation && (
        <p>
          Última revocación:{' '}
          {formatDate(a.lastAdministrativeRevocation.revokedAt)}.{' '}
          {a.lastAdministrativeRevocation.publicReason}
          {a.lastAdministrativeRevocation.reapplicationAllowedAt &&
            ' Readmisión habilitada: ' +
              formatDate(a.lastAdministrativeRevocation.reapplicationAllowedAt)}
        </p>
      )}
      {a.canRevoke && a.activeGrant && (
        <ActionForm
          initialDirty
          submitLabel="Revisar revocación"
          submitDisabled={disabled}
          onSubmit={async (d) => {
            const publicReason = String(d.get('publicReason') ?? '').trim(),
              internalNote = String(d.get('internalNote') ?? '').trim()
            if (!publicReason)
              throw new ApiError(400, 'Indica el motivo público.')
            prepare({
              operation: 'REVOKE',
              target: c.id,
              body: {
                grantId: a.activeGrant!.id,
                expectedAccountRevision: c.revision,
                publicReason,
                ...(internalNote ? { internalNote } : {}),
              },
            })
          }}
        >
          <p>
            Revocar restringe nueva demanda y bloquea nuevas solicitudes Negocio
            hasta habilitación administrativa. No cancela servicios
            comprometidos.
          </p>
          <ReasonFields />
        </ActionForm>
      )}
      {a.canAllowReapplication && a.lastAdministrativeRevocation && (
        <ActionForm
          initialDirty
          submitLabel="Revisar habilitación de nueva solicitud"
          submitDisabled={disabled}
          onSubmit={async (d) => {
            const publicReason = String(d.get('publicReason') ?? '').trim(),
              internalNote = String(d.get('internalNote') ?? '').trim()
            if (!publicReason)
              throw new ApiError(400, 'Indica el motivo público.')
            prepare({
              operation: 'ALLOW_REAPPLICATION',
              target: c.id,
              body: {
                revokedGrantId: a.lastAdministrativeRevocation!.grantId,
                expectedAccountRevision: c.revision,
                publicReason,
                ...(internalNote ? { internalNote } : {}),
              },
            })
          }}
        >
          <p>
            Habilitar readmisión permite presentar una nueva solicitud. No
            aprueba ni reactiva Negocio.
          </p>
          <ReasonFields />
        </ActionForm>
      )}
    </section>
  )
}
