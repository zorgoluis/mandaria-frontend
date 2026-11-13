import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Bike,
  Check,
  Eye,
  EyeOff,
  FileCheck2,
  Mail,
  MapPin,
} from 'lucide-react'
import { useAuth } from '../auth/context'
import {
  validateNewPassword,
  PASSWORD_INPUT_MAX_LENGTH,
} from '../auth/password-policy'
import { Field } from '../components/ui'
import { Form } from './common'
import { verification } from './service'
import './signup.css'

export function DriverSignup() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [challenge, setChallenge] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [visible, setVisible] = useState(false)
  const [created, setCreated] = useState(false)
  useEffect(() => {
    if (!cooldown) return
    const timer = window.setTimeout(() => setCooldown((n) => n - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])
  async function requestCode(address: string) {
    const result = await verification.signupStart(address)
    if (result.status !== 'CHECK_EMAIL' || !result.challengeId)
      throw new Error('No pudimos preparar el registro. Intenta de nuevo.')
    setEmail(address)
    setChallenge(result.challengeId)
    setCooldown(result.resendAfterSeconds)
  }
  return (
    <div className="driver-signup">
      <header className="signup-header">
        <Link
          to="/driver/register"
          className="signup-brand"
          aria-label="Mandaria, registro de conductores"
        >
          <img src="/mandaria.svg" alt="" width="36" height="36" /> mandaria
          <span>.</span>
        </Link>
        <span className="signup-header-label">CONDUCTORES</span>
      </header>
      <main className="signup-layout">
        <aside className="signup-story" aria-label="Cómo empezar a repartir">
          <span className="signup-story-label">
            <span /> MUEVE TU SIGUIENTE PASO
          </span>
          <h2>
            Tu próximo
            <br />
            recorrido
            <br />
            <em>empieza aquí.</em>
          </h2>
          <p>
            Crea tu cuenta y prepara tus documentos. Te acompañamos en cada
            paso.
          </p>
          <div className="signup-route" aria-hidden="true">
            <span className="signup-route-start">
              <MapPin size={24} />
            </span>
            <span className="signup-route-line" />
            <span className="signup-route-bike">
              <Bike size={62} strokeWidth={1.4} />
            </span>
            <span className="signup-route-end">
              <ArrowRight size={22} />
            </span>
          </div>
          <ol className="signup-roadmap">
            <li>
              <Mail size={20} />
              <div>
                <strong>Crea tu cuenta</strong>
                <span>Confirma tu correo con un código.</span>
              </div>
            </li>
            <li>
              <FileCheck2 size={20} />
              <div>
                <strong>Completa tu registro</strong>
                <span>Agrega tus datos, vehículo y fotos.</span>
              </div>
            </li>
            <li>
              <Check size={20} />
              <div>
                <strong>Envía tu solicitud</strong>
                <span>Te avisaremos el resultado de la revisión.</span>
              </div>
            </li>
          </ol>
          <span className="signup-story-footer">
            MANDARIA · CADA RECORRIDO CUENTA
          </span>
        </aside>
        <section className="signup-card" aria-labelledby="signup-title">
          <div className="signup-card-top">
            <span className="signup-card-icon" aria-hidden="true">
              {created ? <Check size={24} /> : <Mail size={24} />}
            </span>
            <span>
              {created
                ? 'CUENTA CREADA'
                : challenge
                  ? '02 / CONFIRMA TU CORREO'
                  : '01 / CREA TU CUENTA'}
            </span>
          </div>
          <p className="signup-eyebrow">EMPIEZA A REPARTIR</p>
          <h1 id="signup-title">
            {created
              ? 'Tu cuenta está creada'
              : challenge
                ? 'Confirma tu correo'
                : 'Crea tu cuenta de conductor'}
          </h1>
          <p className="signup-intro">
            {created
              ? 'Puedes entrar con tu correo y la contraseña que acabas de elegir.'
              : challenge
                ? 'Un código, tus datos y listo. Después continuaremos con tus documentos.'
                : 'Comienza con tu correo. Te enviaremos un código para confirmar que eres tú.'}
          </p>
          {auth.user ? (
            <Link className="button" to="/verification-entry">
              Continuar con mi cuenta
            </Link>
          ) : created ? (
            <Link className="button" to="/login?next=onboarding">
              Entrar a mi cuenta
            </Link>
          ) : !challenge ? (
            <Form
              label="Recibir código"
              onSubmit={(d) =>
                requestCode(String(d.get('email')).trim().toLowerCase())
              }
            >
              <Field label="Tu correo electrónico">
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@correo.com"
                  required
                  maxLength={254}
                  defaultValue={email}
                />
              </Field>
            </Form>
          ) : (
            <>
              <p role="status" className="signup-mail-notice">
                <Mail size={20} aria-hidden="true" />
                <span>
                  Revisa <strong>{email}</strong> y escribe el código de 6
                  dígitos.
                  <small>
                    Vence en 10 minutos. Revisa también la carpeta de spam.
                  </small>
                </span>
              </p>
              <Form
                label="Crear cuenta y continuar"
                onSubmit={async (d) => {
                  const password = String(d.get('password'))
                  validateNewPassword(password)
                  const result = await verification.signupComplete({
                    challengeId: challenge,
                    code: String(d.get('code')),
                    name: String(d.get('name')).trim(),
                    password,
                  })
                  if (
                    result.status !== 'CREATED_LOGIN_REQUIRED' ||
                    result.email !== email
                  )
                    throw new Error('No se confirmó la creación de tu cuenta.')
                  setCreated(true)
                  await auth.login(email, password)
                  navigate('/driver/onboarding', { replace: true })
                }}
              >
                <Field label="Código de 6 dígitos">
                  <input
                    className="signup-code"
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    minLength={6}
                    maxLength={6}
                    required
                    placeholder="000000"
                  />
                </Field>
                <Field label="Nombre completo">
                  <input
                    name="name"
                    autoComplete="name"
                    maxLength={100}
                    required
                    placeholder="Como aparece en tu INE"
                  />
                </Field>
                <Field
                  label="Crea una contraseña"
                  hint="De 8 a 128 caracteres."
                >
                  <div className="signup-password">
                    <input
                      name="password"
                      aria-label="Crea una contraseña"
                      type={visible ? 'text' : 'password'}
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={PASSWORD_INPUT_MAX_LENGTH}
                      required
                      placeholder="Elige una contraseña"
                    />
                    <button
                      type="button"
                      aria-label={
                        visible ? 'Ocultar contraseña' : 'Mostrar contraseña'
                      }
                      onClick={() => setVisible(!visible)}
                    >
                      {visible ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </Field>
              </Form>
              <div className="signup-help">
                <Form
                  label={
                    cooldown ? `Reenviar en ${cooldown} s` : 'Reenviar código'
                  }
                  disabled={cooldown > 0}
                  onSubmit={() => requestCode(email)}
                />
                <button
                  type="button"
                  onClick={() => {
                    setChallenge('')
                    setCooldown(0)
                  }}
                >
                  Cambiar correo
                </button>
              </div>
              <p className="muted">
                Si ya creaste tu cuenta o no recibes un código porque ya estás
                registrado,{' '}
                <Link to="/login?next=onboarding">inicia sesión</Link>.
              </p>
            </>
          )}
          <p className="signup-login">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login?next=onboarding">Iniciar sesión</Link>
          </p>
          <details>
            <summary>Recibí un código largo anteriormente</summary>
            <Link to="/driver/verify">Usar mi código anterior</Link>
          </details>
        </section>
      </main>
      <footer className="signup-page-footer">Tu registro, paso a paso.</footer>
    </div>
  )
}
