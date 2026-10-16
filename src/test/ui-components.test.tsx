import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import {
  Badge,
  Button,
  Checkbox,
  Field,
  Input,
  Modal,
  PageHeader,
  RouteProgress,
  Select,
  Skeleton,
  Table,
  Textarea,
  Toast,
} from '../components/ui'

afterEach(() => vi.useRealTimers())

describe('Mandaria shared controls', () => {
  it('keeps a button name, prevents submission/clicks while loading and defaults to a non-submit action', () => {
    const click = vi.fn()
    const { rerender } = render(<Button onClick={click}>Guardar</Button>)
    const button = screen.getByRole('button', { name: 'Guardar' })
    expect(button).toHaveAttribute('type', 'button')
    rerender(
      <Button loading onClick={click}>
        Guardar
      </Button>,
    )
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    fireEvent.click(button)
    expect(click).not.toHaveBeenCalled()
    rerender(
      <Button disabled variant="secondary" onClick={click}>
        Guardar
      </Button>,
    )
    expect(button).toBeDisabled()
  })

  it('associates help and errors with every control, including a nested password input', () => {
    render(
      <>
        <Field
          label="Contraseña"
          hint="Usa una frase"
          error="Faltan caracteres"
        >
          <span>
            <Input type="password" name="password" />
          </span>
        </Field>
        <Select label="Zona" help="Elige cobertura" error="Selecciona una zona">
          <option value="">Sin seleccionar</option>
        </Select>
        <Textarea label="Motivo" error="Explica el motivo" />
        <Checkbox
          label="Acepto las condiciones"
          help="Lee antes de aceptar"
          error="Debes aceptar"
        />
      </>,
    )
    for (const name of [
      'Contraseña',
      'Zona',
      'Motivo',
      'Acepto las condiciones',
    ]) {
      const control = screen.getByLabelText(name, { exact: true })
      expect(control).toHaveAttribute('aria-invalid', 'true')
      const ids = control.getAttribute('aria-describedby')!.split(' ')
      expect(ids.every((id) => !!document.getElementById(id))).toBe(true)
    }
    expect(
      screen.getByLabelText('Contraseña', { exact: true }),
    ).toHaveAccessibleDescription('Usa una frase Faltan caracteres')
    fireEvent.click(screen.getByRole('checkbox'))
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('preserves native validation, values, refs and external descriptions', () => {
    const ref = { current: null as HTMLInputElement | null }
    render(
      <>
        <p id="outside">Dato externo</p>
        <Field label="Correo" help="Correo de contacto">
          <Input
            ref={ref}
            name="email"
            type="email"
            required
            aria-describedby="outside"
          />
        </Field>
      </>,
    )
    const input = screen.getByRole('textbox', { name: 'Correo' })
    expect(ref.current).toBe(input)
    expect(input).toBeInvalid()
    fireEvent.change(input, { target: { value: 'persona@example.com' } })
    expect(input).toBeValid()
    expect(input).toHaveAccessibleDescription('Dato externo Correo de contacto')
  })

  it('clears invalid state and preserves an explicit accessible name', () => {
    const { rerender } = render(
      <Input
        label="Nombre"
        aria-label="Nombre operativo"
        error="Falta nombre"
      />,
    )
    expect(
      screen.getByRole('textbox', { name: 'Nombre operativo' }),
    ).toHaveAttribute('aria-invalid', 'true')
    rerender(<Input label="Nombre" aria-label="Nombre operativo" />)
    expect(screen.getByRole('textbox')).not.toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })
})

describe('Mandaria presentation and feedback', () => {
  it('keeps table semantics, an accessible scroll region and contextual loading/empty actions', () => {
    const columns = [
      { label: 'Servicio', render: (row: { id: string }) => row.id },
    ]
    const { rerender } = render(
      <Table
        caption="Servicios activos"
        columns={columns}
        rows={[{ id: 'MDR-42' }]}
      />,
    )
    expect(screen.getByRole('table')).toHaveAccessibleName('Servicios activos')
    expect(screen.getByRole('region')).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('columnheader')).toHaveTextContent('Servicio')
    rerender(
      <Table loading caption="Servicios activos" columns={columns} rows={[]} />,
    )
    expect(screen.getByRole('status')).toHaveAccessibleName(
      'Cargando Servicios activos',
    )
    rerender(
      <Table
        emptyTitle="Sin servicios"
        emptyAction={<Button>Buscar</Button>}
        columns={columns}
        rows={[]}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Sin servicios' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeVisible()
  })

  it('names the modal, blocks dismissal while busy and returns focus on unmount', () => {
    const close = vi.fn()
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()
    const { rerender, unmount } = render(
      <Modal title="Confirmar servicio" onClose={close} busy>
        <p>Revisa los datos</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog')).toHaveAccessibleName(
      'Confirmar servicio',
    )
    expect(
      screen.getByRole('button', { name: 'Cerrar diálogo' }),
    ).toBeDisabled()
    fireEvent(
      screen.getByRole('dialog'),
      new Event('cancel', { bubbles: true, cancelable: true }),
    )
    expect(close).not.toHaveBeenCalled()
    rerender(
      <Modal title="Confirmar servicio" onClose={close}>
        <p>Revisa los datos</p>
      </Modal>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar diálogo' }))
    expect(close).toHaveBeenCalledOnce()
    unmount()
    expect(trigger).toHaveFocus()
    trigger.remove()
  })

  it('pauses toast expiry during reading and retains errors until dismissed', () => {
    vi.useFakeTimers()
    const dismiss = vi.fn()
    const { rerender } = render(
      <Toast message="Servicio actualizado" onDismiss={dismiss} />,
    )
    fireEvent.mouseEnter(screen.getByRole('status'))
    act(() => vi.advanceTimersByTime(10000))
    expect(dismiss).not.toHaveBeenCalled()
    fireEvent.mouseLeave(screen.getByRole('status'))
    act(() => vi.advanceTimersByTime(7000))
    expect(dismiss).toHaveBeenCalledOnce()
    dismiss.mockClear()
    rerender(
      <Toast danger message="No se confirmó el cierre" onDismiss={dismiss} />,
    )
    act(() => vi.advanceTimersByTime(20000))
    expect(dismiss).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar notificación' }))
    expect(dismiss).toHaveBeenCalledOnce()
  })

  it('expresses route progress and service status without relying on colour', () => {
    render(
      <>
        <RouteProgress
          label="Entrega"
          steps={[
            { id: 'origin', label: 'Recogida', state: 'complete' },
            { id: 'travel', label: 'En camino', state: 'current' },
            { id: 'destination', label: 'Entregar', state: 'blocked' },
          ]}
        />
        <Badge value="DELIVERED" label="Entregado" />
      </>,
    )
    expect(screen.getByRole('list', { name: 'Entrega' })).toBeVisible()
    expect(screen.getByText('En camino').closest('li')).toHaveAttribute(
      'aria-current',
      'step',
    )
    expect(screen.getByText('Detenido')).toBeVisible()
    expect(screen.getByText('Entregado')).toHaveAttribute(
      'data-tone',
      'success',
    )
  })

  it('provides a real page heading and a single named loading region', () => {
    render(
      <MemoryRouter>
        <PageHeader title="Servicios" eyebrow="Operación" back="/dashboard" />
        <Skeleton label="Cargando servicios" />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('heading', { level: 1, name: 'Servicios' }),
    ).toBeVisible()
    expect(screen.getByText('Operación')).toBeVisible()
    expect(screen.getByRole('link', { name: /Volver/ })).toHaveAttribute(
      'href',
      '/dashboard',
    )
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })
})
