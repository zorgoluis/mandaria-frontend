import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { FeedbackProvider } from '../components/Feedback'
import { VehicleStatusAction } from '../independent-drivers/pages'
import { independentDrivers } from '../independent-drivers/service'
import { refreshIndependent } from '../independent-drivers/queries'
import type { IndependentVehicle } from '../independent-drivers/types'
vi.mock('../independent-drivers/service', () => ({
  independentDrivers: { updateVehicle: vi.fn() },
}))
vi.mock('../independent-drivers/queries', async (original) => ({
  ...(await original<typeof import('../independent-drivers/queries')>()),
  refreshIndependent: vi.fn(),
}))
const vehicle = {
  id: 'vehicle-original',
  identifier: 'MOTO',
  type: 'MOTORCYCLE',
  plate: null,
  status: 'INACTIVE',
} as IndependentVehicle
beforeEach(() => vi.clearAllMocks())
function setup() {
  render(
    <MemoryRouter>
      <FeedbackProvider>
        <VehicleStatusAction driverId="driver-original" vehicle={vehicle} />
      </FeedbackProvider>
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Editar placa' }))
}
it('updates only plate on original driver/vehicle and refreshes without activating', async () => {
  vi.mocked(independentDrivers.updateVehicle).mockResolvedValue({
    ...vehicle,
    plate: 'SYN-01',
  })
  setup()
  fireEvent.change(screen.getByLabelText('Placa del vehículo'), {
    target: { value: ' syn-01 ' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar placa' }))
  await waitFor(() =>
    expect(independentDrivers.updateVehicle).toHaveBeenCalledWith(
      'driver-original',
      'vehicle-original',
      { plate: 'SYN-01' },
    ),
  )
  await waitFor(() =>
    expect(refreshIndependent).toHaveBeenCalledWith('driver-original'),
  )
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  )
})
it('retains the dialog on a server rejection, without claiming success', async () => {
  vi.mocked(independentDrivers.updateVehicle).mockRejectedValue(
    new Error('Rechazo del servidor'),
  )
  setup()
  fireEvent.change(screen.getByLabelText('Placa del vehículo'), {
    target: { value: 'SYN-02' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar placa' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'No fue posible completar la operación.',
  )
  expect(screen.getByRole('dialog')).toBeVisible()
  expect(refreshIndependent).not.toHaveBeenCalled()
})
