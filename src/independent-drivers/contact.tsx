import { useEffect, useState } from 'react'
import { useAuth } from '../auth/context'
import { api, sessionFence } from '../services/api'

import {
  declaredContact,
  type AdminIndependentDriverDetail,
} from './contact-contract'

/** No QueryClient: this projection lives only for the mounted authorized detail. */
export function DeclaredPhone({ driverId }: { driverId: string }) {
  const { user, loading, expired } = useAuth()
  if (
    !user ||
    user.role !== 'SUPER_ADMIN' ||
    !user.active ||
    loading ||
    expired
  )
    return null
  return <PrivatePhone key={`${user.id}:${driverId}`} driverId={driverId} />
}
function PrivatePhone({ driverId }: { driverId: string }) {
  const [value, setValue] = useState('Consultando…')
  useEffect(() => {
    let request: AbortController | undefined
    let disposed = false
    const read = async () => {
      request?.abort()
      const current = new AbortController()
      request = current
      const fence = sessionFence()
      setValue('Consultando…')
      try {
        const result = await api<AdminIndependentDriverDetail>(
          `/admin/drivers/${encodeURIComponent(driverId)}/independent`,
          'GET',
          undefined,
          current.signal,
        )
        fence()
        if (disposed || current.signal.aborted) return
        const contact = declaredContact(result.declaredContact)
        setValue(
          contact?.availability === 'AVAILABLE'
            ? contact.phone!
            : contact?.availability === 'NOT_RECORDED'
              ? 'No registrado'
              : 'No disponible',
        )
      } catch {
        if (!disposed && !current.signal.aborted)
          setValue('No se pudo consultar el teléfono')
      }
    }
    void read()
    const refresh = () => {
      void read()
    }
    const timer = window.setInterval(refresh, 15000)
    window.addEventListener('focus', refresh)
    return () => {
      disposed = true
      request?.abort()
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [driverId])
  return <span data-private-contact>{value}</span>
}
