import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ActionForm,
  ErrorState,
  Field,
  InfoGrid,
  Loading,
  Modal,
} from '../components/ui'
import { useFeedback } from '../components/feedback-context'
import { ApiError } from '../services/errors'
import { date } from '../utils/format'
import { webhooks } from './service'
import { refreshWebhooks, webhookQueries } from './queries'
import { uncertainSecret } from './format'
import type { EndpointInput, WebhookEndpoint } from './types'

const fingerprint = (value: WebhookEndpoint | null) =>
  JSON.stringify([value?.url, value?.enabled, value?.updatedAt])
export function WebhookSettings({ id }: { id: string }) {
  const query = useQuery(webhookQueries.endpoint(id))
  const [draft, setDraft] = useState<(EndpointInput & { base: string }) | null>(
    null,
  )
  const saving = useRef(false)
  const notify = useFeedback()
  if (query.isPending) return <Loading />
  if (query.isError)
    return <ErrorState error={query.error} retry={() => void query.refetch()} />
  const endpoint = query.data
  const revision = fingerprint(endpoint)
  const values = draft ?? {
    url: endpoint?.url ?? '',
    enabled: endpoint?.enabled ?? false,
  }
  const conflict = draft !== null && draft.base !== revision
  const change = (next: Partial<EndpointInput>) =>
    setDraft({ ...values, base: draft?.base ?? revision, ...next })
  return (
    <>
      <div className="panel-toolbar">
        <h3>Destino y envíos</h3>
        <button
          className="button secondary"
          onClick={() => void query.refetch()}
        >
          Actualizar configuración
        </button>
      </div>
      <div className="panel-body">
        {!endpoint && <p role="status">No hay un destino configurado.</p>}
        <p>
          Guardar un destino no comprueba conectividad. Habilitar requiere un
          receptor preparado y el secreto vigente.
        </p>
        <p>
          Deshabilitar conserva los pendientes y no garantiza detener peticiones
          ya en vuelo. Al crear el destino, sólo los eventos posteriores a
          deliverFrom entran automáticamente.
        </p>
        {conflict && (
          <div className="warning notice" role="alert">
            La configuración cambió en el servidor. Tu edición se conserva;
            revisa y carga los datos actuales antes de guardar.
            <button
              type="button"
              className="button secondary"
              onClick={() => setDraft(null)}
            >
              Descartar edición y cargar configuración actual
            </button>
          </div>
        )}
        <ActionForm
          key={draft?.base ?? revision}
          initialDirty={!endpoint || !!draft}
          submitLabel="Guardar webhook"
          onSubmit={async () => {
            if (saving.current || conflict) return
            let url: URL
            try {
              url = new URL(values.url.trim())
            } catch {
              throw new ApiError(400, 'Escribe una URL HTTPS válida.')
            }
            if (
              url.protocol !== 'https:' ||
              url.username ||
              url.password ||
              url.hash
            )
              throw new ApiError(
                400,
                'Usa una URL HTTPS sin credenciales ni fragmentos.',
              )
            saving.current = true
            try {
              await webhooks.save(id, {
                url: values.url.trim(),
                enabled: values.enabled,
              })
              await refreshWebhooks()
              setDraft(null)
              notify('Configuración de webhook guardada.')
            } finally {
              saving.current = false
            }
          }}
        >
          <Field label="URL receptora HTTPS">
            <input
              name="url"
              type="url"
              required
              maxLength={2048}
              value={values.url}
              onChange={(e) => change({ url: e.target.value })}
            />
          </Field>
          <label>
            <input
              name="enabled"
              type="checkbox"
              checked={values.enabled}
              onChange={(e) => change({ enabled: e.target.checked })}
            />{' '}
            Envíos habilitados
          </label>
          {conflict && (
            <p>Guardado bloqueado hasta resolver el cambio remoto.</p>
          )}
        </ActionForm>
        {endpoint && (
          <>
            <InfoGrid
              items={[
                [
                  'Secreto de firma',
                  endpoint.secretConfigured ? 'Configurado' : 'Sin configurar',
                ],
                ['Última generación', date(endpoint.secretSetAt)],
                [
                  'Entrega automática desde (deliverFrom)',
                  date(endpoint.deliverFrom),
                ],
              ]}
            />
            <SecretManager
              key={id}
              id={id}
              configured={endpoint.secretConfigured}
            />
          </>
        )}
      </div>
    </>
  )
}

