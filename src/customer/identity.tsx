import type { AccessChallenge } from './access'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/context'
import {
  ActionForm,
  Field,
  PageTitle,
  Loading,
  ErrorState,
} from '../components/ui'
import { customer } from './service'
import type { CustomerProfileViewDto } from './contract'
const accepted =
  'Solicitud recibida. Si procede, recibirás un correo. Esta respuesta no confirma la entrega del mensaje.'
export function ProfileFields({
  profile,
  email = false,
}: {
  profile?: CustomerProfileViewDto
  email?: boolean
}) {
  return (
    <>
      {email && (
        <Field label="Correo electrónico">
          <input name="email" type="email" required autoComplete="email" />
        </Field>
      )}
      {!profile && (
        <Field label="Tipo de cliente">
          <select name="type">
            <option value="PERSONAL">Personal</option>
            <option value="BUSINESS">Negocio</option>
          </select>
        </Field>
      )}
      <Field label="Nombre">
        <input
          name="displayName"
          required
          maxLength={100}
          defaultValue={profile?.displayName}
        />
      </Field>
      <Field label="Nombre del negocio (opcional)">
        <input
          name="businessName"
          maxLength={160}
          defaultValue={profile?.businessName ?? ''}
        />
      </Field>
    </>
  )
}
function profileData(data: FormData) {
  return {
    type:
      data.get('type') === 'BUSINESS'
        ? ('BUSINESS' as const)
        : ('PERSONAL' as const),
    displayName: String(data.get('displayName')).trim(),
    ...(String(data.get('businessName') ?? '').trim()
      ? { businessName: String(data.get('businessName')).trim() }
      : {}),
  }
}
export function CustomerRegistration() {
  const [resend, setResend] = useState(false),
    [message, setMessage] = useState('')
  return (
    <main className="customer-public">
      <PageTitle title="Crear perfil cliente" />
      <p>
        Solicita envíos como persona o negocio. El alta depende de la admisión
        del servicio.
      </p>
      <ActionForm
        initialDirty
        submitLabel={resend ? 'Reenviar confirmación' : 'Solicitar registro'}
        onSubmit={async (d) => {
          await customer.register(
            {
              ...profileData(d),
              email: String(d.get('email')).trim().toLowerCase(),
            },
            resend,
          )
          setMessage(accepted)
        }}
      >
        <ProfileFields email />
        <Field label="Reenviar registro con este perfil completo">
          <input
            type="checkbox"
            checked={resend}
            onChange={(e) => setResend(e.target.checked)}
          />
        </Field>
      </ActionForm>
      <p role="status">{message}</p>
      <Link to="/login">Ya tengo cuenta</Link>
    </main>
  )
}
export function PasswordRecovery() {
  const [message, setMessage] = useState('')
  return (
    <main className="customer-public">
      <PageTitle title="Recuperar contraseña" />
      <ActionForm
        initialDirty
        submitLabel="Solicitar recuperación"
        onSubmit={async (d) => {
          await customer.recover(String(d.get('email')))
          setMessage(accepted)
        }}
      >
        <Field label="Correo electrónico">
          <input name="email" type="email" required />
        </Field>
      </ActionForm>
      <p role="status">{message}</p>
      <Link to="/login">Volver a iniciar sesión</Link>
    </main>
  )
}
export function CustomerAccess({
  challenge,
  onConsumed,
}: {
  challenge: AccessChallenge
  onConsumed?: () => void
}) {
  const navigate = useNavigate()
  const auth = useAuth(),
    [done, setDone] = useState(false),
    [token, setToken] = useState(challenge.token)
  useEffect(() => {
    onConsumed?.()
  }, [onConsumed])
  if (done)
    return (
      <main className="customer-public">
        <PageTitle title="Confirmación completada" />
        <p>Inicia sesión nuevamente para continuar.</p>
        <Link to="/login">Iniciar sesión</Link>
      </main>
    )
  if (!token || !['REGISTER', 'RESET', 'VERIFY'].includes(challenge.purpose))
    return (
      <main className="customer-public">
        <PageTitle title="Enlace no disponible" />
        <p>
          Solicita un nuevo enlace. No se conservan tokens al salir o recargar.
        </p>
        <Link to="/customer/recovery">Recuperar acceso</Link>
      </main>
    )
  return (
    <main className="customer-public">
      <PageTitle
        title={
          challenge.purpose === 'VERIFY'
            ? 'Verificar mi contacto'
            : 'Confirmar acceso'
        }
      />
      <p>
        Si perdiste una respuesta anterior, intenta iniciar sesión con la
        contraseña elegida. Un enlace consumido no significa que la cuenta no
        exista.
      </p>
      {challenge.purpose === 'VERIFY' && !auth.user ? (
        <>
          <p>
            Inicia sesión con la cuenta destinataria para verificar. El enlace
            sólo se conserva en memoria durante esta pantalla.
          </p>
          <ActionForm
            initialDirty
            submitLabel="Iniciar sesión"
            onSubmit={async (d) => {
              await auth.login(
                String(d.get('email')),
                String(d.get('password')),
              )
            }}
          >
            <Field label="Correo electrónico">
              <input type="email" name="email" required />
            </Field>
            <Field label="Contraseña">
              <input type="password" name="password" required />
            </Field>
          </ActionForm>
        </>
      ) : (
        <ActionForm
          initialDirty
          submitLabel="Confirmar"
          onSubmit={async (d) => {
            await customer.confirm(
              challenge.purpose,
              token,
              challenge.purpose === 'VERIFY'
                ? undefined
                : String(d.get('password')),
            )
            setToken('')
            setDone(true)
            if (challenge.purpose === 'RESET') {
              await auth.logout().catch(() => undefined)
              navigate('/login', { replace: true })
            }
          }}
        >
          {challenge.purpose !== 'VERIFY' && (
            <Field label="Nueva contraseña">
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={16}
                maxLength={128}
              />
            </Field>
          )}
        </ActionForm>
      )}
    </main>
  )
}
export function CustomerProfile() {
  const { user } = useAuth()
  const q = useQuery({
    queryKey: ['customer', user?.id, 'profile'],
    queryFn: customer.profile,
    retry: false,
  })
  const [message, setMessage] = useState(''),
    [uncertain, setUncertain] = useState(false)
  if (q.isPending) return <Loading />
  const profile = q.data
  return (
    <>
      <PageTitle title="Mi perfil cliente" />
      <p>Tu perfil cliente no cambia tu rol ni concede permisos operativos.</p>
      {q.isError && <ErrorState error={q.error} />}
      <button
        className="button secondary"
        onClick={() =>
          void customer
            .verify()
            .then(() => setMessage(accepted))
            .catch(() =>
              setMessage(
                'No se pudo solicitar la verificación. Revisa tu sesión e inténtalo más tarde.',
              ),
            )
        }
      >
        Solicitar verificación de mi correo
      </button>
      <p role="status">{message}</p>
      <button
        className="button secondary"
        onClick={() =>
          void q.refetch().then((r) => {
            if (r.isSuccess) setUncertain(false)
          })
        }
      >
        Consultar perfil actual
      </button>
      {uncertain && (
        <p role="alert">
          Cambio pendiente de consulta. No repitas la modificación antes de leer
          el perfil actual.
        </p>
      )}
      <fieldset disabled={uncertain || q.isFetching}>
        <ActionForm
          key={profile?.revision ?? 'new'}
          submitLabel={profile ? 'Guardar perfil' : 'Anexar perfil a mi cuenta'}
          onSubmit={async (d) => {
            setUncertain(true)
            if (profile)
              await customer.update({
                expectedRevision: profile.revision,
                displayName: String(d.get('displayName')),
                ...(String(d.get('businessName') ?? '').trim()
                  ? { businessName: String(d.get('businessName')) }
                  : {}),
              })
            else await customer.attach(profileData(d))
            await q.refetch()
            setUncertain(false)
            setMessage('Perfil guardado.')
          }}
        >
          <ProfileFields profile={profile} />
        </ActionForm>
        {profile && (
          <ActionForm
            key={'type' + profile.revision}
            submitLabel="Cambiar tipo"
            onSubmit={async (d) => {
              setUncertain(true)
              await customer.type({
                type: d.get('type') === 'BUSINESS' ? 'BUSINESS' : 'PERSONAL',
                expectedRevision: profile.revision,
              })
              await q.refetch()
              setUncertain(false)
            }}
          >
            <p>
              El cambio requiere no tener solicitudes abiertas. No cambia
              contratos anteriores.
            </p>
            <Field label="Nuevo tipo">
              <select name="type" defaultValue={profile.type}>
                <option value="PERSONAL">Personal</option>
                <option value="BUSINESS">Negocio</option>
              </select>
            </Field>
          </ActionForm>
        )}
      </fieldset>
      <Link to="/customer">Mis solicitudes</Link>
    </>
  )
}
