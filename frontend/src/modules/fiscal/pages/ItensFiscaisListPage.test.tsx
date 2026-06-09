import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ItemFiscalProdutoListRow } from '../types/itemFiscalProduto'

const listarItensFiscais = vi.hoisted(() => vi.fn())

vi.mock('../services/fiscalService', () => ({
  listarItensFiscais,
}))

import ItensFiscaisListPage from './ItensFiscaisListPage'

function fiscalRow(overrides: Partial<ItemFiscalProdutoListRow> = {}): ItemFiscalProdutoListRow {
  return {
    id: 'if-1',
    criado_em: '2024-01-01',
    atualizado_em: '2024-01-01',
    produto_id: 'prod-1',
    produto_codigo: 'COD-1',
    produto_descricao: 'Descricao',
    ordem: 1,
    rotulo: '',
    cfop: '',
    objetivo_entrada: 'OUTRAS_ENTRADAS',
    origem_mercadoria: null,
    cst_icms: '',
    csosn: '',
    icms_grupo_xml: '',
    mod_bc_icms: '',
    v_bc_icms: null,
    p_icms: null,
    v_icms: null,
    cst_ipi: '',
    v_bc_ipi: null,
    p_ipi: null,
    v_ipi: null,
    cst_pis: '',
    v_bc_pis: null,
    p_pis: null,
    v_pis: null,
    cst_cofins: '',
    v_bc_cofins: null,
    p_cofins: null,
    v_cofins: null,
    n_item_nfe: null,
    ...overrides,
  }
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ItensFiscaisListPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ItensFiscaisListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mostra carregamento enquanto a query esta pendente', async () => {
    listarItensFiscais.mockImplementation(() => new Promise(() => {}))
    renderPage()
    expect(screen.getByText('Carregando…')).toBeInTheDocument()
  })

  it('mostra alerta quando a lista falha', async () => {
    listarItensFiscais.mockRejectedValue(new Error('sem rede'))
    renderPage()
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('sem rede'))
  })

  it('mostra mensagem quando nao ha itens', async () => {
    listarItensFiscais.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
      hasNext: false,
      hasPrevious: false,
    })
    renderPage()
    await waitFor(() => expect(screen.getByText('Nenhum item encontrado.')).toBeInTheDocument())
  })

  it('renderiza tabela, tracos para campos vazios e paginacao', async () => {
    listarItensFiscais.mockResolvedValue({
      items: [
        fiscalRow({
          rotulo: '',
          cfop: '',
          p_ipi: '',
          n_item_nfe: 3,
        }),
        fiscalRow({
          id: 'if-2',
          produto_id: 'prod-2',
          produto_codigo: 'COD-2',
          rotulo: 'NFe',
          cfop: '5102',
          origem_mercadoria: '0',
          cst_icms: '00',
          p_ipi: '10',
        }),
      ],
      total: 80,
      page: 1,
      pageSize: 50,
      hasNext: true,
      hasPrevious: false,
    })
    renderPage()
    await waitFor(() => expect(screen.getByText('COD-1')).toBeInTheDocument())

    const tracos = screen.getAllByText('—')
    expect(tracos.length).toBeGreaterThanOrEqual(4)

    expect(screen.getByRole('link', { name: 'COD-1' })).toHaveAttribute('href', '/catalogo/produtos/prod-1')
    expect(screen.getByText('Mostrando 2 de 80 itens')).toBeInTheDocument()

    const anterior = screen.getByRole('button', { name: 'Anterior' })
    const proxima = screen.getByRole('button', { name: 'Próxima' })
    expect(anterior).toBeDisabled()
    expect(proxima).not.toBeDisabled()
  })

  it('dispara refetch ao clicar em Atualizar', async () => {
    listarItensFiscais.mockResolvedValue({
      items: [fiscalRow()],
      total: 1,
      page: 1,
      pageSize: 50,
      hasNext: false,
      hasPrevious: false,
    })
    renderPage()
    await waitFor(() => expect(listarItensFiscais).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }))
    await waitFor(() => expect(listarItensFiscais).toHaveBeenCalledTimes(2))
  })
})
