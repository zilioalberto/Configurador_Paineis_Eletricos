import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const showToast = vi.hoisted(() => vi.fn())
const aplicarImportacaoNfe = vi.hoisted(() => vi.fn())
const buscarProdutoResumoImportacaoNfe = vi.hoisted(() => vi.fn())
const listarFornecedoresNfe = vi.hoisted(() => vi.fn())
const previewNfeXml = vi.hoisted(() => vi.fn())
const useCategoriaListQuery = vi.hoisted(() => vi.fn())

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast }),
}))

vi.mock('../hooks/useCategoriaListQuery', () => ({
  useCategoriaListQuery: () => useCategoriaListQuery(),
}))

vi.mock('../services/nfeImportService', () => ({
  aplicarImportacaoNfe: (...args: unknown[]) => aplicarImportacaoNfe(...args),
  buscarProdutoResumoImportacaoNfe: (...args: unknown[]) =>
    buscarProdutoResumoImportacaoNfe(...args),
  listarFornecedoresNfe: (...args: unknown[]) => listarFornecedoresNfe(...args),
  previewNfeXml: (...args: unknown[]) => previewNfeXml(...args),
}))

import NfeImportPage from './NfeImportPage'

const categorias = [
  { id: 'cat-plc', nome: 'PLC', nome_display: 'PLC' },
  { id: 'cat-contatora', nome: 'CONTATORA', nome_display: 'Contatora' },
]

const produtoExistente = {
  id: 'prod-1',
  codigo: 'P-EXISTE',
  descricao: 'Produto antigo',
  categoria: 'cat-plc',
  ncm: '85044000',
  gtin: '',
  unidade_medida: 'UN',
  preco_base: '10.00',
  item_fiscal: {
    cfop_padrao: '5102',
    cst_icms: '00',
    csosn: '',
    p_icms: '18.00',
    cst_pis: '01',
    p_pis: '1.65',
    cst_cofins: '01',
    p_cofins: '7.60',
  },
}

const snapshot = {
  identificacao: {
    numero: '123',
    serie: '1',
    chave: 'NFE123',
    data_emissao: '2026-05-10',
  },
  emitente: {
    razao_social: 'Fornecedor XML',
    cnpj: '12345678000199',
    inscricao_estadual: '123',
    logradouro: 'Rua A',
    numero: '100',
    municipio: 'São Paulo',
    uf: 'SP',
    cadastro_fornecedor_disponivel: true,
  },
  itens: [
    {
      n_item: 1,
      c_prod: 'P-EXISTE',
      x_prod: 'Produto novo',
      ncm: '85044000',
      cfop: '5102',
      u_com: 'UN',
      u_trib: 'UN',
      v_un_com: '12.50',
      gtin: '',
      impostos: {
        icms: {
          orig: '0',
          cst_icms: '00',
          icms_grupo_xml: 'ICMS00',
          p_icms: '18.00',
          v_icms: '2.25',
        },
        pis: { cst_pis: '01', p_pis: '1.65' },
        cofins: { cst_cofins: '01', p_cofins: '7.60' },
      },
      produto_existente: produtoExistente,
    },
    {
      n_item: 2,
      c_prod: 'P-NOVO',
      x_prod: 'Produto sem cadastro',
      ncm: '',
      cfop: '',
      u_com: 'PC',
      u_trib: '',
      v_un_com: '5.00',
      gtin: '7891234567890',
      impostos: {},
      produto_existente: null,
    },
  ],
}

function renderPage() {
  render(
    <MemoryRouter>
      <NfeImportPage />
    </MemoryRouter>
  )
}

