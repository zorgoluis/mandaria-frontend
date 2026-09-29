/** Optional executor projection from Mandaria V1.13-D; never inferred from paymentContext. */
export interface CollectionInstructions {
  applicability: 'OFFER' | 'CURRENT' | 'HISTORICAL'
  goodsPaidToRestaurant: true
  advanceToRestaurant: false
  collectGoodsFromRecipient: false
  deliveryFee: { amount: string; currency: string }
  payer: 'RECIPIENT'
  method: 'CASH'
  dueAt: 'DELIVERY'
  component: 'DELIVERY_FEE'
}
