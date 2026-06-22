import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const previewCatalogoNfeMock = vi.hoisted(() => vi.fn())
const importarCatalogoNfeMock = vi.hoisted(() => vi.fn())
const vincularProdutoItemNfeMock = vi.hoisted(() => vi.fn())
const listarFornecedoresNfeMock = vi.hoisted(() => vi.fn())
const useCategoriaListQueryMock = vi.hoisted(() => vi.fn())
const showToastMock = vi.hoisted(() => vi.fn())

vi.mock('../services/fiscalNfeService', () => ({
  previewCatalogoNfe: (...args: unknown[]) => previewCatalogoNfeMock(...args),
  importarCatalogoNfe: (...args: unknown[]) => importarCatalogoNfeMock(...args),
  vincularProdutoItemNfe: (...args: unknown[]) => vincularProdutoItemNfeMock(...args),
}))

vi.mock('@/modules/catalogo/services/nfeImportService', () => ({
  listarFornecedoresNfe: (...args: unknown[]) => listarFornecedoresNfeMock(...args),
}))

vi.mock('@/modules/catalogo/hooks/useCategoriaListQuery', () => ({
  useCategoriaListQuery: () => useCategoriaListQueryMock(),
}))

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

import NfeImportarCatalogoPage from './NfeImportarCatalogoPage'

function previewStub() {
  return {
    documento_id: 5,
    chave_acesso: '0'.repeat(44),
    cnpj_emitente: '11222333000199',
    nome_emitente: 'Distribuidora X',
    objetivo_entrada: 'REVENDA',
    snapshot: {
      emitente: {
        cnpj: '11222333000199',
        razao_social: 'Distribuidora X',
        cadastro_fornecedor_disponivel: true,
      },
      identificacao: { numero: '10', serie: '1', chave: '0'.repeat(44) },
      itens: [
        {
          n_item: 1,
          c_prod: 'P1',
          x_prod: 'Produto 1',
          ncm: '85371090',
          cest: '',
          cfop: '',
          c_ean: '',
          unidade_catalogo: 'UN',
          v_un_com: '10.00',
          q_com: '1',
          imposto: {},
          produto_existente: null,
          match: { metodo: 'NENHUM', sugestoes: [] },
          item_documento_id: 100,
          item_vinculado_produto_id: null,
        },
      ],
    },
  }
}

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/fiscal/nfes/5/importar-catalogo']}>
        <Routes>
          <Route path="/fiscal/nfes/:id/importar-catalogo" element={<NfeImportarCatalogoPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('NfeImportarCatalogoPage — fornecedor/fabricante', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    previewCatalogoNfeMock.mockResolvedValue(previewStub())
    importarCatalogoNfeMock.mockResolvedValue({
      produtos_criados: ['P1'],
      produtos_atualizados: [],
      produtos_ignorados: [],
      fornecedores_associados: [],
      itens_vinculados: 1,
      avisos: [],
    })
    listarFornecedoresNfeMock.mockResolvedValue([
      { id: 'fab-1', razao_social: 'Fabricante Real Ltda', cnpj: '99888777000166' },
    ])
    useCategoriaListQueryMock.mockReturnValue({
      data: [{ id: 'cat1', nome: 'Disjuntores', nome_display: 'Disjuntores' }],
      isPending: false,
    })
  })

  async function prepararItemCategorizado() {
    renderPage()
    await screen.findByText('Produto 1')
    fireEvent.change(screen.getByLabelText('Categoria do item 1'), { target: { value: 'cat1' } })
  }

  it('por padrão envia o emitente como fornecedor e não envia fabricante (fornecedor = fabricante)', async () => {
    await prepararItemCategorizado()

    fireEvent.click(screen.getByRole('button', { name: /importar selecionados/i }))

    await waitFor(() => expect(importarCatalogoNfeMock).toHaveBeenCalledTimes(1))
    const [docId, payload] = importarCatalogoNfeMock.mock.calls[0]
    expect(docId).toBe(5)
    expect(payload.itens[0]).toMatchObject({ criar_fornecedor: true })
    expect(payload.itens[0]).not.toHaveProperty('criar_fabricante')
    expect(payload.itens[0]).not.toHaveProperty('fabricante_id')
  })

  it('ao desmarcar "fornecedor é fabricante" permite informar um fabricante distinto', async () => {
    await prepararItemCategorizado()

    fireEvent.click(screen.getByLabelText(/o fornecedor é o fabricante destes produtos/i))
    fireEvent.change(screen.getByLabelText('Fabricante'), { target: { value: 'parceiro:fab-1' } })

    fireEvent.click(screen.getByRole('button', { name: /importar selecionados/i }))

    await waitFor(() => expect(importarCatalogoNfeMock).toHaveBeenCalledTimes(1))
    const [, payload] = importarCatalogoNfeMock.mock.calls[0]
    expect(payload.itens[0]).toMatchObject({
      criar_fornecedor: true,
      criar_fabricante: false,
      fabricante_id: 'fab-1',
    })
  })
})
