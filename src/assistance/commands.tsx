import { Context } from './command-context'
import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Confirm } from '../components/ui'
import { useAuth } from '../auth/context'
import {
  intentStore,
  makeIntent,
  recoverIntent,
  sendIntent,
  attachOriginalFile,
  type Intent,
} from './attempts'
import type { Scope, AttemptReceipt } from './types'
import { assistanceError } from './messages'
import { assistance } from './service'
import { api } from '../services/api'
export function AssistanceCommands({
  scope,
  children,
}: {
  scope: Scope
  children: ReactNode
}) {
  const auth = useAuth(),
    client = useQueryClient(),
    live = useRef(auth.user?.id)
  useEffect(() => {
    live.current = auth.user?.id
  }, [auth.user?.id])
  const [pending, setPending] = useState<Intent | null>(null),
    [draft, setDraft] = useState<Intent | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [receipt, setReceipt] = useState<AttemptReceipt | null>(null),
    [broken, setBroken] = useState(false)
  const [denied, setDenied] = useState(false)
  const deny = useCallback(() => {
    setDenied(true)
    setDraft(null)
  }, [])
  const lock = useRef(false),
    mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const active = () => mounted.current && live.current === scope.actor
  useEffect(() => {
    let valid = true
    intentStore
      .read(scope)
      .then((i) => {
        if (valid) setPending(i)
      })
      .catch(() => {
        if (valid) {
          setBroken(true)
          setMessage(
            'No se pudo leer el intento guardado. Recupera el almacenamiento de esta cuenta antes de enviar otro comando.',
          )
        }
      })
      .finally(() => {
        if (valid) setLoading(false)
      })
    return () => {
      valid = false
    }
  }, [scope])
  const refresh = async () => {
    // Detail already contains the first page of every collection. Refetch it once,
    // then mount collections under its new asOf instead of issuing 15 redundant reads.
    await client.invalidateQueries({
      queryKey: ['assistance'],
      predicate: (q) => !q.queryKey.includes('collection'),
    })
    await client.invalidateQueries({ queryKey: ['fleet'] })
  }
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    try {
      await action()
    } catch (e) {
      if (active()) setMessage(assistanceError(e))
    } finally {
      lock.current = false
      if (active()) setBusy(false)
    }
  }
  const transmit = async (i: Intent) => {
    try {
      const result = await sendIntent(i, scope)
      if (active()) {
        setReceipt({ status: 'APPLIED', receipt: result })
        setMessage(
          i.operation === 'DECLARE_MOVEMENT'
            ? 'Declaración registrada, pendiente de acreditación. No acredita pago ni modifica créditos o entrega.'
            : i.operation === 'DISPUTE'
              ? 'Disputa registrada. No revierte movimientos, devuelve efectivo ni modifica la entrega.'
              : 'Comando aplicado. Revisa el recibo y las proyecciones actualizadas.',
        )
        await refresh()
      }
    } catch (e) {
      if (active()) {
        setReceipt(null)
        setMessage(assistanceError(e))
        await refresh()
      }
    }
  }
  return (
    <Context.Provider
      value={{
        deny,
        blocked: loading || busy || !!pending || !!draft || broken || denied,
        prepare: (operation, caseId, body, ref, file) => {
          if (loading || busy || pending || draft || broken || denied) return
          const i = makeIntent(scope, operation, caseId, body, ref)
          if (file) {
            i.file = file
            i.fileMeta = {
              mime: String(body.mime),
              bytes: Number(body.bytes),
              sha256: String(body.sha256),
            }
          }
          setDraft(i)
        },
      }}
    >
      <section className="notice" aria-label="Recuperación de asistencia">
        <p>
          Asistencia: cada intención conserva su clave y revisión. El cierre
          técnico no libera servicios, concilia dinero ni levanta restricciones.
        </p>
        {message && <p role="status">{message}</p>}
        {pending && (
          <>
            <p>
              Intento pendiente: {pending.operation} · Caso {pending.caseId}.
              Reautenticación sólo con la misma cuenta.
            </p>
            {scope.surface === 'admin' && pending.fileMeta && !pending.file && (
              <label>
                Seleccionar nuevamente el archivo original
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file)
                      void run(async () => {
                        const restored = await attachOriginalFile(pending, file)
                        if (active()) {
                          setPending(restored)
                          setMessage(
                            'Archivo original comprobado. Consulta el intento antes de continuar.',
                          )
                        }
                      })
                    e.target.value = ''
                  }}
                />
                <p>
                  La imagen no se guarda en el navegador. Se verifican tamaño,
                  formato y hash; seleccionar no envía nada.
                </p>
              </label>
            )}
            <button
              className="button secondary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const result = await recoverIntent(pending)
                  if (active()) {
                    setReceipt(result)
                    setMessage(
                      result.status === 'UNKNOWN'
                        ? 'UNKNOWN: no prueba ausencia de efectos.'
                        : result.status === 'PENDING'
                          ? 'PENDING: el comando puede estar en curso.'
                          : assistanceErrorCode(result),
                    )
                    await refresh()
                  }
                })
              }
            >
              Consultar intento
            </button>
            {!receipt || ['UNKNOWN', 'PENDING'].includes(receipt.status) ? (
              <>
                <button
                  className="button secondary"
                  disabled={
                    busy ||
                    !receipt ||
                    receipt.status === 'PENDING' ||
                    (pending.operation === 'SEAL_EVIDENCE' && !pending.file)
                  }
                  onClick={() => setDraft(pending)}
                >
                  Reenviar mismo intento
                </button>
                <button
                  className="button secondary"
                  disabled={busy || !receipt?.canClose}
                  onClick={() =>
                    void run(async () => {
                      const result = await recoverIntent(pending, true)
                      if (active()) {
                        setReceipt(result)
                        setMessage(
                          'Cierre técnico consultado; revisa su resultado.',
                        )
                        await refresh()
                      }
                    })
                  }
                >
                  Cerrar intento técnico
                </button>
              </>
            ) : (
              <button
                className="button"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const r = await recoverIntent(pending)
                    if (
                      !['APPLIED', 'REJECTED', 'CLOSED_NO_EFFECTS'].includes(
                        r.status,
                      )
                    )
                      throw Error('El intento sigue sin resultado definitivo.')
                    await intentStore.clear(scope, pending.key)
                    if (active()) {
                      setPending(null)
                      setReceipt(null)
                      setMessage(
                        'Intento resuelto. Revisa el expediente antes de una nueva intención.',
                      )
                      await refresh()
                    }
                  })
                }
              >
                Reconocer resultado y continuar
              </button>
            )}
          </>
        )}
        {receipt && (
          <div>
            <p>Estado del intento: {receipt.status}</p>
            {receipt.error && <p>{assistanceErrorCode(receipt)}</p>}
            {receipt.receipt && (
              <p>
                Recibo: {String(receipt.receipt.receiptId ?? 'redactado')} ·
                Registro:{' '}
                {String(receipt.receipt.recordedAt ?? 'no disponible')}
              </p>
            )}
          </div>
        )}
        {pending &&
          receipt?.status === 'APPLIED' &&
          scope.surface === 'admin' &&
          ['UPLOAD_EVIDENCE', 'SEAL_EVIDENCE'].includes(pending.operation) && (
            <button
              className="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const i = pending,
                    r = await recoverIntent(i),
                    result = r.receipt?.result as
                      Record<string, unknown> | undefined
                  if (r.status !== 'APPLIED' || !result)
                    throw Error(
                      'Recibo redactado o no disponible. No se puede continuar la carga.',
                    )
                  const d = await assistance.detail(scope, i.caseId)
                  let next: Intent
                  if (i.operation === 'UPLOAD_EVIDENCE') {
                    const uploadId = String(result.uploadId ?? '')
                    if (!uploadId || !i.file)
                      throw Error(
                        'No está disponible el archivo original de la reserva.',
                      )
                    const access = await api<{
                      uploadId: string
                      uploadUrl: string
                    }>(
                      `/admin/fleet-assistance-cases/${i.caseId}/evidence-uploads/${uploadId}/access`,
                    )
                    if (
                      access.uploadId !== uploadId ||
                      access.uploadUrl !==
                        `/api/v1/admin/fleet-assistance-cases/${i.caseId}/evidence-uploads/${uploadId}/content`
                    )
                      throw Error('Acceso privado de carga inválido.')
                    next = makeIntent(
                      scope,
                      'SEAL_EVIDENCE',
                      i.caseId,
                      { expectedCaseRevision: d.summary.revision },
                      uploadId,
                    )
                    next.file = i.file
                    next.fileMeta = i.fileMeta
                  } else
                    next = makeIntent(scope, 'RECORD_EVIDENCE', i.caseId, {
                      expectedCaseRevision: d.summary.revision,
                      kind: 'PRIVATE_IMAGE',
                      uploadId: i.ref,
                      observedAt: i.createdAt,
                    })
                  if (active()) {
                    setDraft(next)
                  }
                })
              }
            >
              {pending.operation === 'UPLOAD_EVIDENCE'
                ? 'Preparar envío del archivo original'
                : 'Preparar registro de evidencia sellada'}
            </button>
          )}
      </section>
      {denied ? (
        <section role="alert">
          <p>
            El acceso cambió. Se retiró el expediente privado; la recuperación
            técnica sigue disponible para la misma cuenta.
          </p>
          <button
            className="button secondary"
            onClick={() => window.location.reload()}
          >
            Volver a comprobar acceso
          </button>
        </section>
      ) : (
        children
      )}
      {draft && (
        <Confirm
          title={
            pending?.key === draft.key
              ? 'Reenviar intención original'
              : 'Confirmar intención de asistencia'
          }
          description={`${draft.operation}. ${pending?.key === draft.key ? 'Se repiten únicamente la clave y el contenido originales.' : 'Se conservará esta intención antes de enviarla.'} La autoridad y las precondiciones se validan en el servidor.`}
          onClose={() => {
            if (!busy) setDraft(null)
          }}
          onConfirm={() =>
            run(async () => {
              const i = draft
              if (pending?.key !== i.key) {
                if (pending) {
                  const previous = await recoverIntent(pending)
                  if (previous.status !== 'APPLIED')
                    throw Error(
                      'Recupera el resultado del paso anterior antes de continuar.',
                    )
                  await intentStore.save(i, pending.key)
                } else await intentStore.save(i)
                if (!active()) return
                setPending(i)
                setReceipt(null)
              }
              setDraft(null)
              await transmit(i)
            })
          }
        />
      )}
    </Context.Provider>
  )
}
function assistanceErrorCode(r: AttemptReceipt) {
  return r.error
    ? `Rechazado: ${r.error.code}. Revisa los hechos antes de continuar.`
    : `Resultado: ${r.status}`
}
