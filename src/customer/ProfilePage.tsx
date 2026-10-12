import { profileInitials } from './profile-format'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Info, Mail, Package, RefreshCw } from 'lucide-react'
import { useAuth } from '../auth/context'
import { Confirm, ErrorState, Field } from '../components/ui'
import { useFeedback } from '../components/feedback-context'
import { ApiError, errorMessage } from '../services/errors'
import { customer } from './service'
import type { CustomerProfileViewDto } from './contract'
import './quote.css'
import './profile.css'
type Draft = {
  displayName: string
  businessName: string
  type: CustomerProfileViewDto['type']
  revision?: number
}
export function CustomerProfilePage() {
  const auth = useAuth()
  return <ProfileContent key={auth.user?.id} />
}
function ProfileContent() {
  const { user } = useAuth(),
    client = useQueryClient(),
    notify = useFeedback()
  const q = useQuery({
    queryKey: ['customer', user?.id, 'profile'],
    queryFn: customer.profile,
    retry: false,
  })
  const cap = useQuery({
    queryKey: ['customer', user?.id, 'capabilities'],
    queryFn: customer.capabilities,
    enabled: !!q.data,
    retry: false,
  })
  const [draft, setDraft] = useState<Draft>(),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [message, setMessage] = useState(''),
    [failure, setFailure] = useState<unknown>(),
    [fieldErrors, setFieldErrors] = useState<Record<string, string>>({}),
    [dialog, setDialog] = useState<'refresh' | 'type' | null>(null)
  const [mailBusy, setMailBusy] = useState(false),
    [retryAt, setRetryAt] = useState(0),
    [now, setNow] = useState(Date.now)
  const lock = useRef(false),
    mailLock = useRef(false),
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
  const profile = q.data
  const form = draft ?? {
    displayName: profile?.displayName ?? '',
    businessName: profile?.businessName ?? '',
    type: profile?.type ?? 'PERSONAL',
    revision: profile?.revision,
  }
  const name = form.displayName.trim(),
    business = form.businessName.trim()
  const changed =
    name !== (profile?.displayName ?? '') ||
    business !== (profile?.businessName ?? '')
  const typeChanged = !!profile && form.type !== profile.type
  const dirty = changed || typeChanged
  const remoteChanged =
    !!draft && !!profile && draft.revision !== profile.revision
  const cannotClear = !!profile?.businessName && !business
  const valid =
    !!name && name.length <= 100 && business.length <= 160 && !cannotClear
  const locked =
    busy ||
    uncertain ||
    q.isFetching ||
    remoteChanged ||
    (!!profile && q.isError)
  const count = cap.data?.capacity.activeCount
  const canType =
    !!profile &&
    !!cap.data &&
    !cap.isFetching &&
    !cap.isError &&
    count === 0 &&
    typeChanged &&
    !locked
  const cooldown = Math.max(0, Math.ceil((retryAt - now) / 1000))
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  function edit(patch: Partial<Draft>) {
    setDraft({ ...form, ...patch })
    setFieldErrors({})
  }
  async function refresh() {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    try {
      const result = await q.refetch()
      if (!alive.current) return
      if (result.isSuccess) {
        setDraft(undefined)
        setUncertain(false)
        setFailure(undefined)
        setFieldErrors({})
        void cap.refetch()
      } else setFailure(result.error)
    } finally {
      lock.current = false
      if (alive.current) setBusy(false)
    }
  }
  async function mutate(
    work: () => Promise<unknown>,
    success: string,
    section: 'profile' | 'type' = 'profile',
  ) {
    if (lock.current || uncertain || remoteChanged) return
    lock.current = true
    setBusy(true)
    setUncertain(true)
    setFailure(undefined)
    setFieldErrors({})
    try {
      await work()
      if (!alive.current) return
      const current = await q.refetch()
      if (!alive.current) return
      if (!current.isSuccess) throw current.error
      const saved = current.data
      setDraft(
        section === 'type' && changed
          ? { ...form, type: saved.type, revision: saved.revision }
          : section === 'profile' && typeChanged
            ? {
                displayName: saved.displayName,
                businessName: saved.businessName ?? '',
                type: form.type,
                revision: saved.revision,
              }
            : undefined,
      )
      setUncertain(false)
      notify(success)
      void client.invalidateQueries({
        queryKey: ['customer', user?.id, 'capabilities'],
      })
    } catch (error) {
      if (!alive.current) return
      setFailure(error)
      if (error instanceof ApiError) {
        const fields: Record<string, string> = {}
        for (const key of ['displayName', 'businessName'])
          if (error.details.some((detail) => detail.includes(key)))
            fields[key] =
              key === 'displayName'
                ? 'Revisa el nombre: entre 1 y 100 caracteres.'
                : 'Revisa el nombre del negocio: entre 1 y 160 caracteres.'
        setFieldErrors(fields)
      }
    } finally {
      lock.current = false
      if (alive.current) setBusy(false)
    }
  }
  async function verify() {
    if (mailLock.current || cooldown > 0) return
    mailLock.current = true
    setMailBusy(true)
    try {
      await customer.verify()
      if (alive.current) {
        setMessage(
          'Solicitud de verificación recibida. Si procede, recibirás un correo; no confirma su entrega.',
        )
        setRetryAt(Date.now() + 60000)
        setNow(Date.now())
      }
    } catch (error) {
      if (alive.current) {
        setMessage(errorMessage(error))
        if (error instanceof ApiError && error.retryAfterMs > 0) {
          setRetryAt(Date.now() + error.retryAfterMs)
          setNow(Date.now())
        }
      }
    } finally {
      mailLock.current = false
      if (alive.current) setMailBusy(false)
    }
  }
  const typeLabel = (type: string) =>
    type === 'BUSINESS' ? 'Negocio' : 'Personal'
  return (
    <section className="quote-page profile-page" aria-label="Mi perfil cliente">
      <header className="quote-header">
        <div>
          <h1>Mi perfil cliente</h1>
          <p>
            Tu perfil cliente no cambia tu rol ni concede permisos operativos.
          </p>
        </div>
        <Link className="profile-back" to="/customer">
          <Package size={18} aria-hidden="true" />
          Mis solicitudes
        </Link>
      </header>
      {q.isPending ? (
        <div
          className="profile-grid profile-loading"
          role="status"
          aria-label="Cargando perfil"
        >
          <div />
          <div>
            <span />
            <span />
            <span />
          </div>
        </div>
      ) : (
        <div className="profile-grid">
          <aside
            className="profile-card profile-identity"
            aria-label="Identidad del cliente"
          >
            <span className="profile-avatar" aria-hidden="true">
              {profileInitials(profile?.displayName ?? user?.email ?? '')}
            </span>
            <div>
              <h2>{profile?.displayName || 'Tu cuenta'}</h2>
              <p>{user?.email}</p>
            </div>
            <div className="profile-chips">
              {profile && <span>Cliente · {typeLabel(profile.type)}</span>}
              <span
                className={`profile-email ${user?.emailVerifiedAt ? 'verified' : 'pending'}`}
              >
                {user?.emailVerifiedAt
                  ? 'Correo verificado'
                  : 'Correo sin verificar'}
              </span>
            </div>
            <div className="profile-identity-actions">
              {!user?.emailVerifiedAt && (
                <>
                  <button
                    className="button secondary"
                    disabled={mailBusy || cooldown > 0}
                    aria-describedby="profile-mail-status"
                    onClick={() => void verify()}
                  >
                    <Mail size={18} aria-hidden="true" />
                    {mailBusy
                      ? 'Solicitando…'
                      : cooldown > 0
                        ? 'Verificación solicitada'
                        : 'Solicitar verificación de mi correo'}
                  </button>
                  <p id="profile-mail-status" role="status">
                    {message}
                    {cooldown > 0 && ` Podrás reenviar en ${cooldown} s.`}
                  </p>
                </>
              )}
              <button
                className="button secondary profile-refresh"
                disabled={busy || q.isFetching}
                onClick={() => (dirty ? setDialog('refresh') : void refresh())}
              >
                <RefreshCw size={18} aria-hidden="true" />
                Consultar perfil actual
              </button>
            </div>
          </aside>
          <div className="profile-forms">
            {q.isError && <ErrorState error={q.error} />}
            {!!failure && <ErrorState error={failure} />}
            {(uncertain || remoteChanged) && (
              <p role="alert" className="notice">
                {uncertain
                  ? 'Cambio pendiente de consulta. No repitas la modificación antes de leer el perfil actual.'
                  : 'El perfil cambió en el servidor. Tus ediciones se conservan; consulta el perfil actual antes de guardar.'}
              </p>
            )}
            <section className="profile-card">
              <h2>Datos del perfil</h2>
              <p>Se usan como contacto predeterminado en tus solicitudes.</p>
              {!profile && (
                <p className="notice">
                  No se pudo confirmar un perfil cliente disponible. Puedes
                  solicitar anexarlo a tu cuenta; el servidor comprobará si ya
                  existe y si cumples los requisitos.
                </p>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!valid || locked || (!changed && !!profile)) return
                  void mutate(
                    () =>
                      profile
                        ? customer.update({
                            expectedRevision: form.revision!,
                            displayName: name,
                            ...(business ? { businessName: business } : {}),
                          })
                        : customer.attach({
                            displayName: name,
                            type: form.type,
                            ...(business ? { businessName: business } : {}),
                          }),
                    'Perfil guardado',
                  )
                }}
              >
                <fieldset className="profile-fields" disabled={locked}>
                  <div className="profile-inputs">
                    <Field label="Nombre *">
                      <input
                        name="displayName"
                        value={form.displayName}
                        onChange={(e) => edit({ displayName: e.target.value })}
                        required
                        maxLength={100}
                        aria-invalid={!!fieldErrors.displayName}
                        aria-describedby="profile-name-error"
                      />
                      {fieldErrors.displayName && (
                        <small
                          className="profile-error"
                          id="profile-name-error"
                        >
                          {fieldErrors.displayName}
                        </small>
                      )}
                    </Field>
                    <Field label="Nombre del negocio (opcional)">
                      <input
                        name="businessName"
                        value={form.businessName}
                        placeholder="Ej. Pastelería Salgado"
                        onChange={(e) => edit({ businessName: e.target.value })}
                        maxLength={160}
                        aria-invalid={cannotClear || !!fieldErrors.businessName}
                        aria-describedby="profile-business-error"
                      />
                      {(cannotClear || fieldErrors.businessName) && (
                        <small
                          className="profile-error"
                          id="profile-business-error"
                        >
                          {cannotClear
                            ? 'El contrato actual no permite borrar un negocio guardado; puedes cambiar su nombre.'
                            : fieldErrors.businessName}
                        </small>
                      )}
                    </Field>
                  </div>
                  {!profile && (
                    <Field label="Tipo de cliente">
                      <select
                        value={form.type}
                        onChange={(e) =>
                          edit({
                            type:
                              e.target.value === 'BUSINESS'
                                ? 'BUSINESS'
                                : 'PERSONAL',
                          })
                        }
                      >
                        <option value="PERSONAL">Personal</option>
                        <option value="BUSINESS">Negocio</option>
                      </select>
                    </Field>
                  )}
                  <div className="profile-save">
                    <span id="profile-save-reason">
                      {!valid
                        ? 'Completa los datos requeridos con valores válidos.'
                        : !changed
                          ? 'No hay cambios en los datos del perfil.'
                          : locked
                            ? 'Consulta el perfil antes de repetir cambios.'
                            : ''}
                    </span>
                    <button
                      className="button"
                      disabled={locked || !valid || (!!profile && !changed)}
                      aria-describedby="profile-save-reason"
                    >
                      {busy
                        ? 'Guardando…'
                        : profile
                          ? 'Guardar perfil'
                          : 'Anexar perfil a mi cuenta'}
                    </button>
                  </div>
                </fieldset>
              </form>
            </section>
            {profile && (
              <section className="profile-card">
                <h2>Tipo de cuenta</h2>
                <p>
                  Tipo actual: <strong>{typeLabel(profile.type)}</strong>
                </p>
                <fieldset className="quote-choice" disabled={locked}>
                  <legend>Nuevo tipo</legend>
                  <div
                    className="quote-segments"
                    role="radiogroup"
                    aria-label="Nuevo tipo"
                  >
                    {(['PERSONAL', 'BUSINESS'] as const).map((type) => (
                      <label key={type}>
                        <input
                          type="radio"
                          name="profileType"
                          value={type}
                          checked={form.type === type}
                          onChange={() => edit({ type })}
                        />
                        <span>{typeLabel(type)}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="profile-type-action">
                  <div
                    className={`profile-type-note ${count && count > 0 ? 'warning' : ''}`}
                    id="profile-type-reason"
                  >
                    <Info size={20} aria-hidden="true" />
                    <span>
                      {cap.isPending || cap.isFetching ? (
                        'Consultando solicitudes abiertas…'
                      ) : cap.isError || count === undefined ? (
                        'No se pudo comprobar si tienes solicitudes abiertas. Consulta el perfil actual antes de cambiar el tipo.'
                      ) : count > 0 ? (
                        <>
                          Tienes {count}{' '}
                          {count === 1
                            ? 'solicitud abierta'
                            : 'solicitudes abiertas'}
                          .{' '}
                          {count === 1
                            ? 'Finalízala o cancélala'
                            : 'Finalízalas o cancélalas'}{' '}
                          para cambiar de tipo.{' '}
                          <Link to="/customer">Ver solicitudes</Link>
                        </>
                      ) : (
                        'El cambio requiere no tener solicitudes abiertas. No cambia contratos anteriores.'
                      )}
                      {!typeChanged && ' Elige un tipo distinto al actual.'}
                    </span>
                  </div>
                  <button
                    className="button"
                    disabled={!canType}
                    aria-describedby="profile-type-reason"
                    onClick={() => setDialog('type')}
                  >
                    Cambiar tipo
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      )}
      {dialog === 'refresh' && (
        <Confirm
          title="¿Descartar los cambios sin guardar?"
          description="Se cargarán los datos actuales del servidor. Tus ediciones locales se descartarán sólo si la consulta termina correctamente."
          label="Descartar y consultar"
          onClose={() => setDialog(null)}
          onConfirm={refresh}
        />
      )}
      {dialog === 'type' && (
        <Confirm
          title={`¿Cambiar a ${typeLabel(form.type)}?`}
          description="No cambia contratos anteriores. El servidor comprobará nuevamente que no existan solicitudes abiertas."
          label="Confirmar cambio de tipo"
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            if (canType)
              await mutate(
                () =>
                  customer.type({
                    type: form.type,
                    expectedRevision: form.revision!,
                  }),
                'Tipo de cuenta actualizado',
                'type',
              )
          }}
        />
      )}
    </section>
  )
}
