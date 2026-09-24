import { beforeEach, expect, it, vi } from 'vitest'
import {
  adminAssignments,
  deliveryAssignments,
} from '../delivery-assignments/service'
import {
  amount,
  assignmentCountdown,
  assignmentStatusLabels,
  availabilityLabels,
  endReasonLabels,
  paymentFromService,
  vehicleDetail,
  vehicleLabel,
} from '../delivery-assignments/format'
import { normalizeError } from '../services/errors'
import type { DispatchService } from '../dispatch/types'

const P = '11111111-1111-4111-8111-111111111111'
const D = '22222222-2222-4222-8222-222222222222'
const DRIVER = '33333333-3333-4333-8333-333333333333'
const VEHICLE = '44444444-4444-4444-8444-444444444444'

beforeEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})

it('uses the real V1.8 assignment endpoints and payloads', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => new Response('{}', { status: 200 }))
  await deliveryAssignments.assign(P, D, {
    driverId: DRIVER,
    vehicleId: VEHICLE,
  })
  await deliveryAssignments.reassign(P, D, {
    driverId: DRIVER,
    vehicleId: VEHICLE,
    reason: 'DRIVER_UNAVAILABLE',
  })
  await deliveryAssignments.cancel(P, D, {
    reason: 'OTHER',
    reasonDetail: 'Se retrasó la recolección',
  })
  await deliveryAssignments.history(P, D)
  await deliveryAssignments.availableDrivers(P, D)
  await deliveryAssignments.availableVehicles(P, D)
  await adminAssignments.history(D)
  const calls = fetcher.mock.calls
  const urls = calls.map(([url]) => new URL(String(url)))
  expect(urls.map((u) => u.pathname)).toEqual([
    `/api/v1/provider/dispatches/${D}/assignment`,
    `/api/v1/provider/dispatches/${D}/assignment/reassign`,
    `/api/v1/provider/dispatches/${D}/assignment/cancel`,
    `/api/v1/provider/dispatches/${D}/assignments`,
    `/api/v1/provider/dispatches/${D}/available-drivers`,
    `/api/v1/provider/dispatches/${D}/available-vehicles`,
    `/api/v1/admin/dispatches/${D}/assignments`,
  ])
  expect(calls.map(([, init]) => init?.method)).toEqual([
    'POST',
    'POST',
    'POST',
    'GET',
    'GET',
    'GET',
    'GET',
  ])
  // providerId only picks among my memberships; it never travels in the body.
  expect(urls[0].searchParams.get('providerId')).toBe(P)
  expect(JSON.parse(String(calls[0][1]?.body))).toEqual({
    driverId: DRIVER,
    vehicleId: VEHICLE,
  })
  expect(JSON.parse(String(calls[1][1]?.body))).toEqual({
    driverId: DRIVER,
    vehicleId: VEHICLE,
    reason: 'DRIVER_UNAVAILABLE',
  })
  expect(JSON.parse(String(calls[2][1]?.body))).toEqual({
    reason: 'OTHER',
    reasonDetail: 'Se retrasó la recolección',
  })
  // The admin history is provider-agnostic and never carries providerId.
  expect(urls[6].searchParams.get('providerId')).toBeNull()
})

it.each([400, 401, 403, 404, 409, 429, 500])(
  'keeps HTTP %s assignment errors safe',
  async (status) => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(
          JSON.stringify({ message: 'driver carlos@example.test busy' }),
          { status },
        ),
    )
    await expect(
      deliveryAssignments.assign(P, D, {
        driverId: DRIVER,
        vehicleId: VEHICLE,
      }),
    ).rejects.toMatchObject({
      status,
      message: normalizeError(status, null).message,
    })
  },
)

