import { message } from './format'
import { useCommand } from './hooks'
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { Confirm } from '../components/ui'
import { reconcile, useMarkers } from './pending'
import type { Marker, PublicationReceipt } from './types'
import { documentaryAvailability } from './availability'
import { useRequirements } from './use-availability'
import { useQueryClient } from '@tanstack/react-query'
import { vkey } from './format'
export function Warning() {
  const { user } = useAuth()
  const runtime = useRequirements()
  const state = user ? documentaryAvailability(runtime) : null
  return (
    <aside className="notice" aria-label="Aviso de verificación documental">
      {state?.text && (
        <p
          role={
            state.kind === 'error' || state.kind === 'disabled'
              ? 'alert'
              : 'status'
          }
        >
          {state.text}
        </p>
      )}
      {state && !state.canProceed && (
        <button
          type="button"
          disabled={runtime.isFetching}
          onClick={() => void runtime.refetch()}
        >
          Consultar disponibilidad
        </button>
      )}
      <p>
        <strong>Verificación documental.</strong> Aceptar términos o cargar
        archivos no aprueba el expediente ni habilita operaciones. La baja y sus
        constancias tienen alcance limitado y seguimiento independiente.{' '}
        <Link to="/privacy/deletion">Baja y privacidad</Link>
      </p>
    </aside>
  )
}
export function Form({
  children,
  label,
  onSubmit,
  disabled = false,
}: {
  children?: ReactNode
  label: string
  onSubmit: (data: FormData) => Promise<unknown>
  disabled?: boolean
}) {
  const [error, setError] = useState('')
  const [result, setResult] = useState('')
  const [uploading, setUploading] = useState('')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const lifecycle = useRef<symbol | null>(null)
  const selections = useRef(new WeakMap<HTMLInputElement, number>())
  useEffect(() => {
    lifecycle.current = Symbol()
    return () => {
      lifecycle.current = null
    }
  }, [])
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (lock.current || disabled) return
    lock.current = true
    const owner = lifecycle.current
    setBusy(true)
    setError('')
    setResult('')
    const form = e.currentTarget
    // Capture the selection, not just metadata: distinct files may share it.
    const files = Array.from(
      form.querySelectorAll<HTMLInputElement>('input[type=file]'),
    ).map((input) => ({
      input,
      selection: selections.current.get(input),
      file: input.files?.[0],
    }))
    const names = files
      .flatMap(({ file }) => (file ? [file.name] : []))
      .join(', ')
    setUploading(names)
    try {
      await onSubmit(new FormData(form))
      if (lifecycle.current !== owner) return
      let newerSelection = false
      files.forEach(({ input, selection }) => {
        if (selections.current.get(input) === selection) input.value = ''
        else newerSelection = true
      })
      form
        .querySelectorAll<HTMLInputElement>('input[type=password]')
        .forEach((input) => {
          input.value = ''
        })
      if (names)
        setResult(
          `Carga confirmada: ${names}.` +
            (newerSelection
              ? ' La selección posterior sigue pendiente; no se ha enviado.'
              : ''),
        )
    } catch (err) {
      if (lifecycle.current === owner)
        setError((names ? `Carga de ${names}: ` : '') + message(err))
    } finally {
      if (lifecycle.current === owner) {
        setBusy(false)
        setUploading('')
        lock.current = false
      }
    }
  }
  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="verification-form"
      onChangeCapture={(e) => {
        const input = e.target
        if (input instanceof HTMLInputElement && input.type === 'file') {
          selections.current.set(
            input,
            (selections.current.get(input) ?? 0) + 1,
          )
        }
      }}
    >
      {children}
      {busy && uploading && (
        <p role="status">
          Cargando: {uploading}. Otra selección quedará pendiente hasta que la
          envíes.
        </p>
      )}
      {result && <p role="status">{result}</p>}
      {error && <p role="alert">{error}</p>}
      <button className="button" disabled={disabled || busy}>
        {busy ? 'Procesando…' : label}
      </button>
    </form>
  )
}

