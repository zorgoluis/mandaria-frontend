import { RegistrationPage } from './RegistrationPage'
import { CustomerProfilePage } from './ProfilePage'
import type { AccessChallenge } from './access'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { ActionForm, Field, PageTitle } from '../components/ui'
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
export function CustomerRegistration() {
  return <RegistrationPage />
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
    [businessRequired, setBusinessRequired] = useState(false),
    [token, setToken] = useState(challenge.token)
  useEffect(() => {
    onConsumed?.()
  }, [onConsumed])
  if (done)
    return (
      <main className="customer-public">
        <PageTitle title="Confirmación completada" />
        <p>Inicia sesión nuevamente para continuar.</p>
        {businessRequired && (
          <p>
            Se creó tu perfil Personal. Negocio requiere aprobación:{' '}
            <Link to="/customer/business">Solicitar cuenta Negocio</Link>.
          </p>
        )}
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
            const result = await customer.confirm(
              challenge.purpose,
              token,
              challenge.purpose === 'VERIFY'
                ? undefined
                : String(d.get('password')),
            )
            setBusinessRequired(
              challenge.purpose === 'REGISTER' &&
                result?.profileType === 'PERSONAL' &&
                result.businessApplicationRequired === true,
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
  return <CustomerProfilePage />
}
