import type { CollectionInstructions } from './types'

/** Validate the entire supported projection before giving any instruction about money. */
export function isSupportedCollection(
  value: unknown,
): value is CollectionInstructions {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  const fee = data.deliveryFee
  if (!fee || typeof fee !== 'object') return false
  const money = fee as Record<string, unknown>
  return (
    typeof data.applicability === 'string' &&
    ['OFFER', 'CURRENT', 'HISTORICAL'].includes(data.applicability) &&
    data.goodsPaidToRestaurant === true &&
    data.advanceToRestaurant === false &&
    data.collectGoodsFromRecipient === false &&
    data.payer === 'RECIPIENT' &&
    data.method === 'CASH' &&
    data.dueAt === 'DELIVERY' &&
    data.component === 'DELIVERY_FEE' &&
    typeof money.amount === 'string' &&
    /^\d+\.\d{2}$/.test(money.amount) &&
    typeof money.currency === 'string' &&
    /^[A-Z]{3}$/.test(money.currency)
  )
}
