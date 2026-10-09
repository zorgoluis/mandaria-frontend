import { useIsFetching } from '@tanstack/react-query'
import type { ShippingPaymentResponse } from '../customer/contract'
// Executor projection emits OFFER in collection-instructions.ts; public status only CURRENT/HISTORICAL.
export type ShippingPayment = Omit<
  ShippingPaymentResponse,
  'instructionStatus'
> & { instructionStatus: 'OFFER' | 'CURRENT' | 'HISTORICAL' }
export function ShippingPaymentBlock({
  value,
  offer = false,
  collectionActionAllowed = false,
}: {
  value: unknown
  offer?: boolean
  collectionActionAllowed?: boolean
}) {
  const fetching = useIsFetching({
    predicate: (q) =>
      [
        'execution',
        'dispatches',
        'driver-portal',
        'delivery-assignments',
      ].includes(String(q.queryKey[0])),
  })
  if (value === undefined || value === null) return null
  if (fetching) return <p role="status">Actualizando condiciones de envío…</p>
  if (typeof value !== 'object')
    return <p>Condiciones de envío no disponibles.</p>
  const p = value as Partial<ShippingPayment>
  const supported =
    ['REQUESTER', 'RECIPIENT'].includes(p.payer ?? '') &&
    p.method === 'CASH' &&
    p.component === 'DELIVERY_FEE' &&
    p.termsVersion === 1 &&
    ((p.payer === 'REQUESTER' && p.dueAt === 'PICKUP') ||
      (p.payer === 'RECIPIENT' && p.dueAt === 'DELIVERY')) &&
    ['OFFER', 'CURRENT', 'HISTORICAL'].includes(p.instructionStatus ?? '') &&
    ['DECLARED', 'NOT_DECLARED'].includes(p.evidenceStatus ?? '') &&
    typeof p.collectShipping === 'boolean'
  if (!supported)
    return (
      <p>
        Condiciones de envío incompletas o no reconocidas. No se puede indicar
        un cobro.
      </p>
    )
  const amount =
    typeof p.amount === 'string' &&
    /^\d+\.\d{2}$/.test(p.amount) &&
    typeof p.currency === 'string' &&
    /^[A-Z]{3}$/.test(p.currency)
      ? `${p.amount} ${p.currency}`
      : 'Importe aún no confirmado'
  return (
    <section className="collection-instructions" aria-label="Pago del envío">
      <strong>
        {offer || p.instructionStatus === 'OFFER'
          ? 'Condiciones de la oferta'
          : p.instructionStatus === 'HISTORICAL'
            ? 'Condiciones históricas del envío'
            : 'Pago del envío'}
      </strong>
      <p>
        {amount} ·{' '}
        {p.payer === 'REQUESTER'
          ? 'Solicitante o su representante'
          : 'Destinatario'}{' '}
        · En efectivo · {p.dueAt === 'PICKUP' ? 'En recogida' : 'Al entregar'}
      </p>
      {p.evidenceStatus === 'DECLARED' ? (
        <p>
          Cobro declarado por el repartidor
          {p.declaredAt
            ? ` el ${new Date(p.declaredAt).toLocaleString('es-MX')}`
            : ''}
          . No es pago verificado. Se conserva tras transferencia; no volver a
          cobrar.
        </p>
      ) : (
        <p>
          {!offer &&
          p.instructionStatus === 'CURRENT' &&
          p.collectShipping &&
          collectionActionAllowed &&
          amount !== 'Importe aún no confirmado'
            ? 'Instrucción vigente para el ejecutor: cobrar únicamente el envío según estas condiciones.'
            : 'Información de referencia; no es una instrucción para cobrar ahora.'}
        </p>
      )}
      <p>
        Mercancía prepagada no significa envío pagado. Entrega, retorno y
        transferencia son resultados logísticos; no acreditan cobro ni
        devolución de dinero.
      </p>
    </section>
  )
}
