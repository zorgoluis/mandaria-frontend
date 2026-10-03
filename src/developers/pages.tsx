import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { env } from '../config/env'

const assets = '/developers/assets/'
const downloads = [
  'openapi-b2b.json',
  'B2B-PUBLIC-GUIDE.md',
  'B2B-WEBHOOKS.md',
  'examples/b2b-flow.json',
  'examples/verify-mandaria-webhook.mjs',
  'manifest.json',
]
async function asset(name: string) {
  if (!downloads.includes(name)) throw new Error('Unavailable artifact')
  const response = await fetch(assets + name, { credentials: 'omit' })
  if (
    !response.ok ||
    response.headers.get('content-type')?.includes('text/html')
  )
    throw new Error('Unavailable artifact')
  return response.text()
}
export function CopyCode({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const text = typeof children === 'string' ? children : ''
  return (
    <div className="developer-example">
      <button
        className="button secondary small"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text)
            setMessage('Ejemplo copiado.')
          } catch {
            setMessage('No se pudo copiar; selecciona el texto manualmente.')
          }
        }}
      >
        Copiar ejemplo
      </button>
      <span role="status">{message}</span>
      <pre className="developer-code">
        <code>{text}</code>
      </pre>
    </div>
  )
}
const nav = [
  ['', 'Introducción'],
  ['authentication', 'Autenticación y scopes'],
  ['prequotes', 'Precotización y aceptación'],
  ['execution', 'Progreso y resultado'],
  ['webhooks', 'Webhooks'],
  ['errors', 'Errores e idempotencia'],
  ['reference', 'Referencia API'],
] as const
export function DeveloperPortal() {
  return (
    <div className="developer-shell">
      <a className="developer-skip" href="#developer-content">
        Saltar al contenido
      </a>
      <header className="developer-header">
        <Link to="/developers" className="developer-brand">
          Mandaria <span>Developers</span>
        </Link>
        <Link to="/login">Administración</Link>
      </header>
      <div className="developer-layout">
        <nav aria-label="Documentación B2B">
          {nav.map(([path, label]) => (
            <NavLink end key={path} to={`/developers${path ? '/' + path : ''}`}>
              {label}
            </NavLink>
          ))}
        </nav>
        <main id="developer-content" tabIndex={-1}>
          <Routes>
            <Route index element={<Intro />} />
            <Route
              path="authentication"
              element={
                <Guide
                  title="Autenticación y scopes"
                  section="Autenticación y permisos"
                />
              }
            />
            <Route
              path="prequotes"
              element={<Guide title="Precotización, conversión y aceptación" />}
            />
            <Route
              path="errors"
              element={
                <Guide
                  title="Errores e idempotencia"
                  section="Idempotencia y respuestas inciertas"
                />
              }
            />
            <Route
              path="webhooks"
              element={<Guide title="Webhooks" file="B2B-WEBHOOKS.md" />}
            />
            <Route path="reference" element={<Reference />} />
            <Route
              path="execution"
              element={
                <Guide
                  title="Progreso y resultado de ejecución"
                  section="Progreso logístico detallado (aditivo, sin activación)"
                />
              }
            />
            <Route
              path="*"
              element={
                <>
                  <h1>Página no encontrada</h1>
                  <Link to="/developers">Volver a la documentación</Link>
                </>
              }
            />
          </Routes>
        </main>
      </div>
      <footer className="developer-footer">
        Mandaria · API B2B · Documentación server-to-server
      </footer>
    </div>
  )
}
function Intro() {
  return (
    <>
      <p className="developer-eyebrow">INTEGRA TU OPERACIÓN</p>
      <h1>Logística conectada, contratos claros.</h1>
      <p className="developer-lead">
        Conecta tu backend con Mandaria: consulta un precio, confirma las
        condiciones y sigue el resultado de la entrega.
      </p>
      <div className="developer-cards">
        <Link to="/developers/prequotes">
          <h2>Del precio al servicio</h2>
          <p>Precotización → conversión → consentimiento → aceptación.</p>
        </Link>
        <Link to="/developers/webhooks">
          <h2>Recibe el resultado</h2>
          <p>Firma, instantáneas y recepción durable de eventos.</p>
        </Link>
        <Link to="/developers/reference">
          <h2>Contrato descargable</h2>
          <p>Referencia B2B revisada. Sin operaciones internas.</p>
        </Link>
      </div>
      <h2>Conexión de este entorno</h2>
      <p>
        Origen API configurado: <code>{env.apiUrl}</code>. Las rutas incluyen{' '}
        <code>/api/v1</code>. El dominio del portal no se usa como origen
        implícito.
      </p>
      <p>
        API pública confirmada: <code>https://mandaria.com.mx/api/v1</code>.
        Portal: <code>https://mandaria.com.mx/developers</code>. Publicar la
        documentación no activa capacidades ni envíos. Consulta el servidor
        incluido en el JSON en la referencia API antes de importarlo.
      </p>
      <h2>Ejemplo de conexión desde tu backend</h2>
      <CopyCode>{`# Sólo ejemplo: ejecutar desde tu servidor con un token B2B autorizado.
MANDARIA_API_BASE=https://mandaria.com.mx/api/v1
curl "$MANDARIA_API_BASE/integrations/me" \\
  -H "Authorization: Bearer <TOKEN_B2B>"`}</CopyCode>
      <p>
        Los ejemplos son ficticios y copiables. No introduzcas secretos aquí: no
        hay consola de ejecución ni se envían peticiones B2B desde el navegador.
      </p>
    </>
  )
}
function Guide({
  title,
  file = 'B2B-PUBLIC-GUIDE.md',
  section,
}: {
  title: string
  file?: string
  section?: string
}) {
  const query = useQuery({
    queryKey: ['developer-assets', file],
    queryFn: () => asset(file),
    retry: false,
    staleTime: Infinity,
  })
  let body = query.data ?? ''
  if (section) body = body.split(`## ${section}`)[1]?.split('\n## ')[0] ?? ''
  else body = body.replace(/^# .*\n/, '')
  return (
    <article className="developer-prose">
      <h1>{title}</h1>
      {query.isPending ? (
        <p role="status">Cargando documentación…</p>
      ) : query.isError ? (
        <p role="alert">
          No se pudo cargar la guía.{' '}
          <button onClick={() => void query.refetch()}>Reintentar</button>
        </p>
      ) : (
        <Markdown
          remarkPlugins={[remarkGfm]}
          skipHtml
          components={{
            a: ({ href, children }) => {
              if (href === 'B2B-WEBHOOKS.md')
                return <Link to="/developers/webhooks">{children}</Link>
              return href && downloads.includes(href) ? (
                <a href={assets + href} download>
                  {children}
                </a>
              ) : (
                <span>{children}</span>
              )
            },
            pre: ({ children }) => (
              <div className="developer-code-container">{children}</div>
            ),
            code: ({ className, children }) =>
              className || String(children).includes('\n') ? (
                <CopyCode>{String(children)}</CopyCode>
              ) : (
                <code>{children}</code>
              ),
            table: ({ children }) => (
              <div className="table-scroll">
                <table>{children}</table>
              </div>
            ),
          }}
        >
          {body}
        </Markdown>
      )}
      <p>
        <a href={assets + file} download>
          Descargar guía revisada
        </a>
      </p>
    </article>
  )
}
type Operation = {
  summary?: string
  description?: string
  'x-scopes'?: string[]
  parameters?: unknown[]
  requestBody?: unknown
  responses?: unknown
}
interface PublicSpec {
  info: { title: string; version: string }
  servers: { url: string }[]
  paths: Record<string, Record<string, Operation>>
  components: { schemas: Record<string, unknown> }
}
function Reference() {
  const query = useQuery({
    queryKey: ['developer-assets', 'openapi-b2b.json'],
    queryFn: async () =>
      JSON.parse(await asset('openapi-b2b.json')) as PublicSpec,
    retry: false,
    staleTime: Infinity,
  })
  return (
    <>
      <h1>Referencia API B2B</h1>
      <p>
        Origen configurado: <code>{env.apiUrl}</code>. Origen público
        confirmado: <code>https://mandaria.com.mx</code>. Las rutas del contrato
        ya incluyen
        <code> /api/v1</code>; no añadas ese prefijo al servidor del JSON.
      </p>
      {query.data && (
        <p role="status">
          Servidor del artefacto descargable:{' '}
          <code>{query.data.servers[0]?.url ?? 'No declarado'}</code>.
          {query.data.servers[0]?.url !== 'https://mandaria.com.mx' &&
            ' Pendiente de actualización por backend al origen confirmado. Sustituye el servidor al importarlo; la descarga se conserva sin modificaciones manuales.'}
        </p>
      )}
      <div className="row-actions">
        <a className="button" href={assets + 'openapi-b2b.json'} download>
          Descargar OpenAPI B2B
        </a>
        <a href={assets + 'manifest.json'} download>
          Huellas de los artefactos
        </a>
        <a href={assets + 'examples/b2b-flow.json'} download>
          Ejemplos completos
        </a>
      </div>
      {query.isPending ? (
        <p role="status">Cargando referencia…</p>
      ) : query.isError ? (
        <p role="alert">
          No se pudo cargar el contrato.{' '}
          <button onClick={() => void query.refetch()}>Reintentar</button>
        </p>
      ) : (
        <>
          <p>
            Contrato revisado de backend · Versión {query.data.info.version}. La
            versión de paquete no acredita habilitación operativa.
          </p>
          {Object.entries(query.data.paths).flatMap(([path, methods]) =>
            Object.entries(methods).map(([method, op]) => (
              <details className="developer-operation" key={method + path}>
                <summary>
                  <strong>{method.toUpperCase()}</strong> <code>{path}</code>
                </summary>
                <h2>{op.summary}</h2>
                <p>{op.description}</p>
                <p>
                  Scopes:{' '}
                  {op['x-scopes']?.join(', ') ||
                    'Consulta los requisitos de autenticación de la operación.'}
                </p>
                <CopyCode>
                  {JSON.stringify(
                    {
                      parameters: op.parameters,
                      requestBody: op.requestBody,
                      responses: op.responses,
                    },
                    null,
                    2,
                  )}
                </CopyCode>
              </details>
            )),
          )}
          <h2>Esquemas</h2>
          {Object.entries(query.data.components.schemas).map(
            ([name, schema]) => (
              <details className="developer-operation" key={name}>
                <summary>{name}</summary>
                <CopyCode>{JSON.stringify(schema, null, 2)}</CopyCode>
              </details>
            ),
          )}
        </>
      )}
    </>
  )
}
export function DeveloperRedirect() {
  return <Navigate to="/developers" replace />
}
