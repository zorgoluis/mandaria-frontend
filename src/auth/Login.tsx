import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Eye, EyeOff, ShieldCheck, Route } from 'lucide-react'
import { useAuth } from './context'
import { ActionForm, Field } from '../components/ui'
export function Login() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)
  if (auth.user) return <Navigate to="/dashboard" replace />
  return (
    <div className="login-page">
      <section className="login-story">
        <div className="brand">
          <img
            className="brand-mark"
            src="/mandaria.svg"
            alt=""
            width={35}
            height={35}
          />
          mandaria<span className="brand-period">.</span>
        </div>
        <div className="story-content">
          <span className="eyebrow">CONECTAMOS TU OPERACIÓN</span>
          <h1>
            Todo en orden.
            <br />
            Siempre en
            <br />
            <em>movimiento.</em>
          </h1>
          <p>
            El punto de encuentro entre tus proveedores, integraciones y equipo.
          </p>
          <div className="route-art" aria-hidden="true">
            <span className="route-node">
              <Route size={24} />
            </span>
            <span className="route-line" />
            <span className="route-node end">
              <ArrowUpRight size={28} />
            </span>
          </div>
        </div>
        <small>MANDARIA WEB · PLATAFORMA ADMINISTRATIVA</small>
      </section>
      <section className="login-panel">
        <div className="login-form">
          <span className="eyebrow">BIENVENIDO A MANDARIA</span>
          <h2>Tu operación empieza aquí.</h2>
          <p>Ingresa con tu cuenta Mandaria.</p>
          {auth.expired && (
            <p className="notice" role="status">
              Tu sesión expiró. Inicia sesión nuevamente.
            </p>
          )}
          <ActionForm
            submitLabel="Iniciar sesión"
            initialDirty
            onSubmit={async (data) => {
              await auth.login(
                String(data.get('email')),
                String(data.get('password')),
              )
              navigate('/dashboard', { replace: true })
            }}
          >
            <Field label="Correo electrónico">
              <input
                name="email"
                type="email"
                autoComplete="username"
                placeholder="nombre@empresa.com"
                required
                maxLength={254}
              />
            </Field>
            <Field label="Contraseña">
              <span className="password-field">
                <input
                  name="password"
                  type={visible ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  required
                  maxLength={128}
                />
                <button
                  className="icon-button"
                  type="button"
                  aria-label={
                    visible ? 'Ocultar contraseña' : 'Mostrar contraseña'
                  }
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </Field>
            <div className="login-recovery">
              <Link to="/customer/recovery">¿Olvidaste tu contraseña?</Link>
            </div>
          </ActionForm>
          <section
            className="login-registration"
            aria-labelledby="login-registration-title"
          >
            <h3 id="login-registration-title">
              ¿Aún no tienes perfil de cliente?
            </h3>
            <p>Regístrate como persona o negocio para solicitar envíos.</p>
            <Link className="button secondary" to="/customer/register">
              Crear perfil de cliente
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </section>
          <p className="muted login-invitation">
            ¿Recibiste una invitación? Activa tu cuenta desde el enlace del
            correo antes de iniciar sesión.
          </p>
          <div className="login-security">
            <ShieldCheck size={18} />
            <span>Usa tu cuenta personal para acceder a Mandaria.</span>
          </div>
        </div>
        <small>Mandaria · Logística independiente</small>
      </section>
    </div>
  )
}
