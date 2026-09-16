import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2, CircleAlert, Eye, EyeOff } from 'lucide-react'
import { ActionForm, Field } from '../components/ui'
import { ApiError } from '../services/errors'
import { accounts } from '../invitations/service'
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  type ActivationResult,
} from '../invitations/types'
import { labels } from '../utils/format'

/** Token states that end the flow: the form can no longer succeed with this link. */
const terminal: Record<string, { title: string; text: string }> = {
  INVITATION_TOKEN_INVALID: {
    title: 'La invitación no es válida.',
    text: 'Abre nuevamente el enlace completo de tu correo o solicita una nueva invitación a tu administrador.',
  },
  INVITATION_EXPIRED: {
    title: 'Esta invitación ha expirado.',
    text: 'Solicita una nueva invitación a tu administrador.',
  },
  INVITATION_ALREADY_ACCEPTED: {
    title: 'Esta invitación ya fue utilizada.',
    text: 'Si ya activaste tu cuenta, inicia sesión con tu correo y contraseña.',
  },
  INVITATION_REVOKED: {
    title: 'Esta invitación ya no está disponible.',
    text: 'Fue revocada por un administrador. Solicita una nueva invitación si la necesitas.',
  },
  ACCOUNT_NOT_ACTIVATABLE: {
    title: 'Esta cuenta no puede activarse.',
    text: 'Contacta a tu administrador para revisar tu acceso.',
  },
  PROVIDER_DRIVER_LIMIT_REACHED: {
    title: 'No fue posible activar la cuenta.',
    text: 'El proveedor ya no tiene lugares disponibles para repartidores. Contacta a tu administrador.',
  },
}
const MISSING = {
  title: 'La invitación no es válida.',
  text: 'El enlace está incompleto. Abre nuevamente el enlace de tu correo.',
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="activation-page">
      <div className="activation-card">
        <div className="brand">
          <span className="brand-mark">
            m<span>↗</span>
          </span>
          mandaria<span className="brand-period">.</span>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ActivateAccount() {
  const location = useLocation()
  const navigate = useNavigate()
  // Read once and keep only in memory: never persisted, never rendered.
  const [token] = useState(
    () => new URLSearchParams(location.search).get('token') ?? '',
  )
  const [visible, setVisible] = useState(false)
  const [result, setResult] = useState<ActivationResult | null>(null)
  const [ended, setEnded] = useState<{ title: string; text: string } | null>(
    token ? null : MISSING,
  )
  // Remove the token from the address bar and history as soon as it is captured.
  useEffect(() => {
    if (new URLSearchParams(location.search).has('token'))
      navigate('/activate-account', { replace: true })
  }, [location.search, navigate])

  if (result)
    return (
      <Shell>
        <div className="activation-state" role="status">
          <CheckCircle2 size={34} />
          <h1>Cuenta activada correctamente.</h1>
          <p>
            {result.email} ya puede iniciar sesión como{' '}
            {(labels[result.role] ?? 'usuario').toLowerCase()}.
          </p>
          <Link className="button" to="/login" replace>
            Ir a iniciar sesión
          </Link>
        </div>
      </Shell>
    )
  if (ended)
    return (
      <Shell>
        <div className="activation-state error-state" role="alert">
          <CircleAlert size={34} />
          <h1>{ended.title}</h1>
          <p>{ended.text}</p>
          <Link className="button secondary" to="/login" replace>
            Ir a iniciar sesión
          </Link>
        </div>
      </Shell>
    )
  return (
    <Shell>
      <span className="eyebrow">ACTIVA TU CUENTA</span>
      <h1>Crea tu contraseña</h1>
      <p className="muted">
        Tu contraseña es personal: nadie en Mandaria la conoce ni te la pedirá.
      </p>
      <ActionForm
        initialDirty
        submitLabel="Activar cuenta"
        onSubmit={async (data) => {
          const password = String(data.get('password') ?? '')
          if (
            password.length < PASSWORD_MIN_LENGTH ||
            password.length > PASSWORD_MAX_LENGTH
          )
            throw new ApiError(
              400,
              `La contraseña debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres.`,
            )
          if (password !== String(data.get('confirmation') ?? ''))
            throw new ApiError(400, 'Las contraseñas no coinciden.')
          try {
            setResult(await accounts.activate(token, password))
          } catch (error) {
            const state =
              error instanceof ApiError && error.code
                ? terminal[error.code]
                : undefined
            if (state) setEnded(state)
            else if (
              error instanceof ApiError &&
              error.code === 'VALIDATION_ERROR'
            )
              throw new ApiError(
                400,
                `Revisa tu contraseña: debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres.`,
              )
            else throw error
          }
        }}
      >
        <Field
          label="Crear contraseña"
          hint={`Entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres. Puedes usar una frase fácil de recordar.`}
        >
          <input
            name="password"
            type={visible ? 'text' : 'password'}
            autoComplete="new-password"
            required
            maxLength={PASSWORD_MAX_LENGTH}
          />
        </Field>
        <Field label="Confirmar contraseña">
          <input
            name="confirmation"
            type={visible ? 'text' : 'password'}
            autoComplete="new-password"
            required
            maxLength={PASSWORD_MAX_LENGTH}
          />
        </Field>
        <button
          type="button"
          className="text-button"
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}{' '}
          {visible ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
        </button>
      </ActionForm>
    </Shell>
  )
}
