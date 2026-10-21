import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/context'
import { Field } from '../components/ui'
import { Form } from './common'
import { labels, message } from './format'
import { useCommand } from './hooks'
import { putEvidence, validateFile, verification } from './service'
import type { Requirements, VerificationCase } from './types'
type EvidenceProps = {
  record: VerificationCase
  requirements: Requirements
  canWrite: boolean
  disabled?: boolean
  removalDisabled?: boolean
}
export function Evidence(props: EvidenceProps) {
  const { user } = useAuth()
  // A different actor/case owns a different selection and async lifecycle.
  return <EvidenceSession key={user?.id + ':' + props.record.id} {...props} />
}
function EvidenceSession({
  record,
  requirements,
  canWrite,
  disabled = false,
  removalDisabled = disabled,
}: EvidenceProps) {
  const command = useCommand()
  const { user } = useAuth()
  const scope = user?.id + ':' + record.id
  const current = useRef(scope)
  useEffect(() => {
    current.current = scope
    return () => {
      current.current = ''
    }
  }, [scope])
  const [preview, setPreview] = useState<{ url: string; id: string } | null>(
    null,
  )
  const [error, setError] = useState('')
  const [previewLoaded, setPreviewLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const request = useRef<AbortController | null>(null)
  const urlRef = useRef<string | null>(null)
  const clear = () => {
    request.current?.abort()
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = null
    setPreview(null)
    setPreviewLoaded(false)
  }
  useEffect(
    () => () => {
      request.current?.abort()
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    },
    [scope],
  )
  const categories =
    record.subjectType === 'REPRESENTATIVE'
      ? (requirements.representative?.categories || []).filter(
          (c) =>
            record.data.capacity !== 'SELF' ||
            c !== 'REPRESENTATION_AUTHORITY_PAGE',
        )
      : record.subjectType === 'DRIVER_IDENTITY'
        ? [
            ...requirements.identity.required,
            ...(record.data.license
              ? [requirements.identity.motorizedLicense]
              : []),
          ]
        : [
            ...requirements.vehicle.required,
            requirements.vehicle[record.data.ownershipEvidenceType || 'OWNED'],
          ]
  return (
    <section className="panel panel-body">
      <h2>Evidencias privadas</h2>
      <p>
        JPEG/PNG, máximo {requirements.maxBytes} bytes y{' '}
        {requirements.maxPixels} píxeles; {requirements.maxFiles} intentos por
        expediente, incluidos retirados. No PDF ni antimalware. VALIDATED
        significa formato decodificado, no identidad aprobada.
      </p>
      {canWrite && record.status === 'DRAFT' && (
        <Form
          label={
            record.environment === 'LOCAL_TEST'
              ? 'Cargar imagen sintética'
              : 'Cargar imagen'
          }
          disabled={disabled || command.blocked || command.busy || busy}
          onSubmit={async (d) => {
            const file = d.get('file')
            if (!(file instanceof File))
              throw new Error('Selecciona una imagen.')
            validateFile(file, requirements)
            if (record.attachments.length >= requirements.maxFiles)
              throw new Error(
                'Se alcanzó el límite de archivos. Solicita orientación; no omitas páginas indispensables ni reduzcas su legibilidad.',
              )
            const controller = new AbortController()
            request.current = controller
            const owner = scope
            setBusy(true)
            try {
              const upload = await command.send(
                'CREATE_UPLOAD',
                record.id,
                `/verification-cases/${record.id}/uploads`,
                {
                  expectedVersion: record.revision,
                  category: String(d.get('category')),
                },
              )
              if (current.current !== owner || controller.signal.aborted)
                throw new Error(
                  'Carga interrumpida. Consulta el adjunto incompleto antes de continuar.',
                )
              if (!upload.uploadUrl || !upload.expiresAt)
                throw new Error(
                  'No se recibió URL vigente. Consulta el adjunto incompleto.',
                )
              await putEvidence(
                upload.uploadUrl,
                file,
                upload.expiresAt,
                controller.signal,
              )
              if (current.current !== owner || controller.signal.aborted)
                throw new Error(
                  'Carga interrumpida. Consulta el adjunto incompleto antes de continuar.',
                )
              const latest = await verification.get(
                record.id,
                controller.signal,
              )
              if (current.current !== owner || controller.signal.aborted)
                throw new Error(
                  'Carga interrumpida. Consulta el adjunto incompleto antes de continuar.',
                )
              await command.send(
                'COMPLETE_UPLOAD',
                record.id,
                `/verification-cases/${record.id}/uploads/${upload.id}/complete`,
                { expectedVersion: latest.revision },
              )
            } finally {
              if (current.current === owner) setBusy(false)
            }
          }}
        >
          <Field label="Categoría *">
            <select name="category">
              {categories.map((c) => (
                <option key={c} value={c}>
                  {labels[c] || c}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={
              record.environment === 'LOCAL_TEST'
                ? 'Imagen sintética *'
                : 'Imagen *'
            }
          >
            <input
              name="file"
              type="file"
              accept="image/jpeg,image/png"
              required
            />
          </Field>
        </Form>
      )}
      {busy && (
        <button type="button" onClick={() => request.current?.abort()}>
          Cancelar transferencia de archivo
        </button>
      )}
      <p>
        Cancelar la carga no retira el expediente ni elimina el objeto. Si quedó
        incompleto, consulta o retira su referencia en el borrador.
      </p>
      <ul className="verification-files">
        {record.attachments.map((a) => (
          <li key={a.id}>
            <strong>{labels[a.category] || a.category}</strong> ·{' '}
            {labels[a.status] || a.status}
            {a.status === 'VALIDATED' && (
              <button
                onClick={async () => {
                  clear()
                  setError('')
                  const controller = new AbortController()
                  request.current = controller
                  const owner = scope
                  try {
                    const blob = await verification.access(
                      record.id,
                      a.id,
                      controller.signal,
                    )
                    if (controller.signal.aborted || current.current !== owner)
                      return
                    const url = URL.createObjectURL(blob)
                    urlRef.current = url
                    setPreview({ url, id: a.id })
                  } catch (e) {
                    if (
                      !controller.signal.aborted &&
                      current.current === owner
                    ) {
                      clear()
                      setError(message(e))
                    }
                  }
                }}
              >
                Ver evidencia
              </button>
            )}
            {canWrite &&
              record.status === 'DRAFT' &&
              a.status === 'CREATED' && (
                <Form
                  label="Consultar y completar carga"
                  disabled={disabled || command.blocked || command.busy}
                  onSubmit={async () => {
                    const latest = await verification.get(record.id)
                    await command.send(
                      'COMPLETE_UPLOAD',
                      record.id,
                      `/verification-cases/${record.id}/uploads/${a.id}/complete`,
                      { expectedVersion: latest.revision },
                    )
                  }}
                />
              )}
            {canWrite &&
              record.status === 'DRAFT' &&
              a.status !== 'REMOVED' && (
                <Form
                  label="Retirar referencia del borrador"
                  disabled={removalDisabled || command.blocked || command.busy}
                  onSubmit={() =>
                    command.send(
                      'REMOVE_ATTACHMENT',
                      record.id,
                      `/verification-cases/${record.id}/attachments/${a.id}`,
                      { expectedVersion: record.revision },
                      'DELETE',
                    )
                  }
                />
              )}
          </li>
        ))}
      </ul>
      {error && <p role="alert">{error}</p>}
      {preview && (
        <figure>
          <img
            className="verification-preview"
            src={preview.url}
            alt="Evidencia privada del expediente"
            onLoad={() => setPreviewLoaded(true)}
            onError={() => {
              clear()
              setError(
                'No se pudo mostrar la imagen. Consulta de nuevo; si persiste, informa a soporte.',
              )
            }}
          />
          <figcaption>
            {previewLoaded
              ? 'Imagen normalizada recibida por proxy autenticado.'
              : 'Cargando vista previa...'}
          </figcaption>
          <button onClick={clear}>Cerrar evidencia</button>
        </figure>
      )}
    </section>
  )
}
