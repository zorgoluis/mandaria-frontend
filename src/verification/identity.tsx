import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Field, Loading } from '../components/ui'
import { useAuth } from '../auth/context'
import { Form, Warning } from './common'
import { message, vkey } from './format'
import { useCommand } from './hooks'
import { verification } from './service'
import type { Terms } from './types'
export function Register() {
  const [sent, setSent] = useState(false)
  const [resend, setResend] = useState(false)
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
        onSubmit={async (d) => {
          const r = await verification.register(String(d.get('email')), resend)
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
          Revisa el correo de pruebas. La respuesta no acredita entrega del
          mensaje. Si ya tienes cuenta, inicia sesión; no se cambiará tu rol.
        </p>
      )}
      <Link to="/driver/verify">Confirmar con el código recibido</Link> ·{' '}
      <Link to="/login?next=onboarding">Iniciar sesión</Link>
    </main>
  )
}
export function RegistrationConfirm() {
  const navigate = useNavigate()
  return (
    <main className="verification-public">
      <h1>Confirmar registro</h1>
      <Warning />
      <p>
        Introduce el código del correo de pruebas. No lo guardamos en el
        navegador.
      </p>
      <Form
        label="Confirmar y continuar a login"
        onSubmit={async (d) => {
          const r = await verification.confirm({
            token: String(d.get('token')),
            password: String(d.get('password')),
            name: String(d.get('name')),
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
    </main>
  )
}
export function EmailVerification() {
  const { restore, user } = useAuth()
  const client = useQueryClient()
  const [notice, setNotice] = useState('')
  return (
    <section className="panel panel-body">
      <h2>Confirmación personal de correo</h2>
      <Form
        label="Solicitar código de correo"
        onSubmit={async () => {
          await verification.emailRequest()
          setNotice(
            'Solicitud recibida. Revisa el correo de pruebas; no se acredita entrega.',
          )
        }}
      />
      <Form
        label="Confirmar correo de esta cuenta"
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
          />
        </Field>
      </Form>
      {notice && <p role="status">{notice}</p>}
    </section>
  )
}
export function TermsPanel({
  providerId,
  providerName,
}: {
  providerId?: string
  providerName?: string
}) {
  const { user } = useAuth()
  const scope = providerId ? 'FLEET' : 'DRIVER'
  const q = useQuery({
    queryKey: vkey(user!.id, 'terms', scope, providerId),
    queryFn: ({ signal }) => verification.terms(scope, providerId, signal),
    retry: false,
    gcTime: 0,
    staleTime: 0,
  })
  return (
    <section className="panel panel-body">
      <h2>
        {providerId
          ? `Términos de prueba — ${providerName}`
          : 'Términos personales de prueba'}
      </h2>
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <>
          <p role="alert">{message(q.error)}</p>
          <button onClick={() => void q.refetch()}>Consultar términos</button>
        </>
      ) : (
        <TermsForm
          key={q.data.version + q.data.hash}
          terms={q.data}
          providerId={providerId}
          refresh={() => q.refetch()}
        />
      )}
    </section>
  )
}
export function TermsForm({
  terms,
  providerId,
  refresh,
}: {
  terms: Terms
  providerId?: string
  refresh: () => Promise<unknown>
}) {
  const command = useCommand()
  const [checked, setChecked] = useState(false)
  const [receipt, setReceipt] = useState('')
  return (
    <>
      <p>
        Versión: <strong>{terms.version}</strong> · PRUEBA LOCAL, sin vigencia
        contractual.
      </p>
      <div
        className="verification-terms"
        tabIndex={0}
        role="region"
        aria-label="Texto completo de los términos"
      >
        {terms.text}
      </div>
      <p>
        {providerId
          ? 'El representante acepta sólo por esta flotilla. Cada conductor debe aceptar personalmente con su cuenta.'
          : 'Aceptación personal del conductor; no sustituye la aprobación de identidad o de unidades.'}
      </p>
      <Form
        label={
          providerId
            ? 'Aceptar por esta flotilla (prueba)'
            : 'Aceptar personalmente (prueba)'
        }
        disabled={!checked || command.busy || command.blocked}
        onSubmit={async () => {
          try {
            const r = await command.send(
              'ACCEPT_TERMS',
              providerId ? 'FLEET:' + providerId : 'DRIVER',
              '/verification-terms/accept',
              {
                scope: terms.scope,
                ...(providerId ? { providerId } : {}),
                version: terms.version,
                hash: terms.hash,
                accepted: true,
                method: 'WEB_CHECKBOX_BUTTON',
              },
            )
            setReceipt(r.id)
          } finally {
            setChecked(false)
            await refresh()
          }
        }}
      >
        <label className="verification-check">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          He leído el texto completo de prueba, versión {terms.version}, y
          acepto expresamente en este ámbito.
        </label>
      </Form>
      {receipt && (
        <p role="status">
          Comprobante de prueba recibido.{' '}
          <Link to={'/verification/acceptances/' + receipt}>
            Consultar texto aceptado
          </Link>
        </p>
      )}
    </>
  )
}