export function SecretManager({
  id,
  configured,
}: {
  id: string
  configured: boolean
}) {
  const [confirm, setConfirm] = useState(false)
  const [secret, setSecret] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [copied, setCopied] = useState(false)
  const live = useRef(false)
  const epoch = useRef(0)
  const locked = useRef(false)
  const request = useRef<AbortController | null>(null)
  useEffect(() => {
    live.current = true
    const invalidate = () => {
      epoch.current++
      request.current?.abort()
    }
    const hide = () => {
      invalidate()
      setSecret(null)
      setConfirm(false)
      setCopied(false)
    }
    window.addEventListener('pagehide', hide)
    return () => {
      live.current = false
      invalidate()
      window.removeEventListener('pagehide', hide)
    }
  }, [])
  async function issue() {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    setUncertain(false)
    setSecret(null)
    const version = epoch.current
    request.current = new AbortController()
    try {
      const result = await webhooks.issue(id, request.current.signal)
      if (live.current && epoch.current === version) {
        if (!result.secret) throw new Error('Missing secret')
        setSecret(result.secret)
        setConfirm(false)
        setCopied(false)
      }
    } catch {
      if (live.current && epoch.current === version) {
        setUncertain(true)
        setConfirm(false)
      }
    } finally {
      locked.current = false
      if (live.current) {
        setBusy(false)
        void refreshWebhooks()
      }
    }
  }
  return (
    <>
      <p>
        Este secreto firma webhooks; es distinto del clientSecret B2B que
        obtiene tokens de acceso.
      </p>
      {uncertain && (
        <p className="inline-error" role="alert">
          {uncertainSecret}
        </p>
      )}
      <button
        className="button secondary"
        disabled={busy}
        onClick={() => setConfirm(true)}
      >
        {configured ? 'Rotar secreto de firma' : 'Generar secreto de firma'}
      </button>
      {confirm && (
        <Modal
          title={
            configured ? 'Rotar secreto de firma' : 'Generar secreto de firma'
          }
          onClose={() => {
            if (!locked.current) setConfirm(false)
          }}
        >
          <p>
            La rotación reemplaza inmediatamente el secreto anterior, sin
            convivencia. Coordina el receptor: una petición en vuelo todavía
            puede estar firmada con el anterior.
          </p>
          <p>
            Se mostrará una sola vez. Una respuesta perdida puede dejar el
            secreto cambiado sin que recibas el valor. No se reintentará
            automáticamente.
          </p>
          <div className="form-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setConfirm(false)}
            >
              Cancelar
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => void issue()}
            >
              {busy ? 'Generando…' : 'Confirmar generación única'}
            </button>
          </div>
        </Modal>
      )}
      {secret && (
        <Modal
          title="Guarda el secreto de firma"
          onClose={() => {
            epoch.current++
            setSecret(null)
            setCopied(false)
          }}
        >
          <p className="warning notice">
            Este secreto sólo se mostrará una vez. Guárdalo en la configuración
            privada del backend receptor.
          </p>
          <Field label="Secreto de firma de webhook">
            <textarea
              readOnly
              autoComplete="off"
              spellCheck={false}
              value={secret}
            />
          </Field>
          <button
            className="button secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(secret)
                if (live.current) setCopied(true)
              } catch {
                if (live.current) setCopied(false)
              }
            }}
          >
            Copiar secreto
          </button>
          {copied && (
            <p role="status">
              Copiado. Sustituye el contenido del portapapeles después de
              guardarlo.
            </p>
          )}
          <button
            className="button"
            onClick={() => {
              epoch.current++
              setSecret(null)
              setCopied(false)
            }}
          >
            Ya lo guardé, cerrar
          </button>
        </Modal>
      )}
    </>
  )
}
