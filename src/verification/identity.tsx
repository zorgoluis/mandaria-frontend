import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Field } from '../components/ui'
import { useAuth } from '../auth/context'
import { Form, Warning } from './common'
import { verification } from './service'
import { registrationUnavailable } from './availability'
export function Register() {
  const [sent, setSent] = useState(false)
  const [resend, setResend] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  return (
    <main className="verification-public">
      <Link to="/login">
        <img src="/mandaria.svg" width="40" alt="Mandaria" />
      </Link>
      <h1>Registro de conductor independiente</h1>
      <Warning />
      <p>
        No necesitas un proveedor. Confirmar tu correo crea una cuenta
        pendiente; no habilita servicios.
      </p>
      <Form
        label={resend ? 'Reenviar correo' : 'Solicitar correo de registro'}
        disabled={unavailable}
        onSubmit={async (d) => {
          const r = await verification
            .register(String(d.get('email')), resend)
            .catch((error: unknown) => {
              setUnavailable(registrationUnavailable(error))
              throw error
            })
          if (r?.status !== 'CHECK_EMAIL')
            throw new Error('Respuesta no confirmada.')
          setSent(true)
          setResend(true)
        }}
      >
        <Field label="Correo electrónico *">
          <input type="email" name="email" required maxLength={254} />
        </Field>
      </Form>
      {sent && (
        <p role="status">
          Revisa tu correo. La respuesta no acredita entrega del mensaje. Si ya
          tienes cuenta, inicia sesión; no se cambiará tu rol.
        </p>
      )}
      <Link to="/driver/verify">Confirmar con el código recibido</Link> ·{' '}
      <Link to="/login?next=onboarding">Iniciar sesión</Link>
    </main>
  )
}
export function RegistrationConfirm() {
  const navigate = useNavigate()
  const [unavailable, setUnavailable] = useState(false)
  return (
    <main className="verification-public">
      <h1>Confirmar registro</h1>
      <Warning />
      <p>Introduce el código del correo. No lo guardamos en el navegador.</p>
      <Form
        label="Confirmar y continuar a login"
        disabled={unavailable}
        onSubmit={async (d) => {
          const r = await verification
            .confirm({
              token: String(d.get('token')),
              password: String(d.get('password')),
              name: String(d.get('name')),
            })
            .catch((error: unknown) => {
              setUnavailable(registrationUnavailable(error))
              throw error
            })
          if (r?.status !== 'CONFIRMED_LOGIN_REQUIRED')
            throw new Error('No se confirmó el registro.')
          navigate('/login?next=onboarding', { replace: true })
        }}
      >
        <Field label="Código de confirmación *">
          <input
            name="token"
            type="password"
            autoComplete="off"
            minLength={43}
            maxLength={128}
            required
          />
        </Field>
        <Field label="Nombre *">
          <input name="name" required maxLength={100} />
        </Field>
        <Field label="Contraseña nueva (16–128 caracteres) *">
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={16}
            maxLength={128}
          />
        </Field>
      </Form>
      <p>
        Si la respuesta se perdió, inicia sesión con tu contraseña antes de
        volver a confirmar. Un código consumido no cambia la contraseña.
      </p>
      <Link to="/driver/register">Solicitar un nuevo correo de registro</Link>
    </main>
  )
}
export function EmailVerification({
  designed = false,
}: {
  designed?: boolean
}) {
  const { restore, user } = useAuth()
  const client = useQueryClient()
  const [notice, setNotice] = useState('')
  const [code, setCode] = useState('')
  const [remaining, setRemaining] = useState(0)
  useEffect(() => {
    if (!remaining) return
    const timer = window.setTimeout(
      () => setRemaining((n) => Math.max(0, n - 1)),
      1000,
    )
    return () => window.clearTimeout(timer)
  }, [remaining])
  if (designed && user?.emailVerifiedAt)
    return (
      <section className="panel panel-body documentary-email">
        <h2>
          <span className="documentary-step">1</span>Correo confirmado ✓
        </h2>
      </section>
    )
  return (
    <section
      className={'panel panel-body' + (designed ? ' documentary-email' : '')}
    >
      <h2>
        {designed && <span className="documentary-step">1</span>}Confirmación
        personal de correo
      </h2>
      <Form
        label={
          remaining
            ? `Reenviar en ${remaining} s`
            : 'Solicitar código de correo'
        }
        disabled={remaining > 0}
        onSubmit={async () => {
          await verification.emailRequest()
          setRemaining(60)
          setNotice(
            'Solicitud recibida. Revisa tu correo; no se acredita entrega.',
          )
        }}
      />
      <Form
        label="Confirmar correo de esta cuenta"
        disabled={designed && (code.length < 43 || code.length > 128)}
        onSubmit={async (d) => {
          const result = await verification.emailConfirm(String(d.get('token')))
          if (result?.status !== 'EMAIL_VERIFIED')
            throw new Error(
              'Confirmación de correo no recibida; consulta antes de continuar.',
            )
          await restore()
          await client.invalidateQueries({
            queryKey: ['verification', user?.id],
          })
          setNotice('Correo confirmado. Vuelve a consultar el onboarding.')
        }}
      >
        <Field label="Código del correo *">
          <input
            type="password"
            name="token"
            required
            minLength={43}
            maxLength={128}
            autoComplete="off"
            placeholder="Código recibido por correo"
            onChange={(e) => setCode(e.target.value)}
          />
        </Field>
        {designed && (
          <small>
            Introduce el código completo del correo (43–128 caracteres).
          </small>
        )}
      </Form>
      {notice && <p role="status">{notice}</p>}
    </section>
  )
}
export { TermsPanel, TermsForm } from './terms'
