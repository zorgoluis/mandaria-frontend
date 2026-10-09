import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/context'
import { Field, InfoGrid } from '../components/ui'
import { date } from '../utils/format'
import { ApiError } from '../services/errors'
import {
  addLinkMarker,
  linkMarkers,
  removeLinkMarker,
  useLinkMarkers,
} from './markers'
import { locationService } from './service'
import type {
  LinkAttempt,
  LinkMarker,
  LinkMetadata,
  LinkReceipt,
} from './types'
const messages: Record<LinkAttempt['state'], string> = {
  APPLIED_SECRET_UNAVAILABLE:
    'La emisión se aplicó. Su enlace secreto no puede recuperarse. Consulta el estado vigente antes de decidir revocar o sustituirlo.',
  APPLIED_REVOKED:
    'Ese intento revocó el enlace entonces vigente. La metadata actual puede corresponder a un enlace posterior.',
  PENDING_OR_UNKNOWN:
    'Pendiente de reconciliación. No se conoce el resultado; otra emisión permanece bloqueada.',
  SUPERSEDED:
    'La revisión avanzó: el intento original ya no puede aplicar después. No demuestra ausencia de efectos anteriores ni que el enlace actual esté revocado.',
}
function metadata(r: LinkReceipt): LinkMetadata {
  return {
    linkRevision: r.linkRevision,
    linkId: r.linkId,
    status: r.status,
    createdAt: r.createdAt,
    expiresAt: r.expiresAt,
    terminalAccessUntil: r.terminalAccessUntil,
  }
}
export function TrackingLinks({
  publicId,
  terminal,
}: {
  publicId: string
  terminal: boolean
}) {
  const { user } = useAuth()
  // Keyed boundary discards the transient secret immediately on identity/resource change.
  return user?.role === 'CUSTOMER' ? (
    <LinkControls
      key={`${user.id}:${publicId}`}
      actor={user.id}
      publicId={publicId}
      terminal={terminal}
    />
  ) : null
}
function LinkControls({
  actor,
  publicId,
  terminal,
}: {
  actor: string
  publicId: string
  terminal: boolean
}) {
  const pending = useLinkMarkers().filter((m) => m.publicId === publicId)
  const foreign = pending.some((m) => m.actor !== actor)
  const [current, setCurrent] = useState<LinkMetadata>()
  const [url, setUrl] = useState('')
  const [message, setMessage] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [decisionReady, setDecisionReady] = useState(true)
  const locked = useRef(false),
    alive = useRef(true)
  const sequence = useRef(0)
  useLayoutEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  useEffect(() => {
    const seq = ++sequence.current
    void locationService
      .metadata(publicId)
      .then((r) => {
        if (alive.current && seq === sequence.current) setCurrent(metadata(r))
      })
      .catch(() => {
        if (alive.current)
          setMessage(
            'No se pudo consultar el enlace. No se habilitan cambios sin metadata vigente.',
          )
      })
  }, [publicId])
  useEffect(() => {
    const hide = () => setUrl('')
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') hide()
    }
    window.addEventListener('pagehide', hide)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', hide)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
  useEffect(() => {
    if (!current?.expiresAt) return
    const timer = setTimeout(
      () => setUrl(''),
      Math.max(0, Date.parse(current.expiresAt) - Date.now()),
    )
    return () => clearTimeout(timer)
  }, [current?.expiresAt])
  async function guarded(work: () => Promise<void>) {
    if (locked.current || foreign) return
    locked.current = true
    setBusy(true)
    setConfirmed(false)
    sequence.current++
    try {
      if (!navigator.locks) throw Error('No se pudo coordinar el navegador.')
      await navigator.locks.request(
        `mandaria.tracking.${publicId}`,
        { ifAvailable: true },
        async (lock) => {
          if (!lock) throw Error('Otra pestaña está gestionando este enlace.')
          if (
            linkMarkers().some(
              (m) => m.publicId === publicId && m.actor !== actor,
            )
          )
            throw Error('Intento de otra cuenta pendiente.')
          await work()
        },
      )
    } catch {
      if (alive.current)
        setMessage(
          'No se confirmó el resultado. Conservamos el bloqueo si hubo un envío; consulta antes de otra decisión. No borres la recuperación local.',
        )
    } finally {
      locked.current = false
      if (alive.current) setBusy(false)
    }
  }
  async function consult() {
    await guarded(async () => {
      const results: { marker: LinkMarker; result: LinkAttempt }[] = []
      for (const marker of linkMarkers().filter(
        (m) => m.publicId === publicId,
      )) {
        results.push({ marker, result: await locationService.attempt(marker) })
      }
      const fresh = await locationService.metadata(publicId)
      if (!alive.current) return
      setCurrent(metadata(fresh))
      setUrl('')
      for (const { result } of results) {
        if (!messages[result.state]) throw Error('Estado desconocido')
        if (BigInt(fresh.linkRevision) < BigInt(result.linkRevision))
          throw Error('Metadata atrasada')
      }
      for (const { marker, result } of results) {
        if (result.state !== 'PENDING_OR_UNKNOWN') removeLinkMarker(marker.key)
      }
      setDecisionReady(true)
      setMessage(
        results.map(({ result }) => messages[result.state]).join(' ') ||
          'Estado vigente actualizado. Toda nueva emisión requiere tu decisión.',
      )
    })
  }
  async function mutate(operation: LinkMarker['operation']) {
    if (!confirmed || !current || !decisionReady) return
    const expected = current.linkRevision
    await guarded(async () => {
      if (
        operation === 'ISSUE' &&
        linkMarkers().some((m) => m.publicId === publicId)
      )
        return
      const marker: LinkMarker = {
        actor,
        publicId,
        operation,
        key: crypto.randomUUID(),
        expectedLinkRevision: expected,
      }
      addLinkMarker(marker) // Must succeed durably BEFORE sending anything.
      setDecisionReady(false)
      setUrl('')
      let receipt: LinkReceipt
      try {
        receipt = await locationService.mutate(marker)
      } catch (e) {
        if (alive.current)
          setMessage(
            e instanceof ApiError && e.status === 409
              ? 'Conflicto de revisión. Consulta el intento y la metadata; decide nuevamente antes de revocar un enlace posterior.'
              : 'Respuesta no confirmada: el enlace pudo cambiar. Conservamos el bloqueo. Consulta el intento; no vuelvas a emitir a ciegas.',
          )
        return
      }
      if (!alive.current) return
      // Never place the one-time receipt in the query cache or persist it.
      setCurrent(metadata(receipt))
      if (operation === 'ISSUE' && receipt.secretAvailable && receipt.url) {
        const parsed = new URL(receipt.url)
        if (
          ['https:', 'http:'].includes(parsed.protocol) &&
          parsed.pathname === '/track' &&
          !parsed.username &&
          !parsed.password &&
          !parsed.search &&
          /^#t=[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}$/.test(parsed.hash)
        )
          setUrl(receipt.url)
      }
      const fresh = await locationService.metadata(publicId)
      if (!alive.current) return
      if (BigInt(fresh.linkRevision) < BigInt(receipt.linkRevision))
        throw Error('Metadata atrasada')
      setCurrent(metadata(fresh))
      if (fresh.linkRevision !== receipt.linkRevision) setUrl('')
      removeLinkMarker(marker.key)
      setDecisionReady(true)
      setMessage(
        operation === 'ISSUE'
          ? 'Emisión confirmada. El enlace sólo está disponible en esta respuesta; no se podrá recuperar.'
          : 'Revocación confirmada. Consulta cualquier intento anterior pendiente. No se cancela ni revierte una entrega física.',
      )
    })
  }
  const labels = {
    NONE: 'Sin enlace',
    ACTIVE: 'Activo',
    EXPIRED: 'Vencido',
    REVOKED: 'Revocado',
    TERMINAL: 'Acceso final limitado',
  }
  return (
    <section className="panel location-panel" aria-label="Enlace temporal">
      <h2>Compartir seguimiento</h2>
      <p>
        Quien tenga el enlace podrá consultar el seguimiento autorizado. Emitir
        otro sustituye el anterior. No comparte contactos ni pagos.
      </p>
      {current && (
        <InfoGrid
          items={[
            ['Estado vigente', labels[current.status]],
            ['Creado', date(current.createdAt)],
            ['Caduca', date(current.expiresAt)],
            ['Acceso final hasta', date(current.terminalAccessUntil)],
          ]}
        />
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {foreign ? (
        <p>
          Hay un intento pendiente de otra cuenta. Inicia sesión como su titular
          para reconciliarlo.
        </p>
      ) : (
        <>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void consult()}
          >
            Consultar estado e intentos
          </button>
          {pending.length > 0 && (
            <p>
              Pendiente de reconciliación. Otra emisión está bloqueada, también
              después de recargar.
            </p>
          )}
          {current && (
            <>
              <p>
                Revocar usa la revisión consultada y puede cerrar técnicamente
                una emisión incierta. No deshace entregas físicas ni cobros. Si
                cambia la revisión, consulta y decide nuevamente.
              </p>
              <Field label="Confirmo cambiar el enlace vigente con esta revisión">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={busy}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
              </Field>
              <div className="actions">
                <button
                  className="button"
                  disabled={
                    busy ||
                    !confirmed ||
                    !decisionReady ||
                    pending.length > 0 ||
                    terminal
                  }
                  onClick={() => void mutate('ISSUE')}
                >
                  Emitir o sustituir enlace
                </button>
                <button
                  className="button secondary"
                  disabled={busy || !confirmed || !decisionReady}
                  onClick={() => void mutate('REVOKE')}
                >
                  Revocar enlace / cerrar emisión incierta
                </button>
              </div>
            </>
          )}
        </>
      )}
      {url && !terminal && (
        <div
          className="notice"
          role="region"
          aria-label="Enlace de una sola visualización"
        >
          <p>
            Guarda este enlace ahora. Sólo se muestra una vez. Ciérralo cuando
            termines.
          </p>
          <input aria-label="Enlace temporal generado" readOnly value={url} />
          <button
            className="button secondary"
            onClick={() => {
              void navigator.clipboard.writeText(url).then(
                () => setMessage('Enlace copiado por tu solicitud.'),
                () =>
                  setMessage(
                    'No se pudo copiar. Selecciona el enlace manualmente.',
                  ),
              )
            }}
          >
            Copiar enlace
          </button>
          <button className="button secondary" onClick={() => setUrl('')}>
            Cerrar enlace
          </button>
        </div>
      )}
    </section>
  )
}
