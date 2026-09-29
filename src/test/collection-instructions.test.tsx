import { beforeEach, describe, expect, it } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { CollectionInstructionsBlock } from '../collection-instructions/CollectionInstructionsBlock'
import { isSupportedCollection } from '../collection-instructions/validation'
import type { CollectionInstructions } from '../collection-instructions/types'
import { MoneyBlock } from '../dispatch/components'
import { PaymentBlock } from '../driver-portal/pages'
import { PaymentContextBlock } from '../delivery-assignments/components'
import { queryClient } from '../services/query'
import { dispatchKeys, refreshProviderDispatches } from '../dispatch/queries'
import { driverKeys, refreshDriverPortal } from '../driver-portal/queries'
import { refreshAfterAssignment } from '../delivery-assignments/queries'
import type { ReactNode } from 'react'

const current: CollectionInstructions = {
  applicability: 'CURRENT',
  goodsPaidToRestaurant: true,
  advanceToRestaurant: false,
  collectGoodsFromRecipient: false,
  deliveryFee: { amount: '25.10', currency: 'MXN' },
  payer: 'RECIPIENT',
  method: 'CASH',
  dueAt: 'DELIVERY',
  component: 'DELIVERY_FEE',
}
const payment = {
  deliveryFee: { amount: '99.00', currency: 'USD' },
  goodsValue: { amount: '800.00', currency: 'MXN' },
  goodsPaymentMode: 'COURIER_ADVANCE' as const,
  driverAdvancesGoods: true,
  driverAdvanceAmount: { amount: '800.00', currency: 'MXN' },
}
const service = {
  deliveryFee: payment.deliveryFee,
  route: { distanceMeters: 1, durationSeconds: 1 },
  pickup: { address: 'Origen', latitude: 0, longitude: 0 },
  dropoff: { address: 'Destino', latitude: 0, longitude: 0 },
  packages: [],
  goods: {
    paymentMode: 'COURIER_ADVANCE' as const,
    value: '800.00',
    currency: 'MXN',
    driverAdvancesGoods: true,
    driverAdvanceAmount: '800.00',
  },
}
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)
beforeEach(() => queryClient.clear())

describe('V1.13-D presentation', () => {
  it.each(['OFFER', 'CURRENT', 'HISTORICAL'] as const)(
    '%s uses the exact amount and only CURRENT instructs collection',
    (applicability) => {
      render(
        <CollectionInstructionsBlock value={{ ...current, applicability }} />,
        { wrapper },
      )
      expect(screen.getByText(/25.10 MXN/)).toBeInTheDocument()
      expect(screen.queryByText(/Cobra únicamente/)).toBe(
        applicability === 'CURRENT'
          ? screen.getByText(/Cobra únicamente/)
          : null,
      )
      if (applicability === 'HISTORICAL')
        expect(
          screen.getByText(/no es una instrucción vigente/),
        ).toBeInTheDocument()
      if (applicability === 'OFFER')
        expect(
          screen.getByText(/todavía no es una instrucción/),
        ).toBeInTheDocument()
    },
  )
  it('preserves decimal precision and backend currency without conversion', () => {
    render(
      <CollectionInstructionsBlock
        value={{
          ...current,
          deliveryFee: { amount: '9007199254740993.10', currency: 'USD' },
        }}
      />,
      { wrapper },
    )
    expect(screen.getByText(/9007199254740993.10 USD/)).toBeInTheDocument()
  })
  it.each([
    null,
    {},
    { ...current, method: 'CARD' },
    { ...current, payer: 'SENDER' },
    { ...current, applicability: 'OTHER' },
    { ...current, advanceToRestaurant: true },
    { ...current, deliveryFee: { amount: '25.1', currency: 'MXN' } },
    { ...current, deliveryFee: { amount: '-25.10', currency: 'MXN' } },
  ])('never invents instructions for unsupported data %#', (value) => {
    expect(isSupportedCollection(value)).toBe(false)
    render(<CollectionInstructionsBlock value={value} />, { wrapper })
    expect(screen.queryByText(/Cobra únicamente/)).toBeNull()
    expect(
      screen.getByText(/Instrucciones de cobro no disponibles/),
    ).toBeInTheDocument()
  })
  it('renders nothing when absent', () => {
    const view = render(<CollectionInstructionsBlock value={undefined} />, {
      wrapper,
    })
    expect(view.container).toBeEmptyDOMElement()
  })
  it.each(['provider', 'independent', 'assignment'] as const)(
    'uses the projection on %s and preserves legacy when absent',
    (surface) => {
      const block = (value?: CollectionInstructions) =>
        surface === 'provider' ? (
          <MoneyBlock service={service} collectionInstructions={value} />
        ) : surface === 'independent' ? (
          <PaymentBlock payment={payment} collectionInstructions={value} />
        ) : (
          <PaymentContextBlock
            payment={payment}
            collectionInstructions={value}
          />
        )
      const view = render(block(current), { wrapper })
      expect(
        screen.getByText(/Cobra únicamente el envío: 25.10 MXN/),
      ).toBeInTheDocument()
      expect(screen.queryByText(/800.00/)).toBeNull()
      view.rerender(block())
      expect(screen.queryByText(/Cobra únicamente/)).toBeNull()
      expect(screen.getAllByText(/800.00/).length).toBeGreaterThan(0)
    },
  )
})

describe('operational cache refresh', () => {
  it.each([
    'claim',
    'take',
    'release',
    'cancel',
    'reassign',
    'deliver',
  ] as const)(
    '%s replaces the previous projection through existing refetch',
    async (operation) => {
      const isDriver = operation === 'take'
      const key = isDriver
        ? driverKeys.me
        : dispatchKeys.providerDetail('provider', 'dispatch')
      let next: { collectionInstructions?: CollectionInstructions } = {
        collectionInstructions: {
          ...current,
          applicability:
            operation === 'claim' || isDriver ? 'OFFER' : 'CURRENT',
        },
      }
      function Surface() {
        const query = useQuery({ queryKey: key, queryFn: async () => next })
        return (
          <CollectionInstructionsBlock
            value={query.data?.collectionInstructions}
          />
        )
      }
      render(<Surface />, { wrapper })
      await screen.findByText(/25.10 MXN/)
      next =
        operation === 'release'
          ? {}
          : {
              collectionInstructions: {
                ...current,
                applicability:
                  operation === 'cancel' || operation === 'deliver'
                    ? 'HISTORICAL'
                    : 'CURRENT',
                deliveryFee: { amount: '31.20', currency: 'MXN' },
              },
            }
      await act(async () => {
        if (isDriver) await refreshDriverPortal()
        else if (operation === 'claim' || operation === 'release')
          await refreshProviderDispatches('provider')
        else await refreshAfterAssignment('provider', 'dispatch')
      })
      await waitFor(() => expect(screen.queryByText(/25.10 MXN/)).toBeNull())
      if (operation !== 'release')
        expect(screen.getByText(/31.20 MXN/)).toBeInTheDocument()
      if (['release', 'cancel', 'deliver'].includes(operation))
        expect(screen.queryByText(/Cobra únicamente/)).toBeNull()
    },
  )
})
