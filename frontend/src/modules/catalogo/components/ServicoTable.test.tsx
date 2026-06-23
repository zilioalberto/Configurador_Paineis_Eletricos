import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import ServicoTable from './ServicoTable'

describe('ServicoTable', () => {
  it('mostra mensagem vazia', () => {
    render(
      <MemoryRouter>
        <ServicoTable servicos={[]} canManage onDeleteRequest={vi.fn()} />
      </MemoryRouter>
    )
    expect(screen.getByText(/nenhum serviço encontrado/i)).toBeInTheDocument()
  })

  it('lista serviços e dispara exclusão', () => {
    const onDeleteRequest = vi.fn()
    render(
      <MemoryRouter>
        <ServicoTable
          canManage
          onDeleteRequest={onDeleteRequest}
          servicos={[
            {
              id: 's-1',
              codigo: 'SRV-01',
              descricao: 'Instalação',
              categoria: 'Campo',
              unidade_medida: 'UN',
              unidade_medida_display: 'Unidade',
              custo_referencia: '100.00',
              ativo: true,
            },
          ]}
        />
      </MemoryRouter>
    )

    expect(screen.getByRole('link', { name: 'SRV-01' })).toHaveAttribute(
      'href',
      '/catalogo/servicos/s-1/editar'
    )
    fireEvent.click(screen.getByRole('button', { name: /excluir/i }))
    expect(onDeleteRequest).toHaveBeenCalledWith('s-1')
  })
})
