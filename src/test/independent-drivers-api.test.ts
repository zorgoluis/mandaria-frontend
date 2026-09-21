import { beforeEach, expect, it, vi } from 'vitest'
import { independentDrivers } from '../independent-drivers/service'
import { driverPortal } from '../driver-portal/service'
import { independentStatusLabels } from '../independent-drivers/format'
import {
  portalBlock,
  releaseReasonLabels,
  vehicleDetail,
  vehicleLabel,
} from '../driver-portal/format'
import { normalizeError } from '../services/errors'

const DRIVER = '11111111-1111-4111-8111-111111111111'
const VEHICLE = '22222222-2222-4222-8222-222222222222'
const DISPATCH = '33333333-3333-4333-8333-333333333333'

beforeEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})

it('uses the real V1.9 admin endpoints for the independent capability', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => new Response('{}', { status: 200 }))
  await independentDrivers.list({ page: 2, pageSize: 20, status: 'APPROVED' })
  await independentDrivers.get(DRIVER)
  await independentDrivers.enable(DRIVER, 'Alta operativa')
  await independentDrivers.suspend(DRIVER, 'Documentación vencida')
  await independentDrivers.reject(DRIVER, 'No cumple requisitos')
  await independentDrivers.vehicles(DRIVER)
  await independentDrivers.addVehicle(DRIVER, {
    identifier: 'MOTO-IND-1',
    type: 'MOTORCYCLE',
  })
  await independentDrivers.updateVehicle(DRIVER, VEHICLE, {
    status: 'INACTIVE',
  })
  const calls = fetcher.mock.calls
  const urls = calls.map(([url]) => new URL(String(url)))
  expect(urls.map((u) => u.pathname)).toEqual([
    '/api/v1/admin/independent-drivers',
    `/api/v1/admin/drivers/${DRIVER}/independent`,
    `/api/v1/admin/drivers/${DRIVER}/independent`,
    `/api/v1/admin/drivers/${DRIVER}/independent/suspend`,
    `/api/v1/admin/drivers/${DRIVER}/independent/reject`,
    `/api/v1/admin/drivers/${DRIVER}/independent/vehicles`,
    `/api/v1/admin/drivers/${DRIVER}/independent/vehicles`,
    `/api/v1/admin/drivers/${DRIVER}/independent/vehicles/${VEHICLE}`,
  ])
  expect(calls.map(([, init]) => init?.method)).toEqual([
    'GET',
    'GET',
    'POST',
    'POST',
    'POST',
    'GET',
    'POST',
    'PATCH',
  ])
  expect(Object.fromEntries(urls[0].searchParams)).toEqual({
    page: '2',
    pageSize: '20',
    status: 'APPROVED',
  })
  expect(JSON.parse(String(calls[3][1]?.body))).toEqual({
    reason: 'Documentación vencida',
  })
  // The owner is derived from the route, never from the payload.
  expect(JSON.parse(String(calls[6][1]?.body))).toEqual({
    identifier: 'MOTO-IND-1',
    type: 'MOTORCYCLE',
  })
})

it('takes a service with a single atomic call and never claims separately', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => new Response('{}', { status: 200 }))
  await driverPortal.me()
  await driverPortal.vehicles()
  await driverPortal.available(1, 20)
  await driverPortal.get(DISPATCH)
  await driverPortal.take(DISPATCH, VEHICLE)
  await driverPortal.release(DISPATCH, 'CANNOT_COMPLETE')
  await driverPortal.release(DISPATCH, 'OTHER', 'Se me averió la moto')
  const calls = fetcher.mock.calls
  const paths = calls.map(([url]) => new URL(String(url)).pathname)
  expect(paths).toEqual([
    '/api/v1/driver/me',
    '/api/v1/driver/vehicles',
    '/api/v1/driver/dispatches/available',
    `/api/v1/driver/dispatches/${DISPATCH}`,
    `/api/v1/driver/dispatches/${DISPATCH}/take`,
    `/api/v1/driver/dispatches/${DISPATCH}/release`,
    `/api/v1/driver/dispatches/${DISPATCH}/release`,
  ])
  // V1.9 is atomic: no provider claim endpoint is ever used by the driver portal.
  expect(paths.some((p) => p.includes('/claim'))).toBe(false)
  expect(paths.some((p) => p.includes('/assignment'))).toBe(false)
  expect(JSON.parse(String(calls[4][1]?.body))).toEqual({ vehicleId: VEHICLE })
  expect(JSON.parse(String(calls[5][1]?.body))).toEqual({
    reason: 'CANNOT_COMPLETE',
  })
  expect(JSON.parse(String(calls[6][1]?.body))).toEqual({
    reason: 'OTHER',
    reasonDetail: 'Se me averió la moto',
  })
  // The driver is always derived from the token: no identity travels from the client.
  for (const [url] of calls) {
    const search = new URL(String(url)).search
    expect(search).not.toMatch(/driverId|providerId|profileId/)
  }
})

