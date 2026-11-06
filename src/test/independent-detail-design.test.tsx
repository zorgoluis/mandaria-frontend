import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CopyIdentifier } from '../independent-drivers/detail-summary'

describe('identificadores de la ficha independiente', () => {
  it('copia el identificador exacto, sin sustituirlo por el usuario', async () => {
    const user = userEvent.setup()
    const copy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    render(<CopyIdentifier label="conductor" value="11111111-1111-4111-8111-111111111111" />)
    await user.click(screen.getByRole('button', { name: 'Copiar ID de conductor' }))
    expect(copy).toHaveBeenCalledExactlyOnceWith('11111111-1111-4111-8111-111111111111')
    expect(screen.getByRole('status')).toHaveTextContent('Copiado')
    copy.mockRestore()
  })
  it('explica el rechazo del portapapeles y conserva el identificador seleccionable', async () => {
    const user = userEvent.setup()
    const copy = vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'))
    render(<CopyIdentifier label="perfil independiente" value="perfil-sintético" />)
    await user.click(screen.getByRole('button'))
    expect(screen.getByRole('status')).toHaveTextContent('No se pudo copiar')
    expect(screen.getByText('perfil-sintético')).toBeVisible()
    copy.mockRestore()
  })
  it('no ofrece copiar cuando la API antigua omite el usuario', () => {
    render(<CopyIdentifier label="usuario" />)
    expect(screen.getByText('No disponible')).toBeVisible()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
