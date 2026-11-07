import { PHOTO_ACCEPT, preparePhoto } from './prepare-photo'
import { unitRequirements } from './unit-requirements'
import { EvidencePicker } from './evidence-picker'
import { uploadQuota } from './upload-quota'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/context'
import { Field } from '../components/ui'
import { Form } from './common'
import { labels, message } from './format'
import { useCommand } from './hooks'
import { putEvidence, verification } from './service'
import type { Requirements, VerificationCase } from './types'
const documentHints: Record<string, string> = {
  FACE_PHOTO: 'Una foto de tu cara, de frente y con buena luz.',
  INE_FRONT: 'Fotografía el lado de tu INE donde aparece tu rostro.',
  INE_BACK: 'Fotografía el otro lado de tu INE. Incluye las cuatro esquinas.',
  LICENSE: 'Sube una imagen legible de la licencia que registraste.',
  REGISTRATION_CARD: 'Fotografía la tarjeta de circulación de esta unidad.',
  RENTAL_CONTRACT:
    'Sube una imagen legible del contrato de renta de esta unidad.',
  OWNER_AUTHORIZATION:
    'Sube la autorización del titular para usar esta unidad prestada.',
}
type EvidenceProps = {
  designed?: boolean
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
  designed = false,
  requirements,
  canWrite,
  disabled = false,
  removalDisabled = disabled,
}: EvidenceProps) {
  const [selectionVersion, setSelectionVersion] = useState(0)
  const [selectionValid, setSelectionValid] = useState(false)
  const command = useCommand()
  const quota = uploadQuota(record, requirements)
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
        : unitRequirements(requirements, record).categories
  return (
    <section
      className="panel panel-body"
      id={designed ? 'documentos-expediente' : undefined}
      tabIndex={designed ? -1 : undefined}
    >
      <h2>
        {designed && <span className="documentary-step">2</span>}Evidencias
        privadas
      </h2>
      {designed ? (
        <>
          <div className="identity-limit-chips">
            <span>
              {requirements.formats
                .filter((f) => ['image/jpeg', 'image/png'].includes(f))
                .map((f) => (f === 'image/jpeg' ? 'JPEG' : 'PNG'))
                .join(' / ')}
            </span>
            <span>
              Máx. {requirements.maxBytes / 1048576} MB ·{' '}
              {requirements.maxPixels / 1000000} MP
            </span>
            <span>
              {requirements.maxFiles}{' '}
              {quota.validatedOnly ? 'imágenes guardadas' : 'intentos'} por
              expediente
            </span>
          </div>
          <p className="identity-note">
            Las fotos de cámara JPEG, PNG o HEIC/HEIF se preparan en tu
            dispositivo. Comprueba que el texto sea legible. Una vez cargada la
            imagen, el equipo revisará su contenido cuando envíes el expediente.
          </p>
          {record.subjectType === 'VEHICLE' &&
            record.status === 'DRAFT' &&
            !categories.length &&
            !unitRequirements(requirements, record).blocked && (
              <p>
                Con los datos guardados de esta unidad, no se requieren
                imágenes.
              </p>
            )}
        </>
      ) : (
        <p>
          JPEG/PNG, máximo {requirements.maxBytes} bytes y{' '}
          {requirements.maxPixels} píxeles; {requirements.maxFiles}{' '}
          {quota.validatedOnly
            ? 'imágenes guardadas por expediente.'
            : 'intentos por expediente, incluidos retirados.'}{' '}
          No PDF ni antimalware. VALIDATED significa formato decodificado, no
          identidad aprobada.
        </p>
      )}
      {quota.validatedOnly && (
        <p>Las cargas incompletas y las imágenes retiradas no consumen cupo.</p>
      )}
      {canWrite && record.status === 'DRAFT' && categories.length > 0 && (
        <Form
          label={
            record.environment === 'LOCAL_TEST'
              ? 'Cargar imagen sintética'
              : 'Cargar imagen'
          }
          disabled={
            disabled ||
            command.blocked ||
            command.busy ||
            busy ||
            (designed && (!selectionValid || quota.full))
          }
          onSubmit={async (d) => {
            const file = d.get('file')
            if (!(file instanceof File))
              throw new Error('Selecciona una imagen.')
            if (!categories.includes(String(d.get('category'))))
              throw new Error('Categoría no disponible para nuevas cargas.')
            if (quota.full)
              throw new Error(
                quota.validatedOnly
                  ? 'Se alcanzó el cupo de imágenes guardadas. Revisa y retira sólo imágenes que no necesites antes de volver a cargar.'
                  : 'Se alcanzó el límite de archivos. Solicita orientación; no omitas páginas indispensables ni reduzcas su legibilidad.',
              )
            const controller = new AbortController()
            request.current = controller
            const owner = scope
            setBusy(true)
            try {
              const prepared = await preparePhoto(
                file,
                requirements,
                controller.signal,
              )
              if (current.current !== owner || controller.signal.aborted) return
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
                  'Operación registrada sin URL de carga vigente. Consulta el expediente; no se enviará el archivo ni se creará otra operación automáticamente.',
                )
              await putEvidence(
                upload.uploadUrl,
                prepared,
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
              if (current.current === owner) {
                setSelectionValid(false)
                setSelectionVersion((v) => v + 1)
              }
            } finally {
              if (current.current === owner) setBusy(false)
            }
          }}
        >
          {designed ? (
            <fieldset className="identity-categories">
              <legend>Elige el documento que vas a subir</legend>
              <div role="radiogroup" aria-label="Categoría">
                {categories.map((c, i) => {
                  const attachments = record.attachments.filter(
                    (a) => a.category === c,
                  )
                  const received = attachments.some(
                    (a) => a.status === 'VALIDATED',
                  )
                  const incomplete = attachments.some(
                    (a) => a.status === 'CREATED',
                  )
                  const hint =
                    incomplete && !received
                      ? quota.validatedOnly
                        ? 'Puedes usar «Consultar y completar carga» abajo o elegir otra foto para iniciar una nueva carga.'
                        : 'Usa «Consultar y completar carga» en el archivo de abajo.'
                      : documentHints[c]
                  return (
                    <label key={c}>
                      <input
                        type="radio"
                        name="category"
                        value={c}
                        defaultChecked={i === 0}
                        aria-label={labels[c] || c}
                        aria-describedby={'documento-' + c}
                      />
                      <span className="case-document">
                        <strong>{labels[c] || c}</strong>
                        <span id={'documento-' + c}>
                          <b>
                            {received
                              ? 'Imagen recibida'
                              : incomplete
                                ? 'Carga incompleta'
                                : 'Falta subir'}
                          </b>
                          {hint && ' · ' + hint}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
          ) : (
            <Field label="Categoría *">
              <select name="category">
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {labels[c] || c}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {designed ? (
            <EvidencePicker
              key={selectionVersion}
              requirements={requirements}
              busy={busy}
              onValid={setSelectionValid}
            />
          ) : (
            <Field
              label={
                record.environment === 'LOCAL_TEST'
                  ? 'Imagen sintética *'
                  : 'Imagen *'
              }
            >
              <input name="file" type="file" accept={PHOTO_ACCEPT} required />
            </Field>
          )}
          {designed && command.blocked && !busy && (
            <p role="status">
              Para habilitar la carga,{' '}
              <a href="#verification-status">
                revisa el aviso de recuperación al inicio de esta página
              </a>
              . La vista previa no confirma que la imagen esté guardada.
            </p>
          )}
        </Form>
      )}
      {designed && quota.remaining <= 3 && (
        <p role="status">
          {quota.validatedOnly ? 'Espacios disponibles' : 'Intentos restantes'}:{' '}
          {quota.remaining} de {requirements.maxFiles}
          {quota.full &&
            (quota.validatedOnly
              ? ' · Revisa las imágenes guardadas y retira sólo las que no necesites antes de cargar otra.'
              : ' · Límite alcanzado. Si falta un documento, solicita orientación.')}
        </p>
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
              a.status === 'CREATED' &&
              a.category !== 'OWNERSHIP_PROOF' && (
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
