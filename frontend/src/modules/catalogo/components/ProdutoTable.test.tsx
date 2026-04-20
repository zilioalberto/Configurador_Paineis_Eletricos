import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import ProdutoTable from '@/modules/catalogo/components/ProdutoTable'
import type { ProdutoListItem } from '@/modules/catalogo/types/produto'

function makeProduto(): ProdutoListItem {
  return {
    id: 'prod-1',
    codigo: 'CT-001',
    descricao: 'Contatora',
    categoria: 'CONTATORA',
    categoria_display: 'Contatora',
    fabricante: 'Fabricante',
    unidade_medida: 'UN',
    valor_unitario: '100.00',
    ativo: true,
  }
}

describe('ProdutoTable', () => {
  it('oculta acoes de gestao sem permissao', () => {
    render(
      <MemoryRouter>
        <ProdutoTable produtos={[makeProduto()]} onDeleteRequest={vi.fn()} canManage={false} />
      </MemoryRouter>
    )

    expect(screen.queryByRole('link', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument()
  })

  it('mostra acoes de gestao quando permitido', () => {
    const onDeleteRequest = vi.fn()
    render(
      <MemoryRouter>
        <ProdutoTable produtos={[makeProduto()]} onDeleteRequest={onDeleteRequest} canManage={true} />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    expect(onDeleteRequest).toHaveBeenCalledWith('prod-1')
  })
})
