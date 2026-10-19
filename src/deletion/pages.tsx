import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, Outlet, useNavigate, useParams } from 'react-router-dom'
import { useAuth, useActorId } from '../auth/context'
import { Field, Loading, Modal } from '../components/ui'
import { verification } from '../verification/service'
import { providers } from '../providers/service'
import { vehicles } from '../vehicles/service'
import { date } from '../utils/format'
import {
  scopes,
  label,
  states,
  reasons,
  tasks,
  message,
  known,
  terminal,
  uuid,
  type Scope,
  type Snapshot,
  type CreateBody,
} from './contract'
import { deletion } from './service'
import { useRead, useSend } from './hooks'
import { useMarkers, accept } from './pending'
import type { CommandReceipt } from './receipt'
import { date as receiptDate } from '../utils/format'
import { AdminActions } from './review'
import { OperationalStatus } from './operational'
import './privacy.css'

export function PrivacyForm({
  children,
  label,
  onSubmit,
  disabled = false,
}: {
  children: ReactNode
  label: string
  onSubmit: (data: FormData) => Promise<unknown>
  disabled?: boolean
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [done, setDone] = useState(false)
  const lock = useRef(false),
    alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  return (
    <form
      aria-busy={busy}
      onSubmit={async (event) => {
        event.preventDefault()
        if (lock.current || disabled) return
        lock.current = true
        const form = event.currentTarget,
          data = new FormData(form)
        setBusy(true)
        setError('')
        setDone(false)
        try {
          await onSubmit(data)
          if (alive.current) setDone(true)
        } catch (e) {
          if (alive.current) setError(message(e))
        } finally {
          form
            .querySelectorAll<HTMLInputElement>('input[type=password]')
            .forEach((input) => {
              input.value = ''
            })
          lock.current = false
          if (alive.current) setBusy(false)
        }
      }}
    >
      <fieldset disabled={busy || disabled}>
        {children}
        <button className="button" type="submit">
          {busy ? 'Esperando respuesta…' : label}
        </button>
      </fieldset>
      {error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}
      {done && (
        <p role="status">
          Respuesta recibida. Consulta el estado y alcance confirmados abajo; no
          equivale a eliminación total.
        </p>
      )}
    </form>
  )
}
export function PrivacyLayout() {
  const { user, restricted, logout } = useAuth()
  const actor = useActorId()
  return (
    <main className="privacy-area" key={actor ?? 'private'}>
      <nav aria-label="Privacidad">
        <Link to="/privacy/deletion">Mis solicitudes</Link>
        <Link to="/privacy/deletion-access">Canal privado sin sesión</Link>
        {user?.role === 'SUPER_ADMIN' && (
          <Link to="/admin/privacy/deletion">Revisión administrativa</Link>
        )}
        {!restricted && <Link to="/dashboard">Volver al panel</Link>}
        {restricted?.capabilities.activeDeliveryResolution && (
          <Link to="/privacy/active-service">Servicio comprometido</Link>
        )}
        {restricted && (
          <button className="button secondary" onClick={() => void logout()}>
            Cerrar sesión
          </button>
        )}
      </nav>
      <p className="notice">
        Prueba local, sólo datos sintéticos. Una solicitud aceptada no acredita
        eliminación. El drenaje real de Spaces sigue pendiente; no se garantiza
        borrado de respaldos.
      </p>
      {restricted && (
        <p role="status">
          Identidad autenticada con acceso restringido por baja. Sólo
          seguimiento y resolución del servicio comprometido cuando el servidor
          la autoriza. No habilita nuevas asignaciones ni expedientes.
        </p>
      )}
      <Outlet key={actor} />
    </main>
  )
}
export function Status({
  data: s,
  receipt = false,
}: {
  data: Snapshot
  receipt?: boolean
}) {
  const evidence =
    receipt &&
    s.fullErasureAttested === false &&
    ['CONTROLLED_OPERATIONAL_SCOPE', 'PARTIAL_CONTROLLED_SUBSCOPES'].includes(
      s.evidenceLevel ?? '',
    )
  return (
    <section
      className="panel panel-body"
      aria-label={receipt ? 'Constancia del backend' : 'Estado de solicitud'}
    >
      <h2>
        {receipt
          ? evidence
            ? 'Constancia de alcance limitado'
            : 'Constancia no reconocida; requiere revisión'
          : 'Seguimiento'}
      </h2>
      <OperationalStatus data={s} receipt={receipt} />
      <dl>
        <dt>Folio</dt>
        <dd>{s.id}</dd>
        <dt>Alcance</dt>
        <dd>
          {label(scopes, s.scope) ??
            'Alcance no reconocido; sin acciones habilitadas'}
        </dd>
        <dt>Estado</dt>
        <dd>
          {label(states, s.status) ??
            'Estado no reconocido. Se conserva el resultado; actualiza o utiliza el canal asistido disponible.'}
        </dd>
        <dt>Revisión</dt>
        <dd>{s.revision}</dd>
        <dt>Solicitud recibida</dt>
        <dd>{date(s.receivedAt)}</dd>
        <dt>Restricciones confirmadas</dt>
        <dd>
          {s.confirmedAt
            ? date(s.confirmedAt)
            : 'Sin acreditación de identidad/facultades y restricciones todavía'}
        </dd>
        <dt>Plazo operativo informado</dt>
        <dd>
          {s.deadline ? date(s.deadline) : 'No informado por el servidor'}
        </dd>
        <dt>Plazo de sustitución informado</dt>
        <dd>
          {s.replacementDeadline
            ? date(s.replacementDeadline)
            : 'No informado por el servidor'}
        </dd>
        <dt>Cierre operativo / H registrado</dt>
        <dd>
          {s.closedAt
            ? date(s.closedAt)
            : 'Pendiente; la recepción no equivale a cierre'}
        </dd>
        <dt>Subámbitos documentales acreditados</dt>
        <dd>{s.completedDocumentaryScopes}</dd>
        <dt>Auditoría hasta</dt>
        <dd>{s.auditUntil ? date(s.auditUntil) : 'No informado'}</dd>
        <dt>Contacto hasta</dt>
        <dd>{s.contactUntil ? date(s.contactUntil) : 'No informado'}</dd>
      </dl>
      {s.blockingReason && (
        <p className="notice">
          {label(reasons, s.blockingReason) ??
            'Hay un pendiente que requiere revisión autorizada. No se exponen detalles internos.'}
        </p>
      )}
      <p>
        <strong>
          Los respaldos del proveedor no están acreditados como eliminados. No
          se certifica eliminación total.
        </strong>{' '}
        La entrega fallida de un aviso no invalida un hito registrado. No se
        calculan ni reinician plazos al consultar.
      </p>
      {evidence && (
        <p>
          {s.evidenceLevel === 'PARTIAL_CONTROLLED_SUBSCOPES'
            ? 'Esta constancia sólo acredita los subámbitos documentales comprobados. El resto sigue pendiente.'
            : 'Esta constancia acredita el cierre del alcance operativo controlado; no todos los respaldos ni copias externas.'}{' '}
          El contrato no expone firma, PDF, versión de política ni fechas
          individuales de los subhitos.
        </p>
      )}
      {!receipt && (
        <p>
          Esta vista es seguimiento y acuse de recepción; la constancia se
          consulta por separado cuando el backend la permite.
        </p>
      )}
      {s.pendingActions === undefined ? (
        <p>Esta respuesta no incluye el detalle de acciones pendientes.</p>
      ) : (
        <>
          <h3>Pendientes comunicables</h3>
          {s.pendingActions.length ? (
            <ul>
              {s.pendingActions.map((t, i) => (
                <li key={i}>
                  {label(tasks, t.kind) ?? 'Acción pendiente de revisión'} —{' '}
                  {t.dueAt ? date(t.dueAt) : 'Sin fecha informada'}
                </li>
              ))}
            </ul>
          ) : (
            <p>
              Sin tareas informadas en esta respuesta. Esto no certifica
              eliminación total.
            </p>
          )}
        </>
      )}
    </section>
  )
}
const consequences: Record<Scope, string> = {
  ACCOUNT:
    'Se restringirá la cuenta personal y la documentación aplicable. No se eliminan automáticamente la flotilla, servicios, créditos ni historia logística. Los servicios comprometidos requieren resolución y sólo conservan acciones autorizadas.',
  PERSONAL_DOCUMENTS:
    'Se restringe la documentación personal aplicable, sin cerrar la cuenta. Los vínculos o recursos compartidos se revisan por separado.',
  INDEPENDENT_SCOPE:
    'Se retira el ámbito independiente. La cuenta y la relación con una flotilla continúan fuera de este alcance.',
  FLEET_LINK:
    'Se restringe el vínculo con esta flotilla; no se cierra tu cuenta personal ni se reescribe la historia logística.',
  VEHICLE:
    'Se solicita el retiro de esta unidad. La autoridad se comprueba de forma asistida; otros recursos y cuentas no se cierran automáticamente.',
  ORGANIZATION:
    'Se solicita la baja de la flotilla y revisión de sus expedientes. Requiere comprobación de facultades; no cierra cuentas personales.',
  REPRESENTATIVE:
    'Se retira tu pertenencia como representante. Puede ser irreversible desde la confirmación. No elimina toda la flotilla ni los documentos de otras personas.',
}
function References() {
  const refresh = useSend().refresh
  const [historical, setHistorical] = useState<CommandReceipt | null>(null)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  const { user } = useAuth(),
    markers = useMarkers(),
    [error, setError] = useState(''),
    [reading, setReading] = useState(false)
  const actor = useActorId()
  const own = markers.items.filter((m) => m.actor === actor)
  return (
    <section>
      <h2>Referencias de este navegador</h2>
      {markers.unavailable && (
        <p role="alert">
          No se pueden leer las referencias locales. No envíes otra solicitud;
          conserva el almacenamiento para su revisión.
        </p>
      )}
      {own.length === 0 ? (
        <p>
          No hay referencias guardadas para esta cuenta. Puedes consultar un
          folio conocido; esto no prueba que no existan solicitudes.
        </p>
      ) : (
        own.map((m) => (
          <div key={m.key} className="notice">
            <p>
              {m.accepted
                ? 'Respuesta histórica recibida'
                : 'Resultado desconocido; no enviar otra operación'}{' '}
              · Operación: {m.op === 'create' ? 'solicitud' : 'decisión'} ·
              Referencia conservada en este navegador.
            </p>
            {m.id && (
              <Link
                to={
                  (user?.role === 'SUPER_ADMIN' && m.op !== 'create'
                    ? '/admin/privacy/deletion/'
                    : '/privacy/deletion/') + m.id
                }
              >
                Consultar folio {m.id}
              </Link>
            )}
            {!m.accepted && m.op === 'create' && (
              <button
                className="button secondary"
                disabled={reading}
                onClick={async () => {
                  setReading(true)
                  setError('')
                  const request = new AbortController()
                  controller.current = request
                  try {
                    const result = await deletion.byKey(m.key, request.signal)
                    if (request.signal.aborted) return
                    accept(m, result.id)
                  } catch (e) {
                    if (!request.signal.aborted) setError(message(e))
                  } finally {
                    if (!request.signal.aborted) setReading(false)
                  }
                }}
              >
                Recuperar solicitud por clave
              </button>
            )}
            {user?.role === 'SUPER_ADMIN' &&
              m.id &&
              ['resolve', 'retention-decisions', 'restore-policy'].includes(
                m.op,
              ) && (
                <button
                  className="button secondary"
                  disabled={reading}
                  onClick={async () => {
                    const request = new AbortController()
                    controller.current = request
                    setReading(true)
                    setError('')
                    setHistorical(null)
                    try {
                      const result = await deletion.commandReceipt(
                        m.id!,
                        m.key,
                        request.signal,
                      )
                      if (request.signal.aborted) return
                      accept(m, result.requestId)
                      setHistorical(result)
                      await refresh()
                    } catch (e) {
                      if (!request.signal.aborted) setError(message(e))
                    } finally {
                      if (!request.signal.aborted) setReading(false)
                    }
                  }}
                >
                  Consultar recibo administrativo
                </button>
              )}
            {!m.accepted &&
              ['resolve', 'retention-decisions', 'restore-policy'].includes(
                m.op,
              ) && (
                <p>
                  Resultado desconocido. Recupera el recibo con la misma cuenta
                  administradora; no se repite la mutación. Un recibo ausente o
                  depurado no permite enviar otra decisión.
                </p>
              )}
            {!m.accepted && m.op === 'cancel' && (
              <p>
                El contrato no ofrece consulta del recibo ni cierre técnico de
                esta decisión. Sólo puede repetirse con su cuerpo original
                mientras permanece en memoria en la pantalla iniciadora. Tras
                recarga, requiere resolución del contrato; no se reconstruye ni
                se descarta el marcador.
              </p>
            )}
          </div>
        ))
      )}
      {historical && (
        <section
          aria-label="Recibo histórico administrativo"
          className="notice"
        >
          <h3>Comando aplicado: recibo histórico</h3>
          <p>
            Registrado: {receiptDate(historical.recordedAt)}. Acredita esta
            clave, actor y folio; no acredita eliminación completada ni
            sustituye el estado actual.
          </p>
          {'revision' in historical.result ? (
            <p>
              Revisión histórica: {historical.result.revision}. Estado
              histórico: {label(states, historical.result.status)}.
              {historical.result.status === 'CANCELLED' &&
                ' La decisión administrativa fue aplicada; CANCELLED describe la solicitud histórica, no un fallo o cancelación del comando.'}
            </p>
          ) : 'recorded' in historical.result ? (
            <p>Excepción registrada.</p>
          ) : (
            <p>
              Bloqueo de restauración registrado; no acredita protección de
              scripts externos.
            </p>
          )}
          <Link to={'/admin/privacy/deletion/' + historical.requestId}>
            Consultar estado administrativo actual
          </Link>
        </section>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
export function DeletionHome() {
  const { user, restricted } = useAuth(),
    navigate = useNavigate()
  return (
    <>
      <h1>Baja y eliminación documental</h1>
      <p>
        Cuenta: {user?.email ?? 'identidad restringida autenticada'}. Cierre
        personal, desvinculación y retiro de unidad tienen alcances diferentes.
      </p>
      {!restricted && (
        <Link className="button" to="/privacy/deletion/new">
          Preparar solicitud
        </Link>
      )}
      <References />
      <PrivacyForm
        label="Consultar folio"
        onSubmit={async (data) => {
          navigate('/privacy/deletion/' + String(data.get('folio')))
        }}
      >
        <Field label="Folio de solicitud">
          <input name="folio" required pattern={uuid.source} />
        </Field>
      </PrivacyForm>
    </>
  )
}
export function NewDeletion() {
  const { user } = useAuth()
  const send = useSend(),
    [scope, setScope] = useState<Scope>('ACCOUNT'),
    [resource, setResource] = useState(''),
    [subject, setSubject] = useState(''),
    [confirmed, setConfirmed] = useState(false),
    [result, setResult] = useState<Snapshot>()
  const [page, setPage] = useState(1)
  const [unitPage, setUnitPage] = useState(1)
  const driver = useRead(
    'eligibility-driver',
    (s) => verification.onboarding(s),
    user!.role === 'DRIVER',
  )
  const profile = useRead(
    'eligibility-providers-' + page,
    (s) => providers.profiles(page, s),
    user!.role === 'PROVIDER_ADMIN',
  )
  const units = useRead(
    'eligibility-vehicles-' + resource + '-' + unitPage,
    (s) =>
      vehicles.list(
        { role: 'PROVIDER_ADMIN', providerId: resource },
        { page: unitPage, pageSize: 20 },
        s,
      ),
    user!.role === 'PROVIDER_ADMIN' && !!resource && scope === 'VEHICLE',
  )
  const options: Scope[] = ['ACCOUNT', 'PERSONAL_DOCUMENTS']
  const driverReady = driver.isSuccess && !driver.isFetching
  const profileReady = profile.isSuccess && !profile.isFetching
  if (driverReady && driver.data?.driver.independentProfile)
    options.push('INDEPENDENT_SCOPE')
  if (driverReady && driver.data?.driver.providerId) options.push('FLEET_LINK')
  if (driverReady && driver.data?.driver.independentProfile?.vehicles.length)
    options.push('VEHICLE')
  if (profileReady && profile.data?.items.length)
    options.push('REPRESENTATIVE', 'ORGANIZATION', 'VEHICLE')
  if (user!.role === 'SUPER_ADMIN')
    options.push(
      'INDEPENDENT_SCOPE',
      'FLEET_LINK',
      'VEHICLE',
      'ORGANIZATION',
      'REPRESENTATIVE',
    )
  const [unit, setUnit] = useState('')
  const affected =
    scope === 'FLEET_LINK' && user!.role === 'DRIVER'
      ? driver.data?.driver.providerId
      : scope === 'VEHICLE' && user!.role === 'PROVIDER_ADMIN'
        ? unit
        : resource
  const requiresResource = [
    'FLEET_LINK',
    'VEHICLE',
    'ORGANIZATION',
    'REPRESENTATIVE',
  ].includes(scope)
  const choices =
    scope === 'VEHICLE' && user!.role === 'DRIVER'
      ? driver.data?.driver.independentProfile?.vehicles.map((v) => ({
          id: v.id,
          name: v.identifier,
        }))
      : profile.data?.items.map((p) => ({ id: p.id, name: p.name }))
  return (
    <>
      <h1>Preparar solicitud de baja</h1>
      <p>
        No hay previsualización de impacto. El servidor determinará los
        documentos y vínculos exactos. Puede haber documentos compartidos o
        cargas pendientes; un archivo invisible no significa eliminado.
      </p>
      {(driver.isError || profile.isError) && (
        <p role="alert">
          No se pudieron comprobar vínculos adicionales. Sólo se muestran
          alcances personales; actualiza para consultar otros recursos.
        </p>
      )}
      {result ? (
        <>
          <p role="status">
            Solicitud registrada. No equivale a eliminación completada. Conserva
            el folio: {result.id}.
          </p>
          <Status data={result} />
          <Link to={'/privacy/deletion/' + result.id}>
            Consultar estado vigente
          </Link>
        </>
      ) : (
        <>
          <Field label="Alcance">
            <select
              value={scope}
              onChange={(e) => {
                setScope(e.target.value as Scope)
                setResource('')
                setUnit('')
                setUnitPage(1)
              }}
            >
              {options.map((s) => (
                <option key={s} value={s}>
                  {scopes[s]}
                </option>
              ))}
            </select>
          </Field>
          {user!.role === 'SUPER_ADMIN' && (
            <Field label="Titular asistido (UUID; vacío para cuenta propia)">
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                pattern={uuid.source}
              />
            </Field>
          )}
          {requiresResource &&
            !(scope === 'FLEET_LINK' && user!.role === 'DRIVER') &&
            (user!.role === 'SUPER_ADMIN' ? (
              <Field label="Recurso afectado (UUID previamente verificado)">
                <input
                  value={resource}
                  onChange={(e) => setResource(e.target.value)}
                />
              </Field>
            ) : (
              <>
                <Field
                  label={
                    scope === 'VEHICLE' && user!.role === 'DRIVER'
                      ? 'Unidad propia'
                      : 'Flotilla asociada'
                  }
                >
                  <select
                    value={resource}
                    onChange={(e) => {
                      setResource(e.target.value)
                      setUnit('')
                      setUnitPage(1)
                    }}
                  >
                    <option value="">Selecciona un recurso</option>
                    {choices?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.id}
                      </option>
                    ))}
                  </select>
                </Field>
                {user!.role === 'PROVIDER_ADMIN' && (
                  <div className="row-actions">
                    <button
                      className="button secondary"
                      disabled={page === 1}
                      onClick={() => {
                        setPage(page - 1)
                        setResource('')
                      }}
                    >
                      Proveedores anteriores
                    </button>
                    <button
                      className="button secondary"
                      disabled={
                        !profile.data || page >= profile.data.totalPages
                      }
                      onClick={() => {
                        setPage(page + 1)
                        setResource('')
                      }}
                    >
                      Más proveedores
                    </button>
                  </div>
                )}
              </>
            ))}
          {scope === 'VEHICLE' && user!.role === 'PROVIDER_ADMIN' && (
            <>
              <Field label="Unidad de la flotilla">
                <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                  <option value="">Selecciona una unidad</option>
                  {units.data?.items.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.identifier} · {v.id}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="row-actions">
                <button
                  className="button secondary"
                  disabled={unitPage === 1 || units.isFetching}
                  onClick={() => {
                    setUnitPage(unitPage - 1)
                    setUnit('')
                  }}
                >
                  Unidades anteriores
                </button>
                <button
                  className="button secondary"
                  disabled={
                    !units.data ||
                    unitPage >= units.data.totalPages ||
                    units.isFetching
                  }
                  onClick={() => {
                    setUnitPage(unitPage + 1)
                    setUnit('')
                  }}
                >
                  Más unidades
                </button>
              </div>
              {units.isError && (
                <p role="alert">
                  No se pudieron consultar las unidades autorizadas.
                </p>
              )}
            </>
          )}
          {!user!.emailVerifiedAt && (!subject || subject === user!.id) && (
            <p role="alert">
              Verifica tu correo antes de solicitar una baja propia.
            </p>
          )}
          <p className="notice">{consequences[scope]}</p>
          <p>
            Solicitante: {user!.email}. Titular:{' '}
            {subject || 'tu cuenta personal'}. Recurso:{' '}
            {affected || 'ámbito personal'}. Estos identificadores no acreditan
            facultades por sí solos.
          </p>
          <button
            className="button"
            disabled={
              send.blocked ||
              ((!subject || subject === user!.id) && !user!.emailVerifiedAt) ||
              (scope === 'VEHICLE' &&
                user!.role === 'PROVIDER_ADMIN' &&
                (!units.isSuccess ||
                  units.isFetching ||
                  !units.data?.items.some((v) => v.id === unit))) ||
              !options.includes(scope) ||
              (requiresResource && !uuid.test(affected ?? '')) ||
              (!!subject && !uuid.test(subject))
            }
            onClick={() => setConfirmed(true)}
          >
            Revisar y confirmar alcance
          </button>
          {confirmed && (
            <Modal
              title="Confirmar solicitud de baja"
              onClose={() => {
                if (!send.busy) setConfirmed(false)
              }}
            >
              <p>
                {scopes[scope]} — {consequences[scope]}
              </p>
              <p>
                Titular: {subject || user!.email}. Recurso:{' '}
                {affected || 'personal'}. La eliminación puede quedar pendiente
                de verificación. No se promete reversión después del envío.
              </p>
              <PrivacyForm
                label="Confirmar solicitud"
                disabled={send.blocked || send.busy}
                onSubmit={async (data) => {
                  const body: CreateBody = {
                    scope,
                    acknowledgment: true,
                    ...(requiresResource ? { resourceId: affected! } : {}),
                    ...(subject ? { subjectUserId: subject } : {}),
                    ...(!subject || subject === user!.id
                      ? { password: String(data.get('password')) }
                      : {}),
                  }
                  const value = await send.send('create', undefined, (key) =>
                    deletion.create(key, body),
                  )
                  setResult(value)
                  setConfirmed(false)
                }}
              >
                {(!subject || subject === user!.id) && (
                  <Field label="Contraseña actual">
                    <input
                      type="password"
                      name="password"
                      autoComplete="current-password"
                      required
                      maxLength={1024}
                    />
                  </Field>
                )}
                <label>
                  <input type="checkbox" required name="acknowledgment" />{' '}
                  Entiendo este alcance y solicito expresamente la baja
                  indicada.
                </label>
                <p>
                  La confirmación no sustituye la comprobación de identidad o
                  representación que corresponde al servidor.
                </p>
              </PrivacyForm>
            </Modal>
          )}
        </>
      )}
      <References />
    </>
  )
}
export function DeletionDetail({ admin = false }: { admin?: boolean }) {
  const { id = '' } = useParams(),
    { user } = useAuth()
  const allowed = uuid.test(id) && (!admin || user?.role === 'SUPER_ADMIN')
  const q = useRead(
    'detail-' + (admin ? 'admin-' : '') + id,
    async (signal) => {
      if (!admin) return deletion.get(id, signal)
      const found = (await deletion.list(signal)).find((r) => r.id === id)
      if (!found) throw Error('No disponible')
      return found
    },
    allowed,
    true,
  )
  const receipt = useRead(
      'receipt-' + id,
      (s) => deletion.receipt(id, s),
      false,
    ),
    send = useSend()
  const [cancel, setCancel] = useState(false)
  if (!allowed) return <p role="alert">Ruta o permiso no válido.</p>
  return (
    <>
      <h1>Solicitud de baja</h1>
      <button
        className="button secondary"
        disabled={q.isFetching}
        onClick={() => void q.refetch()}
      >
        Actualizar estado
      </button>
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <p role="alert">
          {message(q.error)} No se interpreta como cierre.{' '}
          <Link to="/privacy/deletion-access">Canal privado</Link>
        </p>
      ) : null}
      {q.data && (
        <>
          <Status data={q.data} />
          {!q.isError && known(q.data) && (
            <>
              {!admin && (
                <button
                  className="button secondary"
                  disabled={
                    receipt.isFetching ||
                    !(q.data.closedAt || q.data.completedDocumentaryScopes > 0)
                  }
                  onClick={() => void receipt.refetch()}
                >
                  Consultar constancia del backend
                </button>
              )}
              {!admin &&
                !terminal(q.data) &&
                !q.data.irreversibleStarted &&
                !q.data.closedAt && (
                  <button
                    className="button secondary"
                    disabled={send.blocked}
                    onClick={() => setCancel(true)}
                  >
                    Solicitar cancelación antes de efectos irreversibles
                  </button>
                )}
              {admin && (
                <AdminActions
                  key={user!.id + id}
                  data={q.data}
                  refreshing={q.isFetching}
                />
              )}
            </>
          )}
          {cancel && (
            <Modal
              title="Confirmar cancelación de solicitud"
              onClose={() => {
                if (!send.busy) setCancel(false)
              }}
            >
              <p>
                El servidor sólo admite cancelar antes de efectos irreversibles.
                No restaura archivos eliminados ni equivale a un cierre técnico.
              </p>
              <PrivacyForm
                label="Confirmar cancelación"
                disabled={send.blocked}
                onSubmit={async () => {
                  await send.send('cancel', id, (key) =>
                    deletion.command(key, id, 'cancel', {
                      expectedRevision: q.data!.revision,
                    }),
                  )
                  setCancel(false)
                }}
              >
                <label>
                  <input type="checkbox" required /> Solicito cancelar este
                  alcance.
                </label>
              </PrivacyForm>
            </Modal>
          )}
        </>
      )}
      {receipt.isError && <p role="alert">{message(receipt.error)}</p>}
      {receipt.data && !receipt.isError && (
        <Status data={receipt.data} receipt />
      )}
      {send.canRetry && (
        <PrivacyForm
          label="Recuperar decisión con el mismo cuerpo y clave"
          onSubmit={async () => {
            await send.retry()
          }}
        >
          <p>
            Repite únicamente la decisión original conservada en memoria, no una
            nueva baja.
          </p>
        </PrivacyForm>
      )}
      <References />
    </>
  )
}
export function AdminDeletionList() {
  const q = useRead('admin-list', (s) => deletion.list(s))
  return (
    <>
      <h1>Solicitudes de baja — administración</h1>
      <p>
        Hasta 100 solicitudes según el contrato; no es un listado exhaustivo.
      </p>
      <button
        className="button secondary"
        onClick={() => void q.refetch()}
        disabled={q.isFetching}
      >
        Actualizar
      </button>
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <p role="alert">{message(q.error)}</p>
      ) : (
        <ul>
          {q.data.map((s) => (
            <li key={s.id}>
              <Link to={'/admin/privacy/deletion/' + s.id}>{s.id}</Link> —{' '}
              {label(states, s.status) ?? 'Estado no reconocido'}
            </li>
          ))}
        </ul>
      )}
      <Link to="/privacy/deletion/new">Preparar solicitud asistida</Link>
    </>
  )
}
export function PrivateDeletion() {
  const pending = useRef<AbortController | null>(null)
  useEffect(
    () => () => {
      pending.current?.abort()
    },
    [],
  )
  const [result, setResult] = useState<Snapshot>(),
    [epoch, setEpoch] = useState(0)
  return (
    <main className="privacy-area">
      <h1>Seguimiento privado de baja</h1>
      <p>
        No requiere sesión operativa. Usa únicamente el código real recibido por
        el canal asistido verificado; no lo compartas ni lo pongas en una URL.
        Si caducó, requiere nueva emisión asistida. No hay un canal de soporte
        externo definido en este contrato.
      </p>
      <PrivacyForm
        key={epoch}
        label="Consultar con código privado"
        onSubmit={async (data) => {
          pending.current?.abort()
          const controller = new AbortController()
          pending.current = controller
          setResult(undefined)
          const value = await deletion.privateStatus(
            String(data.get('token')),
            controller.signal,
          )
          if (!controller.signal.aborted) setResult(value)
        }}
      >
        <Field label="Código privado de seguimiento">
          <input
            name="token"
            type="password"
            required
            maxLength={256}
            autoComplete="off"
          />
        </Field>
      </PrivacyForm>
      {result && (
        <>
          <Status data={result} />
          {result.evidenceLevel && <Status data={result} receipt />}
        </>
      )}
      <button
        className="button secondary"
        onClick={() => {
          pending.current?.abort()
          setResult(undefined)
          setEpoch(epoch + 1)
        }}
      >
        Limpiar consulta privada
      </button>
      <p>
        <Link to="/login">Ir a inicio de sesión</Link>
      </p>
    </main>
  )
}
