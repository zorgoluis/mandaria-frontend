import type { CollectionInstructions } from '../collection-instructions/types'
export const collectionFixture: CollectionInstructions = {
  applicability: 'OFFER',
  goodsPaidToRestaurant: true,
  advanceToRestaurant: false,
  collectGoodsFromRecipient: false,
  deliveryFee: { amount: '25.10', currency: 'MXN' },
  payer: 'RECIPIENT',
  method: 'CASH',
  dueAt: 'DELIVERY',
  component: 'DELIVERY_FEE',
}
