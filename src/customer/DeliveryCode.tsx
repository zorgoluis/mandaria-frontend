import { useEffect, useRef, useState } from 'react'
import './delivery-code.css'
import { useAuth } from '../auth/context'
import { sessionFence } from '../services/api'
import { ApiError } from '../services/errors'
import { customer } from './service'
import {
  confirmation,
  confirmationLabel,
  deliveryCodeFormat,
} from '../execution/delivery-confirmation'

export function DeliveryCode({
  publicId,
  metadata,
  terminal,
}: {
  publicId: string
  metadata: unknown
  terminal: boolean
}) {
  const { user, expired, loading } = useAuth()
  if (user?.role !== 'CUSTOMER' || expired || loading) return null
  return (
    <PrivateCode
      key={user.id + publicId + String(terminal) + JSON.stringify(metadata)}
      publicId={publicId}
      metadata={metadata}
      terminal={terminal}
    />
  )
}
function PrivateCode({
  publicId,
  metadata,
  terminal,
}: {
  publicId: string
  metadata: unknown
  terminal: boolean
}) {
  const [code, setCode] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const request = useRef<AbortController | null>(null)
  useEffect(() => {
    const hide = () => {
      request.current?.abort()
      setCode('')
      setBusy(false)
    }
    window.addEventListener('blur', hide)
    return () => {
      request.current?.abort()
      window.removeEventListener('blur', hide)
    }
  }, [])
  const policy = confirmation(metadata)
  return (
    <section
      className="panel panel-body delivery-code"
      aria-label="Código de entrega"
    >
      <h2>Código de entrega</h2>
      <p>{confirmationLabel(metadata)}</p>
      {!terminal && policy?.policy === 'REQUIRED' && (
        <>
          <p>
            Compártelo con el repartidor únicamente al recibir el producto. Si
            el pedido es para otra persona, comunícale el código a quien lo
            recibirá.
          </p>
          {code && (
            <output aria-label="Código privado de entrega">{code}</output>
          )}
          <button
            className="button secondary"
            disabled={busy}
            onClick={async () => {
              request.current?.abort()
              const controller = new AbortController()
              request.current = controller
              const authorize = sessionFence()
              setCode('')
              setError('')
              setBusy(true)
              try {
                const r = await customer.deliveryCode(
                  publicId,
                  controller.signal,
                )
                authorize()
                if (controller.signal.aborted) return
                if (
                  r.publicId !== publicId ||
                  typeof r.deliveryCode !== 'string' ||
                  !deliveryCodeFormat(r.deliveryCode)
                )
                  throw Error('Invalid response')
                setCode(r.deliveryCode)
              } catch (e) {
                if (controller.signal.aborted) return
                setCode('')
                setError(
                  e instanceof ApiError &&
                    e.code === 'DELIVERY_CODE_NOT_REQUIRED'
                    ? 'Esta solicitud no requiere código.'
                    : e instanceof ApiError &&
                        e.code === 'DELIVERY_CODE_UNAVAILABLE'
                      ? 'El código ya no está disponible.'
                      : e instanceof ApiError && e.status === 404
                        ? 'Solicitud no disponible para esta cuenta.'
                        : e instanceof ApiError && [401, 403].includes(e.status)
                          ? 'Acceso no autorizado. Revisa tu sesión.'
                          : 'No se pudo consultar el código. Actualiza la solicitud antes de continuar.',
                )
              } finally {
                if (!controller.signal.aborted) setBusy(false)
              }
            }}
          >
            Consultar código de entrega
          </button>
          {code && (
            <button className="button secondary" onClick={() => setCode('')}>
              Ocultar código
            </button>
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