describe('NfeImportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useCategoriaListQuery.mockReturnValue({ data: categorias, isPending: false })
    listarFornecedoresNfe.mockResolvedValue([
      { id: 'forn-1', razao_social: 'Fornecedor cadastrado', cnpj: '111' },
      { id: 'forn-emit', razao_social: 'Fornecedor XML', cnpj: '12345678000199' },
    ])
    previewNfeXml.mockResolvedValue({
      snapshot,
      fornecedor_catalogo: {
        id: 'forn-emit',
        razao_social: 'Fornecedor XML',
        cnpj: '12345678000199',
      },
    })
    buscarProdutoResumoImportacaoNfe.mockResolvedValue(null)
    aplicarImportacaoNfe.mockResolvedValue({
      fornecedor_id: 'forn-emit',
      fornecedor_criado: false,
      fornecedores_associados: [{ id: 'forn-emit', razao_social: 'Fornecedor XML' }],
      produtos_criados: ['P-NOVO'],
      produtos_atualizados: ['P-EXISTE'],
      produtos_ignorados: [{ n_item: 3, codigo: 'P-IGN', motivo: 'Duplicado' }],
      avisos: ['Revise o NCM'],
    })
  })

  it('mantém leitura bloqueada sem arquivo selecionado', async () => {
    renderPage()

    expect(screen.getByRole('button', { name: /Ler XML/i })).toBeDisabled()
  })

  it('lê XML, aplica seleção global e importa itens', async () => {
    renderPage()

    const file = new File(['<nfe />'], 'nfe.xml', { type: 'text/xml' })
    fireEvent.change(screen.getByLabelText(/XML da NF-e/i), {
      target: { files: [file] },
    })
    fireEvent.click(screen.getByRole('button', { name: /Ler XML/i }))

    expect((await screen.findAllByText(/Fornecedor XML/)).length).toBeGreaterThan(0)
    expect(screen.getByText('Divergente')).toBeInTheDocument()
    expect(screen.getByText('Novo')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Categoria para itens marcados'), {
      target: { value: 'cat-contatora' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar categoria' }))
    fireEvent.change(screen.getByLabelText('Fornecedor para itens marcados'), {
      target: { value: 'fornecedor:forn-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar fornecedor' }))

    const primeiraLinha = screen.getByDisplayValue('P-EXISTE').closest('tr')
    expect(primeiraLinha).not.toBeNull()
    fireEvent.click(within(primeiraLinha as HTMLTableRowElement).getByLabelText(/Importar item 1/i))
    fireEvent.click(screen.getByRole('button', { name: 'Marcar todos' }))
    fireEvent.click(screen.getByRole('button', { name: /Ver campos/i }))

    fireEvent.change(screen.getByLabelText('Fabricante nos produtos (opcional)'), {
      target: { value: 'Fabricante manual' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Aplicar importação/i }))

    await waitFor(() => {
      expect(aplicarImportacaoNfe).toHaveBeenCalled()
    })
    expect(aplicarImportacaoNfe.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        fabricante_padrao: 'Fabricante manual',
        itens: expect.arrayContaining([
          expect.objectContaining({
            n_item: 1,
            importar: true,
            fornecedor_id: 'forn-1',
            categoria_catalogo: 'cat-contatora',
          }),
        ]),
      })
    )
    expect(await screen.findByText(/Produtos criados/i)).toBeInTheDocument()
    expect(screen.getByText('Revise o NCM')).toBeInTheDocument()
    expect(screen.getByText('Duplicado')).toBeInTheDocument()
  })

  it('trata falhas de fornecedores, preview e importação', async () => {
    listarFornecedoresNfe.mockRejectedValueOnce(new Error('fornecedores'))
    previewNfeXml.mockRejectedValueOnce(new Error('preview'))
    aplicarImportacaoNfe.mockRejectedValueOnce(new Error('aplicar'))

    renderPage()

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Não foi possível carregar a lista de fornecedores cadastrados.',
        })
      )
    })

    const file = new File(['<nfe />'], 'erro.xml', { type: 'text/xml' })
    fireEvent.change(screen.getByLabelText(/XML da NF-e/i), {
      target: { files: [file] },
    })
    fireEvent.click(screen.getByRole('button', { name: /Ler XML/i }))

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Leitura do XML' })
      )
    })

    previewNfeXml.mockResolvedValueOnce({ snapshot, fornecedor_catalogo: null })
    fireEvent.click(screen.getByRole('button', { name: /Ler XML/i }))
    expect(await screen.findByText('Produto sem cadastro')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Categoria para itens marcados'), {
      target: { value: 'cat-plc' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar categoria' }))
    fireEvent.click(screen.getByRole('button', { name: /Aplicar importação/i }))

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Importação' }))
    })
  })

  it('alterna marcar/desmarcar todos os itens após leitura do XML', async () => {
    renderPage()

    const file = new File(['<nfe />'], 'nfe.xml', { type: 'text/xml' })
    fireEvent.change(screen.getByLabelText(/XML da NF-e/i), {
      target: { files: [file] },
    })
    fireEvent.click(screen.getByRole('button', { name: /Ler XML/i }))
    await screen.findByText('Produto sem cadastro')

    const desmarcar = await screen.findByRole('button', { name: 'Desmarcar todos' })
    fireEvent.click(desmarcar)
    expect(screen.getByRole('button', { name: 'Marcar todos' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Marcar todos' }))
    expect(screen.getByRole('button', { name: 'Desmarcar todos' })).toBeInTheDocument()
  })

  it('bloqueia importação enquanto categorias estão a carregar', async () => {
    useCategoriaListQuery.mockReturnValue({ data: categorias, isPending: true })

    renderPage()

    const file = new File(['<nfe />'], 'nfe.xml', { type: 'text/xml' })
    fireEvent.change(screen.getByLabelText(/XML da NF-e/i), {
      target: { files: [file] },
    })
    fireEvent.click(screen.getByRole('button', { name: /Ler XML/i }))
    await screen.findByText('Produto sem cadastro')

    expect(screen.getByRole('button', { name: /Aplicar importação/i })).toBeDisabled()
  })

  it('avisa quando há itens marcados sem categoria e mantém importação bloqueada', async () => {
    renderPage()

    const file = new File(['<nfe />'], 'nfe.xml', { type: 'text/xml' })
    fireEvent.change(screen.getByLabelText(/XML da NF-e/i), {
      target: { files: [file] },
    })
    fireEvent.click(screen.getByRole('button', { name: /Ler XML/i }))
    await screen.findByText('Produto sem cadastro')

    expect(
      screen.getByText(/Categorize todos os produtos marcados para liberar a importação/i)
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Aplicar importação/i })).toBeDisabled()
  })

  it('mostra situação Alinhado quando XML coincide com o produto do catálogo', async () => {
    const produtoAlinhado = {
      id: 'prod-alin',
      codigo: 'ALIN-1',
      descricao: 'Motor WEG 1cv',
      categoria: 'cat-plc',
      unidade_medida: 'UN',
      unidade_tributavel: '',
      preco_base: '10.00',
      ncm: '85044000',
      cest: '',
      gtin: '',
      origem_mercadoria: '0',
      fabricante: '',
      referencia_fabricante: '',
      aliquota_ipi: '',
      fabricante_parceiro_id: '',
    }
    const snapshotAlinhado = {
      ...snapshot,
      itens: [
        {
          n_item: 1,
          c_prod: 'ALIN-1',
          x_prod: 'Motor WEG 1cv',
          ncm: '85044000',
          cest: '',
          c_ean: '',
          u_com: 'UN',
          unidade_catalogo: 'UN',
          u_trib_catalogo: '',
          q_com: '1',
          v_un_com: '10.00',
          cfop: '5102',
          imposto: { orig: '0', p_ipi: '' },
          produto_existente: produtoAlinhado,
        },
      ],
    }
    previewNfeXml.mockResolvedValueOnce({
      snapshot: snapshotAlinhado,
      fornecedor_catalogo: null,
    })

    renderPage()

    const file = new File(['<nfe />'], 'alin.xml', { type: 'text/xml' })
    fireEvent.change(screen.getByLabelText(/XML da NF-e/i), {
      target: { files: [file] },
    })
    fireEvent.click(screen.getByRole('button', { name: /Ler XML/i }))

    expect(await screen.findByText('Alinhado')).toBeInTheDocument()
    expect(screen.queryByText('Divergente')).not.toBeInTheDocument()
  })

  it('avisa quando emitente não permite cadastro automático de fornecedor (CPF)', async () => {
    const snapshotCpf = {
      ...snapshot,
      emitente: { ...snapshot.emitente, cadastro_fornecedor_disponivel: false },
    }
    previewNfeXml.mockResolvedValueOnce({
      snapshot: snapshotCpf,
      fornecedor_catalogo: null,
    })

    renderPage()

    const file = new File(['<nfe />'], 'cpf.xml', { type: 'text/xml' })
    fireEvent.change(screen.getByLabelText(/XML da NF-e/i), {
      target: { files: [file] },
    })
    fireEvent.click(screen.getByRole('button', { name: /Ler XML/i }))

    expect(
      await screen.findByText(/Emitente com CPF: não é possível usar o cadastro automático/i)
    ).toBeInTheDocument()
  })
})
