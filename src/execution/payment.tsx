import { ShippingPaymentBlock } from '../shipping/Payment'
import { CollectionInstructionsBlock } from '../collection-instructions/CollectionInstructionsBlock'
import { InfoGrid } from '../components/ui'
import type { ExecutionFields } from './types'
import { useIsFetching } from '@tanstack/react-query'
export function DetailedPayment({
  fields,
  value,
  fee,
  goods,
  advance,
}: {
  fields: ExecutionFields
  value?: unknown
  fee?: { amount: string; currency: string }
  goods?: { amount: string; currency: string } | null
  advance?: { amount: string; currency: string } | null
}) {
  const refreshing = useIsFetching({
    predicate: (q) =>
      [
        'execution',
        'dispatches',
        'driver-portal',
        'delivery-assignments',
      ].includes(String(q.queryKey[0])),
  })
  if (refreshing)
    return (
      <p className="panel-note" role="status">
        Actualizando permisos e instrucciones económicas…
      </p>
    )

  return (
    <div className="collection-instructions">
      {fields.shippingPayment != null ? (
        <>
          <ShippingPaymentBlock
            value={fields.shippingPayment}
            collectionActionAllowed={fields.collectionActionAllowed === true}
          />
          <InfoGrid
            items={[
              [
                'Mercancía de referencia',
                goods ? `${goods.amount} ${goods.currency}` : 'No informada',
              ],
            ]}
          />
        </>
      ) : value !== undefined ? (
        <CollectionInstructionsBlock
          value={value}
          collectionActionAllowed={fields.collectionActionAllowed === true}
        />
      ) : (
        <InfoGrid
          items={[
            [
              'Envío de referencia',
              fee ? `${fee.amount} ${fee.currency}` : 'No informado',
            ],
            [
              'Mercancía de referencia',
              goods ? `${goods.amount} ${goods.currency}` : 'No informada',
            ],
          ]}
        />
      )}
      {fields.shippingPayment == null && (
        <p>
          {fields.collectionActionAllowed === true
            ? 'El servidor permite el cobro en esta etapa según las condiciones contractuales recibidas.'
            : 'No cobrar en esta etapa.'}
        </p>
      )}
      <p>
        {fields.advanceToOriginAllowed === true && advance
          ? `Adelanto contractual al origen: ${advance.amount} ${advance.currency}.`
          : 'No se indica un nuevo adelanto al origen.'}
      </p>
      <p>
        Los importes son referencias del contrato. Entrega, retorno o
        transferencia no acreditan cobro ni devolución automática de créditos.
      </p>
    </div>
  )
}
