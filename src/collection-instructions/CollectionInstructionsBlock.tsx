import { useIsFetching } from '@tanstack/react-query'
import { isSupportedCollection } from './validation'

export function CollectionInstructionsBlock({ value }: { value: unknown }) {
  // Hide cached instructions while executor state is being read back after an operation.
  const refreshing = useIsFetching({
    predicate: (query) =>
      ['dispatches', 'driver-portal', 'delivery-assignments'].includes(
        String(query.queryKey[0]),
      ),
  })
  if (value === undefined) return null
  if (refreshing)
    return (
      <p className="panel-note" role="status">
        Actualizando condiciones de cobro…
      </p>
    )
  if (!isSupportedCollection(value))
    return (
      <p className="panel-note">
        Instrucciones de cobro no disponibles. Consulta las condiciones antes de
        cobrar.
      </p>
    )
  const fee = `${value.deliveryFee.amount} ${value.deliveryFee.currency}`
  const current = value.applicability === 'CURRENT'
  const offer = value.applicability === 'OFFER'
  return (
    <section
      className="collection-instructions"
      aria-label={
        current
          ? 'Instrucciones de cobro'
          : offer
            ? 'Condiciones de la oferta'
            : 'Condiciones históricas'
      }
    >
      <strong>
        {current
          ? 'Instrucciones de cobro'
          : offer
            ? 'Condiciones de la oferta'
            : 'Condiciones históricas'}
      </strong>
      <p>
        {current
          ? `Comida pagada al restaurante. No adelantes dinero ni cobres comida. Cobra únicamente el envío: ${fee}, al destinatario, en efectivo, al entregar.`
          : `${offer ? 'Condiciones previstas' : 'Condiciones registradas'}: comida pagada al restaurante, sin adelanto al restaurante ni cobro de comida. Envío: ${fee}; a cargo del destinatario, en efectivo, al entregar.`}
      </p>
      <p>
        {current
          ? 'La entrega física no acredita el cobro.'
          : offer
            ? 'Información previa a tomar el servicio; todavía no es una instrucción de cobro.'
            : 'Información histórica; no es una instrucción vigente de cobro.'}
      </p>
    </section>
  )
}