it('translates every V1.8 conflict code into an operational message', () => {
  const cases: [string, RegExp][] = [
    ['DRIVER_BUSY', /repartidor acaba de recibir otro servicio/i],
    ['VEHICLE_BUSY', /veh[íi]culo acaba de asignarse/i],
    ['DRIVER_VEHICLE_MISMATCH', /no pueden combinarse/i],
    ['DRIVER_NOT_ELIGIBLE', /cuenta activa con rol de repartidor/i],
    ['VEHICLE_NOT_ELIGIBLE', /ya no puede asignarse/i],
    ['DISPATCH_ALREADY_ASSIGNED', /ya tiene un repartidor asignado/i],
    ['DISPATCH_HAS_ACTIVE_ASSIGNMENT', /Cancela la asignaci[óo]n antes/i],
    ['NO_ACTIVE_ASSIGNMENT', /ya no tiene una asignaci[óo]n vigente/i],
    ['ASSIGNMENT_UNCHANGED', /distinto del actual/i],
    ['ASSIGNMENT_CONFLICT', /al mismo tiempo/i],
    ['PROVIDER_NOT_ACTIVE', /proveedor no est[áa] activo/i],
  ]
  for (const [code, expected] of cases) {
    const error = normalizeError(409, {
      code,
      message: 'driver 33333333 busy on dispatch 44444444',
    })
    expect(error.code).toBe(code)
    expect(error.message).toMatch(expected)
    // Raw identifiers from the backend never reach the screen.
    expect(error.message).not.toContain('33333333')
  }
})

it('normalises the two money contracts into one payment shape', () => {
  const base: DispatchService = {
    deliveryFee: { amount: '60.00', currency: 'MXN' },
    route: { distanceMeters: 4700, durationSeconds: 780 },
    pickup: { address: 'A', latitude: 16.7, longitude: -93.3 },
    dropoff: { address: 'B', latitude: 16.8, longitude: -93.4 },
    packages: [],
    goods: {
      paymentMode: 'COURIER_ADVANCE',
      value: '800.00',
      currency: 'MXN',
      driverAdvancesGoods: true,
      driverAdvanceAmount: '800.00',
    },
  }
  // service.goods keeps the V1.7 contract: decimal string plus a sibling currency.
  expect(paymentFromService(base)).toEqual({
    deliveryFee: { amount: '60.00', currency: 'MXN' },
    goodsValue: { amount: '800.00', currency: 'MXN' },
    goodsPaymentMode: 'COURIER_ADVANCE',
    driverAdvancesGoods: true,
    driverAdvanceAmount: { amount: '800.00', currency: 'MXN' },
  })
  const prepaid = paymentFromService({
    ...base,
    goods: {
      paymentMode: 'PREPAID',
      value: '800.00',
      currency: 'MXN',
      driverAdvancesGoods: false,
      driverAdvanceAmount: null,
    },
  })
  expect(prepaid.driverAdvancesGoods).toBe(false)
  expect(prepaid.driverAdvanceAmount).toBeNull()
  const without = paymentFromService({ ...base, goods: null })
  expect(without.goodsValue).toBeNull()
  expect(without.goodsPaymentMode).toBeNull()
  expect(without.driverAdvancesGoods).toBe(false)
  expect(amount({ amount: '60.00', currency: 'MXN' })).toBe('$60.00 MXN')
})

it('labels assignments, reasons and availability without inventing presence', () => {
  expect(assignmentStatusLabels).toEqual({
    ACTIVE: 'Asignado',
    REASSIGNED: 'Reasignado',
    CANCELLED: 'Cancelado',
    // V1.11: a successful close, never confused with a cancellation.
    COMPLETED: 'Entrega completada',
  })
  expect(endReasonLabels.DELIVERY_CANCELLED).toBe('El servicio fue cancelado')
  // V1.8 has no realtime presence: a driver is never described as online.
  expect(Object.values(availabilityLabels).join(' ')).not.toMatch(
    /online|en l/i,
  )
  expect(availabilityLabels.AVAILABLE).toBe('Sin servicio en curso')
  expect(
    vehicleLabel({ id: 'v', identifier: 'MOTO-03', type: 'MOTORCYCLE' }),
  ).toBe('MOTO-03 · Motocicleta')
  expect(
    vehicleDetail({
      id: 'v',
      identifier: 'MOTO-03',
      type: 'MOTORCYCLE',
      brand: 'Italika',
      model: 'FT150',
      color: 'Roja',
      plate: 'ABC-12-34',
      pairedDriver: null,
    }),
  ).toBe('Italika FT150 Roja · Placa ABC-12-34')
})

it('derives the assign countdown only from the backend deadline', () => {
  const now = Date.parse('2026-09-18T12:00:00Z')
  expect(assignmentCountdown('2026-09-18T12:04:21Z', now)).toBe('4:21')
  expect(assignmentCountdown('2026-09-18T13:04:21Z', now)).toBe('1:04:21')
  expect(assignmentCountdown('2026-09-18T11:59:00Z', now)).toBeNull()
  expect(assignmentCountdown('no-es-fecha', now)).toBeNull()
})