export function Recovery() {
  const client = useQueryClient()
  const { user } = useAuth()
  const { items, unavailable } = useMarkers()
  const { refresh } = useCommand()
  const [closing, setClosing] = useState<Marker | null>(null)
  const [busy, setBusy] = useState(false)
  const [text, setText] = useState('')
  const [publication, setPublication] = useState<{
    actor: string
    receipt: PublicationReceipt
  } | null>(null)
  const lock = useRef(false)
  const current = useRef(user?.id)
  useEffect(() => {
    current.current = user?.id
    return () => {
      current.current = undefined
    }
  }, [user?.id])
  const act = async (m: Marker, close = false) => {
    if (lock.current || !user) return
    lock.current = true
    setBusy(true)
    try {
      const state = await reconcile(
        m,
        user.id,
        refresh,
        close,
        (receipt) => {
          if (current.current === user.id)
            setPublication({ actor: user.id, receipt })
        },
        (receipt) => {
          if (current.current === user.id)
            client.setQueryData(
              vkey(user.id, 'representative-privacy-ack', receipt.subjectId),
              receipt,
            )
        },
      )
      if (current.current === user.id)
        setText(
          state === 'ABSENT'
            ? 'Pendiente de reconciliación: ABSENT no demuestra fracaso. Puedes consultar o cerrar explícitamente.'
            : state === 'APPLIED'
              ? ['LINK_REPRESENTATIVE', 'REVOKE_REPRESENTATIVE'].includes(
                  m.operation,
                )
                ? 'Comprobante histórico recuperado. Las vistas autorizadas se actualizaron; el recibo no acredita facultades vigentes.'
                : 'Comprobante histórico recuperado; estado vigente consultado. No se repitió la operación.'
              : 'Intento técnico cerrado sin efectos. Puedes preparar otra intención explícitamente.',
        )
    } catch (e) {
      if (current.current === user.id) setText(message(e))
    } finally {
      setBusy(false)
      lock.current = false
      setClosing(null)
    }
  }
  return (
    <>
      {unavailable && (
        <p role="alert">
          No se pueden leer los marcadores. Acciones documentales bloqueadas; no
          borres el almacenamiento para repetir.
        </p>
      )}
      {items.some((m) => m.actor !== user?.id) && (
        <p role="alert">
          Hay un intento pendiente de otra cuenta. Vuelve con la cuenta
          iniciadora; no se puede eludir cambiando de usuario.
        </p>
      )}
      {items
        .filter((m) => m.actor === user?.id)
        .map((m) => (
          <section className="notice" key={m.key}>
            <h2>Pendiente de reconciliación</h2>
            <p>
              La operación pudo aplicarse. Conservamos sólo su referencia y
              clave, no el formulario ni archivos.
            </p>
            <button disabled={busy} onClick={() => void act(m)}>
              Consultar intento
            </button>{' '}
            <button disabled={busy} onClick={() => setClosing(m)}>
              Cerrar intento técnico
            </button>
          </section>
        ))}
      {text && <p role="status">{text}</p>}
      {publication?.actor === user?.id && publication && (
        <section className="notice">
          <h2>Publicación recuperada · fotografía histórica</h2>
          <p>
            {publication.receipt.scope} · {publication.receipt.version} ·
            revisión {publication.receipt.policyRevision}. Puede existir una
            publicación vigente posterior. No acredita aprobación jurídica ni
            activación.
          </p>
        </section>
      )}
      {closing && (
        <Confirm
          title="Cerrar intento técnico"
          description="Este cierre no retira el expediente, no revierte una decisión ni elimina archivos. Puede recuperar una operación ya aplicada. Si la respuesta se pierde, conservarás el bloqueo y deberás consultar."
          label="Confirmar cierre técnico"
          onClose={() => setClosing(null)}
          onConfirm={() => act(closing, true)}
        />
      )}
      <p>
        <Link to="/profile">Mi cuenta</Link>
      </p>
    </>
  )
}
