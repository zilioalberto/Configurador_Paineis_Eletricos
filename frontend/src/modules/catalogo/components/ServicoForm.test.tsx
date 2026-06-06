import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import ServicoForm from './ServicoForm'
import { servicoFormEmpty } from '../types/servico'

describe('ServicoForm', () => {
  it('envia dados preenchidos', async () => {
    const onSubmit = vi.fn()
    render(
      <ServicoForm initialData={servicoFormEmpty()} onSubmit={onSubmit} submitLabel="Salvar" />
    )

    fireEvent.change(screen.getByLabelText(/código/i), { target: { value: 'SRV-2' } })
    fireEvent.change(screen.getByLabelText(/descrição/i), { target: { value: 'Serviço teste' } })
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ codigo: 'SRV-2', descricao: 'Serviço teste' })
      )
    )
  })
})
