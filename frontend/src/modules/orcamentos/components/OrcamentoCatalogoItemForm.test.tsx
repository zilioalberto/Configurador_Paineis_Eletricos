import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ProdutoListItem } from '@/modules/catalogo/types/produto'

const useOrcamentoCatalogoBuscaMock = vi.fn()

vi.mock('../hooks/useOrcamentoCatalogoBusca', () => ({
  useOrcamentoCatalogoBusca: (termo: string) => useOrcamentoCatalogoBuscaMock(termo),
}))

import OrcamentoCatalogoItemForm from './OrcamentoCatalogoItemForm'

const produtos: ProdutoListItem[] = [
  {
    id: 'p1',
    codigo: '3TS29100BB4',
    descricao: 'CONTATOR A',
    categoria: 'CONTATOR',
    fabricante: 'Siemens',
    unidade_medida: 'UN',
    preco_base: '10',
    aliquota_ipi: '5',
    ativo: true,
  },
  {
    id: 'p2',
    codigo: '3TS10100BB4',
    descricao: 'CONTATOR B',
    categoria: 'CONTATOR',
    fabricante: 'Siemens',
    unidade_medida: 'UN',
    preco_base: '20',
    aliquota_ipi: null,
    ativo: true,
  },
]

function setupBuscaHook(itens: ProdutoListItem[] = produtos) {
  let aberto = true
  useOrcamentoCatalogoBuscaMock.mockImplementation(() => ({
    itens,
    carregando: false,
    aberto,
    setAberto: (v: boolean) => {
      aberto = v
    },
    limparResultados: vi.fn(),
    minChars: 2,
  }))
}

describe('OrcamentoCatalogoItemForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupBuscaHook()
  })

  it('seleciona item com Enter após navegar com setas', async () => {
    const onAdicionar = vi.fn()
    render(<OrcamentoCatalogoItemForm margemProdutos="10" onAdicionar={onAdicionar} />)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'cont' } })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(onAdicionar).toHaveBeenCalledTimes(1))
    expect(onAdicionar).toHaveBeenCalledWith(
      expect.objectContaining({
        produtoId: 'p1',
        produtoCodigo: '3TS29100BB4',
        descricao: 'CONTATOR A',
      })
    )
  })

  it('destaca opção ao passar com ArrowDown', () => {
    render(<OrcamentoCatalogoItemForm margemProdutos="10" onAdicionar={vi.fn()} />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'cont' } })
    fireEvent.keyDown(input, { key: 'ArrowDown' })

    const opcao = screen.getByRole('option', { name: /3TS29100BB4/i })
    expect(opcao).toHaveClass('active')
    expect(opcao).toHaveAttribute('aria-selected', 'true')
  })
})
