import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/context'
import { Modal } from '../components/ui'
import { useHistoricalMarkers } from './historical-store'
import { reconcileHistoricalAdvance } from './commands'

export function HistoricalAdvanceRecovery() {
  const { user } = useAuth()
  const current = useRef(user)
  useEffect(() => {
    current.current = user
    return () => {
      current.current = null
    }
  }, [user])
  const state = useHistoricalMarkers()
  const [closing, setClosing] = useState<{ key: string; actor: string } | null>(
    null,
  )
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  if (user?.role !== 'PROVIDER_ADMIN') return null
  async function inspect(key: string, actor: string, close = false) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    try {
      await reconcileHistoricalAdvance(
        key,
        actor,
        'PROVIDER_ADMIN',
        () =>
          current.current?.id === actor &&
          current.current?.role === 'PROVIDER_ADMIN',
        close,
      )
    } finally {
      lock.current = false
      setBusy(false)
      if (close) setClosing(null)
    }
  }
  return (
    <>
      {state.unavailable && (
        <p role="alert">
          Pendiente de reconciliación: no se puede leer el registro histórico
          local. No borres el almacenamiento para reintentar.
        </p>
      )}
      {state.markers
        .filter((m) => m.actor === user.id)
        .map((m) => (
          <section
            className="warning notice"
            key={m.key}
            aria-label="Avance histórico pendiente"
          >
            <strong>Pendiente de reconciliación: avance histórico</strong>
            <p>
              Consulta el recibo original. Este marcador se conserva tras
              recarga y cierre de sesión. No permite reenviar el avance ni
              operar en nombre del repartidor.
            </p>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => void inspect(m.key, user.id)}
            >
              Consultar avance histórico
            </button>{' '}
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setClosing({ key: m.key, actor: user.id })}
            >
              Cerrar intento histórico
            </button>
          </section>
        ))}
      {closing && closing.actor === user.id && (
        <Modal
          title="Cerrar intento histórico"
          onClose={() => {
            if (!busy) setClosing(null)
          }}
        >
          <p>
            Si el avance ya se registró, se consultará su recibo. En caso
            contrario, este cierre impide que la clave histórica aplique efectos
            posteriormente.
          </p>
          <p>
            No cancela ni revierte una recogida, traslado o entrega física. No
            habilita nuevos avances del proveedor.
          </p>
          <button
            className="button danger"
            disabled={busy}
            onClick={() => void inspect(closing.key, user.id, true)}
          >
            Confirmar cierre histórico
          </button>
        </Modal>
      )}
    </>
  )
}
