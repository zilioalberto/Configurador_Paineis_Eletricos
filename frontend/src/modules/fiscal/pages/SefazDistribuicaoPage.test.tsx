import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DocumentoSefazDistribuidoListRow } from '../types/documentoFiscalRecebido'

const showToastMock = vi.hoisted(() => vi.fn())
const useSefazDistribuicaoListQueryMock = vi.hoisted(() => vi.fn())
const sincronizarNfesSefazMock = vi.hoisted(() => vi.fn())
const solicitarManifestacaoMock = vi.hoisted(() => vi.fn())

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

vi.mock('../hooks/useSefazDistribuicaoListQuery', () => ({
  useSefazDistribuicaoListQuery: (...args: unknown[]) => useSefazDistribuicaoListQueryMock(...args),
}))

vi.mock('../services/fiscalNfeService', () => ({
  sincronizarNfesSefaz: () => sincronizarNfesSefazMock(),
  solicitarManifestacaoSefazDistribuicao: (...args: unknown[]) => solicitarManifestacaoMock(...args),
}))

import SefazDistribuicaoPage from './SefazDistribuicaoPage'

function doc(overrides: Partial<DocumentoSefazDistribuidoListRow> = {}): DocumentoSefazDistribuidoListRow {
  return {
    id: 10,
    tipo_documento: 'RESUMO_NFE',
    chave_acesso: '1'.repeat(44),
    nsu: '000000000000123',
    schema: 'resNFe_v1.01.xsd',
    nome_emitente: 'Fornecedor ABC',
    cnpj_emitente: '12345678000199',
    data_emissao: '2026-06-10',
    valor_total: '1500.00',
    situacao_nfe: '1',
    status: 'RESUMO_RECEBIDO',
    ultimo_erro: '',
    manifestacao_status: 'NAO_SOLICITADA',
    manifestacao_tipo: '',
    manifestacao_cstat: '',
    manifestacao_motivo: '',
    documento_recebido_id: null,
    ...overrides,
  } as DocumentoSefazDistribuidoListRow
}

function mockQuery(overrides: Record<string, unknown> = {}) {
  useSefazDistribuicaoListQueryMock.mockReturnValue({
    data: { items: [doc()], total: 1, hasNext: false, hasPrevious: false },
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  })
}

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SefazDistribuicaoPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SefazDistribuicaoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sincronizarNfesSefazMock.mockResolvedValue({
      sucesso: true,
      mensagem: 'Sincronização concluída',
      documentos_novos: 2,
      resumos_novos: 1,
      ultimo_cstat: '138',
    })
    solicitarManifestacaoMock.mockResolvedValue({ message: 'Manifestação registrada' })
    mockQuery()
  })

  it('mostra estado de carregamento', () => {
    mockQuery({ data: undefined, isPending: true })
    renderPage()
    expect(screen.getByText('Carregando documentos...')).toBeInTheDocument()
  })

  it('mostra erro quando a consulta falha', () => {
    mockQuery({ data: undefined, isPending: false, isError: true, error: new Error('Caixa fora do ar') })
    renderPage()
    expect(screen.getByRole('alert')).toHaveTextContent('Caixa fora do ar')
  })

  it('mostra estado vazio', () => {
    mockQuery({ data: { items: [], total: 0, hasNext: false, hasPrevious: false } })
    renderPage()
    expect(screen.getByText('Nenhum resumo SEFAZ encontrado.')).toBeInTheDocument()
  })

  it('renderiza linha com botões de manifestação', () => {
    renderPage()
    expect(screen.getByText('Fornecedor ABC')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ciência' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument()
  })

  it('mostra link "Abrir NF-e" quando XML já importado', () => {
    mockQuery({
      data: {
        items: [doc({ status: 'XML_IMPORTADO', documento_recebido_id: 77 })],
        total: 1,
        hasNext: false,
        hasPrevious: false,
      },
    })
    renderPage()
    expect(screen.getByRole('link', { name: 'Abrir NF-e' })).toBeInTheDocument()
  })

  it('solicita manifestação de ciência', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Ciência' }))

    await waitFor(() =>
      expect(solicitarManifestacaoMock).toHaveBeenCalledWith(10, {
        tipo: 'CIENCIA',
        justificativa: undefined,
      }),
    )
    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'success', message: 'Manifestação registrada' }),
      ),
    )
  })

  it('exige justificativa para operação não realizada', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Não realizada' }))

    const enviar = screen.getByRole('button', { name: 'Enviar manifestação' })
    expect(enviar).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/Justificativa para operação não realizada/i), {
      target: { value: 'Mercadoria nunca foi recebida pela empresa' },
    })
    expect(screen.getByRole('button', { name: 'Enviar manifestação' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar manifestação' }))

    await waitFor(() =>
      expect(solicitarManifestacaoMock).toHaveBeenCalledWith(10, {
        tipo: 'NAO_REALIZADA',
        justificativa: 'Mercadoria nunca foi recebida pela empresa',
      }),
    )
  })

  it('dispara a sincronização com a SEFAZ', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Buscar XMLs na SEFAZ' }))

    await waitFor(() => expect(sincronizarNfesSefazMock).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'success' }),
      ),
    )
  })

  it('avança a paginação', async () => {
    mockQuery({
      data: { items: [doc()], total: 120, hasNext: true, hasPrevious: false },
    })
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }))

    await waitFor(() =>
      expect(useSefazDistribuicaoListQueryMock).toHaveBeenLastCalledWith(
        expect.anything(),
        2,
        50,
      ),
    )
  })
})
