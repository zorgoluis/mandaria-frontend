import { projection } from './business-fixtures'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { MyShipments } from '../customer/MyShipments'
import { requestDetail } from './fixtures/request-design'
import type { Capabilities } from '../customer/service'
const cap: Capabilities = {
  type: 'PERSONAL',
  allowedShippingPayers: ['REQUESTER'],
  defaultShippingPayer: 'REQUESTER',
  capacity: {
    occupied: false,
    activeCount: 0,
    maxActiveRequests: 1,
    activeRequestPublicId: null,
  },
  ...projection,
  canPrequote: true,
  canCreateRequest: true,
  reason: null,
}
const page = {
  items: [
    requestDetail,
    { ...requestDetail, publicId: 'MDR-000008', status: 'CANCELLED' as const },
  ],
  page: 1,
  pageSize: 20,
  total: 22,
  totalPages: 2,
}
it('renders backend order, accessible row links and paginated controls', () => {
  const onPage = vi.fn()
  render(
    <MemoryRouter>
      <MyShipments
        capabilities={cap}
        items={page}
        loading={false}
        blocked={false}
        onPage={onPage}
      />
    </MemoryRouter>,
  )
  const links = within(screen.getByRole('table')).getAllByRole('link')
  expect(links.map((a) => a.textContent)).toEqual(['MDR-000009', 'MDR-000008'])
  expect(links[1]).toHaveAccessibleName(
    'Ver solicitud MDR-000008, estado Cancelada',
  )
  expect(links[0]).toHaveAttribute('href', '/customer/requests/MDR-000009')
  const nav = within(screen.getByRole('navigation', { name: 'Paginación' }))
  expect(nav.getByRole('button', { name: 'Anterior' })).toBeDisabled()
  fireEvent.click(nav.getByRole('button', { name: 'Siguiente' }))
  expect(onPage).toHaveBeenCalledWith(2)
})
it('uses actual account limits and shows the active request even outside the current page', () => {
  render(
    <MemoryRouter>
      <MyShipments
        capabilities={{
          ...cap,
          capacity: {
            ...cap.capacity,
            occupied: true,
            activeCount: 1,
            activeRequestPublicId: 'MDR-000007',
          },
          canPrequote: false,
        }}
        activeRequest={{ ...requestDetail, publicId: 'MDR-000007' }}
        items={page}
        loading={false}
        blocked={false}
        onPage={vi.fn()}
      />
    </MemoryRouter>,
  )
  expect(
    screen.getByText(/Personal: una solicitud activa. Activas: 1/),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('link', { name: 'Continuar solicitud activa' }),
  ).toHaveAttribute('href', '/customer/requests/MDR-000007')
  expect(
    screen.getByRole('region', { name: 'Solicitud activa' }),
  ).toHaveTextContent('Creada')
  expect(
    screen.queryByRole('link', { name: 'Cotizar envío' }),
  ).not.toBeInTheDocument()
})
it.each([false, true])(
  'empty state respects pending operation block: %s',
  (blocked) => {
    render(
      <MemoryRouter>
        <MyShipments
          capabilities={cap}
          items={{ ...page, items: [], total: 0, totalPages: 0 }}
          loading={false}
          blocked={blocked}
          onPage={vi.fn()}
        />
      </MemoryRouter>,
    )
    expect(screen.getByText('Aún no tienes envíos')).toBeInTheDocument()
    expect(
      screen.queryAllByRole('link', { name: 'Cotizar envío' }),
    ).toHaveLength(blocked ? 0 : 1)
  },
)
it('loading shows three skeleton rows and does not render stale rows', () => {
  render(
    <MemoryRouter>
      <MyShipments
        capabilities={cap}
        items={page}
        loading
        blocked={false}
        onPage={vi.fn()}
      />
    </MemoryRouter>,
  )
  expect(
    screen
      .getByRole('status', { name: 'Cargando envíos' })
      .querySelectorAll('.shipments-skeleton'),
  ).toHaveLength(3)
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
})
it('business with active requests can still quote when backend allows it', () => {
  render(
    <MemoryRouter>
      <MyShipments
        capabilities={{
          ...cap,
          type: 'BUSINESS',
          capacity: {
            occupied: true,
            activeCount: 3,
            maxActiveRequests: 5,
            activeRequestPublicId: null,
          },
        }}
        items={{ ...page, page: 2 }}
        loading={false}
        blocked={false}
        onPage={vi.fn()}
      />
    </MemoryRouter>,
  )
  expect(
    screen.getByText(/Negocio: hasta 5 solicitudes activas. Activas: 3/),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('link', { name: 'Cotizar envío' }),
  ).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
})
