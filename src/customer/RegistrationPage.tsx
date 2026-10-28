import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, LoaderCircle } from 'lucide-react'
import { customer } from './service'
import { ApiError, errorMessage } from '../services/errors'
import './registration.css'

type Fields = { email: string; displayName: string; businessName: string }
export function RegistrationPage() {
  const type = 'PERSONAL' as const
  const [fields, setFields] = useState<Fields>({
    email: '',
    displayName: '',
    businessName: '',
  })
  const [touched, setTouched] = useState<
    Partial<Record<keyof Fields, boolean>>
  >({})
  const [serverFields, setServerFields] = useState<
    Partial<Record<keyof Fields, string>>
  >({})
  const [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [failure, setFailure] = useState('')
  const lock = useRef(false),
    alive = useRef(true),
    confirmation = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  useEffect(() => {
    if (done) confirmation.current?.focus()
  }, [done])
  const email = fields.email.trim().toLowerCase(),
    name = fields.displayName.trim(),
    business = fields.businessName.trim()
  const errors: Partial<Record<keyof Fields, string>> = {
    email:
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
        ? undefined
        : 'Introduce un correo electrónico válido.',
    displayName:
      name && name.length <= 100
        ? undefined
        : 'Introduce tu nombre (hasta 100 caracteres).',
    businessName:
      business.length > 160 ? 'Usa hasta 160 caracteres.' : undefined,
  }
  const valid = !Object.values(errors).some(Boolean)
  function change(key: keyof Fields, value: string) {
    setFields({ ...fields, [key]: value })
    setServerFields({ ...serverFields, [key]: undefined })
    setFailure('')
  }
  async function submit(resend = false) {
    if (lock.current) return
    setTouched({ email: true, displayName: true, businessName: true })
    if (!valid) return
    lock.current = true
    setBusy(true)
    setFailure('')
    setServerFields({})
    try {
      await customer.register(
        {
          type,
          email,
          displayName: name,
          ...(business ? { businessName: business } : {}),
        },
        resend,
      )
      if (alive.current) setDone(true)
    } catch (error) {
      if (alive.current) {
        setFailure(errorMessage(error))
        if (error instanceof ApiError) {
          const mapped: Partial<Record<keyof Fields, string>> = {}
          for (const key of ['email', 'displayName', 'businessName'] as const) {
            if (error.details.some((detail) => detail.includes(key)))
              mapped[key] =
                key === 'email'
                  ? 'Revisa el formato del correo electrónico.'
                  : key === 'displayName'
                    ? 'Revisa el nombre: entre 1 y 100 caracteres.'
                    : 'Revisa el negocio: entre 1 y 160 caracteres.'
          }
          setServerFields(mapped)
        }
      }
    } finally {
      lock.current = false
      if (alive.current) setBusy(false)
    }
  }
  function field(
    key: keyof Fields,
    label: string,
    placeholder: string,
    required: boolean,
    autoComplete: string,
  ) {
    const error = serverFields[key] || (touched[key] ? errors[key] : undefined)
    return (
      <div className="registration-field">
        <label htmlFor={`registration-${key}`}>
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </label>
        <input
          id={`registration-${key}`}
          name={key}
          type={key === 'email' ? 'email' : 'text'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          maxLength={key === 'email' ? 254 : key === 'displayName' ? 100 : 160}
          value={fields[key]}
          onChange={(e) => change(key, e.target.value)}
          onBlur={() => setTouched({ ...touched, [key]: true })}
          aria-invalid={!!error}
          aria-describedby={error ? `registration-${key}-error` : undefined}
        />
        <span
          id={`registration-${key}-error`}
          className="registration-error"
          aria-live="polite"
        >
          {error}
        </span>
      </div>
    )
  }
  return (
    <main className="registration-page">
      <aside className="registration-brand" aria-label="Mandaria">
        <Link
          to="/"
          className="registration-logo"
          aria-label="Mandaria, inicio"
        >
          <img src="/mandaria.svg" alt="" width={40} height={40} />
          <strong>
            mandaria<b>.</b>
          </strong>
        </Link>
        <div className="registration-motto">
          <h2>Logística que avanza contigo.</h2>
          <p>Una operación conectada. La base de lo que viene.</p>
        </div>
      </aside>
      <section
        className="registration-content"
        aria-label="Registro de cliente"
      >
        <div className="registration-column">
          {done ? (
            <div className="registration-confirmation">
              <span className="registration-check">
                <Check size={28} aria-hidden="true" />
              </span>
              <h1 ref={confirmation} tabIndex={-1}>
                Solicitud enviada
              </h1>
              <p>
                Solicitud recibida. Si procede, recibirás un correo para
                continuar. Esta respuesta no confirma la aprobación del alta ni
                la entrega del mensaje.
              </p>
              {failure && (
                <p role="alert" className="registration-warning">
                  {failure}
                </p>
              )}
              <Link to="/login" className="registration-secondary">
                Ir a iniciar sesión
              </Link>
              <button
                className="registration-resend"
                disabled={busy}
                onClick={() => void submit(true)}
              >
                {busy ? 'Enviando…' : 'Reenviar solicitud con este perfil'}
              </button>
              <p className="registration-help">
                El reenvío utiliza los mismos datos. No confirma que exista una
                cuenta para este correo.
              </p>
            </div>
          ) : (
            <>
              <header>
                <h1>Crear perfil cliente</h1>
                <p>
                  Solicita envíos como persona o negocio. El alta depende de la
                  admisión del servicio.
                </p>
              </header>
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault()
                  void submit()
                }}
              >
                <fieldset disabled={busy} className="registration-fields">
                  <p>
                    El registro crea un perfil Personal. Negocio requiere una
                    solicitud y aprobación administrativa.
                  </p>
                  <Link to="/customer/business">Solicitar cuenta Negocio</Link>
                  {field(
                    'email',
                    'Correo electrónico',
                    'tucorreo@ejemplo.com',
                    true,
                    'email',
                  )}
                  {field(
                    'displayName',
                    'Nombre',
                    'Nombre y apellido',
                    true,
                    'name',
                  )}
                  {field(
                    'businessName',
                    'Nombre del negocio (opcional)',
                    'Ej. Pastelería Salgado',
                    false,
                    'organization',
                  )}
                  {failure && (
                    <p role="alert" className="registration-warning">
                      {failure}
                    </p>
                  )}
                  <button
                    className="registration-submit"
                    disabled={busy || !valid}
                    aria-describedby={
                      !valid ? 'registration-required' : undefined
                    }
                  >
                    {busy && (
                      <LoaderCircle
                        size={18}
                        className="registration-spinner"
                        aria-hidden="true"
                      />
                    )}
                    {busy ? 'Enviando…' : 'Solicitar registro'}
                  </button>
                  <p id="registration-required" className="registration-help">
                    Los campos con * son obligatorios.
                  </p>
                </fieldset>
              </form>
              <p className="registration-login">
                ¿Ya tienes cuenta? <Link to="/login">Ya tengo cuenta</Link>
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