it.each([400, 401, 403, 404, 409, 429, 500])(
  'keeps HTTP %s errors safe in the portal',
  async (status) => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(JSON.stringify({ message: 'driver 1111 internal note' }), {
          status,
        }),
    )
    await expect(driverPortal.take(DISPATCH, VEHICLE)).rejects.toMatchObject({
      status,
      message: normalizeError(status, null).message,
    })
  },
)

it('translates the V1.9 conflict codes without leaking raw text', () => {
  const cases: [string, RegExp][] = [
    ['DRIVER_NOT_ELIGIBLE', /cuenta activa con rol de repartidor/i],
    ['INDEPENDENT_PROFILE_EXISTS', /ya tiene una habilitaci[óo]n/i],
    ['INDEPENDENT_NOT_APPROVED', /no est[áa] vigente/i],
    [
      'INDEPENDENT_DRIVER_HAS_ACTIVE_ASSIGNMENT',
      /est[áa] ejecutando un servicio/i,
    ],
    [
      'DISPATCH_NOT_OPEN_TO_INDEPENDENT',
      /no admite repartidores independientes/i,
    ],
    ['DISPATCH_RETAKE_NOT_ALLOWED', /no puedes volver a tomarlo/i],
    ['DISPATCH_NOT_CLAIMED_BY_DRIVER', /ya no es tuyo/i],
    ['VEHICLE_HAS_ACTIVE_ASSIGNMENT', /est[áa] ejecutando un servicio/i],
    ['VEHICLE_LIMIT_REACHED', /m[áa]ximo de veh[íi]culos propios/i],
    ['TAKE_CONFLICT', /cambi[óo] mientras lo tomabas/i],
    ['DISPATCH_ALREADY_CLAIMED', /ya fue tomado/i],
    ['DRIVER_BUSY', /otro servicio/i],
    ['VEHICLE_BUSY', /otro servicio/i],
  ]
  for (const [code, expected] of cases) {
    const error = normalizeError(409, {
      code,
      message: 'driver 1111 vehicle 2222 internal detail',
    })
    expect(error.code).toBe(code)
    expect(error.message).toMatch(expected)
    expect(error.message).not.toContain('1111')
    expect(error.message).not.toContain('internal detail')
  }
})

it('translates the code-less duplicate identifier conflict of an independent vehicle', () => {
  const error = normalizeError(409, {
    message: 'Vehicle identifier already exists for this independent driver',
  })
  expect(error.message).toBe(
    'Este repartidor ya tiene un vehículo con ese identificador.',
  )
})

it('explains why the portal is closed without inventing a reason', () => {
  expect(portalBlock(null)).toMatch(/todav[íi]a no te habilit[óo]/i)
  expect(portalBlock({ status: 'PENDING', canTakeServices: false })).toMatch(
    /pendiente de revisi[óo]n/i,
  )
  expect(portalBlock({ status: 'SUSPENDED', canTakeServices: false })).toMatch(
    /suspendi[óo]/i,
  )
  expect(portalBlock({ status: 'REJECTED', canTakeServices: false })).toMatch(
    /no est[áa] vigente/i,
  )
  // APPROVED opens the portal even when a service in course blocks taking another.
  expect(portalBlock({ status: 'APPROVED', canTakeServices: false })).toBeNull()
  expect(portalBlock({ status: 'APPROVED', canTakeServices: true })).toBeNull()
})

it('labels statuses, reasons and vehicles for people', () => {
  expect(independentStatusLabels).toEqual({
    PENDING: 'Pendiente',
    APPROVED: 'Habilitado',
    SUSPENDED: 'Suspendido',
    REJECTED: 'Rechazado',
  })
  expect(releaseReasonLabels.PERSONAL_EMERGENCY).toBe('Emergencia personal')
  expect(vehicleLabel({ identifier: 'MOTO-IND-1', type: 'MOTORCYCLE' })).toBe(
    'MOTO-IND-1 · Motocicleta',
  )
  expect(
    vehicleDetail({
      id: 'v',
      independentDriverProfileId: 'p',
      identifier: 'MOTO-IND-1',
      type: 'MOTORCYCLE',
      status: 'ACTIVE',
      brand: 'Italika',
      model: 'FT150',
      year: 2023,
      color: 'Roja',
      plate: 'ABC-12-34',
      createdAt: '2026-09-20T12:00:00Z',
      updatedAt: '2026-09-20T12:00:00Z',
    }),
  ).toBe('Italika FT150 Roja · Placa ABC-12-34')
})
