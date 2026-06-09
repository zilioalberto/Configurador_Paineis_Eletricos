import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useRelatorioNfesQueryMock = vi.hoisted(() => vi.fn())

vi.mock('../hooks/useRelatorioNfesQuery', () => ({
  useRelatorioNfesQuery: (...args: unknown[]) => useRelatorioNfesQueryMock(...args),
}))

import RelatorioNfesPage from './RelatorioNfesPage'

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <RelatorioNfesPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('RelatorioNfesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useRelatorioNfesQueryMock.mockReturnValue({
      data: {
        filtros: {},
        resumo: {
          tipo_movimento: 'ENTRADA',
          total_documentos: 1,
          valor_total: '52.50',
          por_objetivo: [
            {
              tipo_movimento: 'ENTRADA',
              objetivo: 'INDUSTRIALIZACAO',
              total_documentos: 1,
              valor_total: '52.50',
            },
          ],
        },
        documentos: [
          {
            id: 1,
            tipo_movimento: 'ENTRADA',
            tipo_documento: 'NFE_PRODUTO',
            chave_acesso: '35260111222333000199550010000001231234567890',
            numero: '123',
            serie: '1',
            nome_emitente: 'Fornecedor SA',
            cnpj_emitente: '11222333000199',
            cnpj_destinatario: '99888777000166',
            nome_destinatario: 'ZFW',
            nsu: '10',
            data_emissao: '2026-06-10T10:00:00-03:00',
            valor_total: '52.50',
            natureza_operacao: 'Venda',
            participante_nome: 'Fornecedor SA',
            participante_cnpj: '11222333000199',
            objetivo: 'INDUSTRIALIZACAO',
            status_importacao: 'PROCESSADA',
            origem_importacao: 'MANUAL',
            manifestacao_status: 'NAO_SOLICITADA',
            manifestacao_tipo: '',
            manifestacao_justificativa: '',
            manifestacao_protocolo: '',
            manifestacao_cstat: '',
            manifestacao_motivo: '',
            manifestacao_solicitada_em: null,
            manifestacao_registrada_em: null,
            itens: [
              {
                id: 11,
                numero_item: 1,
                codigo_fornecedor: 'FAB-001',
                descricao: 'Produto linha fiscal',
                ncm: '85444200',
                cfop: '5102',
                unidade: 'UN',
                quantidade: '5.0000',
                valor_unitario: '10.5000',
                valor_total: '52.50',
                importado_para_produto: false,
                criado_em: '2026-06-10',
                atualizado_em: '2026-06-10',
              },
            ],
            criada_em: '2026-06-10',
            atualizada_em: '2026-06-10',
          },
        ],
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
  })

  it('renderiza resumo e expande itens da NF-e', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: /relatório de nf-es/i })).toBeInTheDocument()
    expect(screen.getByText('Fornecedor SA')).toBeInTheDocument()
    expect(screen.getAllByText('Industrialização').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('R$ 52,50').length).toBeGreaterThanOrEqual(1)

    fireEvent.click(screen.getByRole('button', { name: /ver itens/i }))
    expect(screen.getByText('FAB-001')).toBeInTheDocument()
    expect(screen.getByText('Produto linha fiscal')).toBeInTheDocument()
  })

  it('atualiza filtros usados pela query', () => {
    renderPage()
    fireEvent.change(screen.getByLabelText(/nome do participante/i), {
      target: { value: 'WEG' },
    })
    expect(useRelatorioNfesQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ fornecedor: 'WEG' })
    )
  })

  it('limpa período para evitar relatório vazio por filtro de mês', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /ver todo período/i }))
    expect(useRelatorioNfesQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ data_inicio: '', data_fim: '' })
    )
  })
})
