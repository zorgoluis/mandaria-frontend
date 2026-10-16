import {
  Input,
  Button,
  ButtonLink,
  ActionForm,
  Field,
  PageHeader,
  RouteProgress,
} from '../components/ui'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from './context'
import { ApiError, errorMessage } from '../services/errors'
import './login.css'

type LoginField = 'email' | 'password'
function validationMessage(input: HTMLInputElement) {
  if (input.validity.valueMissing)
    return input.name === 'email'
      ? 'Escribe tu correo electrónico.'
      : 'Escribe tu contraseña.'
  if (input.validity.typeMismatch)
    return 'Escribe un correo válido, por ejemplo nombre@empresa.com.'
  if (input.validity.tooLong)
    return `Usa como máximo ${input.maxLength} caracteres.`
  return ''
}

export function Login() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const destination =
    params.get('next') === 'onboarding' ? '/verification-entry' : '/dashboard'
  const [visible, setVisible] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<LoginField, string>>>({})
  function validate(input: HTMLInputElement) {
    setErrors((previous) => ({
      ...previous,
      [input.name]: validationMessage(input),
    }))
  }
  function invalid(event: FormEvent<HTMLFormElement>) {
    const input = event.target
    if (!(input instanceof HTMLInputElement)) return
    event.preventDefault()
    validate(input)
    // Keep native constraints, but explain them inline in Spanish and focus the first error.
    const first = Array.from(
      event.currentTarget.querySelectorAll('input'),
    ).find((field) => field.willValidate && !field.validity.valid)
    if (first === input) queueMicrotask(() => input.focus())
  }
  if (auth.user) return <Navigate to={destination} replace />
  return (
    <div className="auth-login">
      <header className="auth-login-brand">
        <div className="brand">
          <img className="brand-mark" src="/mandaria.svg" alt="" />
          mandaria<span className="brand-period">.</span>
        </div>
        <span>Sin vueltas.</span>
      </header>
      <aside className="auth-login-story" aria-label="Mandaria">
        <p className="auth-login-statement">
          Tu operación.
          <br />
          <span>En movimiento.</span>
        </p>
        <p>
          Mandados, fletes, viajes y mudanzas. Un solo lugar para seguir tu
          operación.
        </p>
        <RouteProgress
          label="Pasos de acceso"
          steps={[
            {
              id: 'account',
              label: 'Inicia sesión',
              description: 'Usa los datos de tu cuenta.',
              state: 'current',
            },
            {
              id: 'workspace',
              label: 'Continúa con tu operación',
              description: 'Accede a tus herramientas y servicios.',
            },
          ]}
        />
      </aside>
      <main className="auth-login-main" id="login-content">
        <div className="auth-login-form">
          <PageHeader
            eyebrow="Acceso a Mandaria"
            title="Iniciar sesión"
            description="Ingresa con el correo y la contraseña de tu cuenta."
          />
          {auth.expired && (
            <p className="notice" role="status">
              Tu sesión expiró. Inicia sesión nuevamente.
            </p>
          )}
          <ActionForm
            submitLabel="Iniciar sesión"
            loadingLabel="Iniciando sesión…"
            initialDirty
            trackChanges={false}
            onInvalidCapture={invalid}
            getErrorMessage={(error) =>
              error instanceof ApiError && error.status === 401
                ? 'El correo o la contraseña son incorrectos. Revisa tus datos e inténtalo de nuevo.'
                : errorMessage(error)
            }
            onSubmit={async (data) => {
              await auth.login(
                String(data.get('email')),
                String(data.get('password')),
              )
              navigate(destination, { replace: true })
            }}
          >
            <Input
              label="Correo electrónico"
              help="Usa el correo con el que activaste tu cuenta."
              error={errors.email}
              name="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="nombre@empresa.com"
              required
              maxLength={254}
              onBlur={(event) => validate(event.currentTarget)}
              onChange={(event) => {
                if (errors.email) validate(event.currentTarget)
              }}
            />
            <Field label="Contraseña" error={errors.password}>
              <span className="auth-login-password">
                <Input
                  name="password"
                  type={visible ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  maxLength={128}
                  onBlur={(event) => validate(event.currentTarget)}
                  onChange={(event) => {
                    if (errors.password) validate(event.currentTarget)
                  }}
                />
                <Button
                  variant="ghost"
                  className="icon-button"
                  aria-label={
                    visible ? 'Ocultar contraseña' : 'Mostrar contraseña'
                  }
                  aria-pressed={visible}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? (
                    <EyeOff className="ui-icon" aria-hidden="true" />
                  ) : (
                    <Eye className="ui-icon" aria-hidden="true" />
                  )}
                </Button>
              </span>
            </Field>
          </ActionForm>
          <section
            className="auth-login-help"
            aria-labelledby="login-first-time"
          >
            <h2 id="login-first-time">¿Primera vez aquí?</h2>
            <p>
              Si recibiste una invitación, activa tu cuenta desde el enlace del
              correo antes de iniciar sesión.
            </p>
            <p>
              Si eres repartidor independiente, puedes solicitar tu registro.
            </p>
            <ButtonLink variant="ghost" to="/driver/register">
              Registro independiente de prueba
            </ButtonLink>
          </section>
        </div>
      </main>
      <footer className="auth-login-footer">
        <span>Mandaria · Logística independiente</span>
        <span>Mandados · Fletes · Viajes · Mudanzas</span>
      </footer>
    </div>
  )
}
