import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useNfesRecebidasListQueryMock = vi.hoisted(() => vi.fn())

vi.mock('../hooks/useNfesRecebidasListQuery', () => ({
  useNfesRecebidasListQuery: (...args: unknown[]) => useNfesRecebidasListQueryMock(...args),
}))

import NfesRecebidasListPage from './NfesRecebidasListPage'

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <NfesRecebidasListPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('NfesRecebidasListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useNfesRecebidasListQueryMock.mockReturnValue({
      data: {
        items: [
          {
            id: 1,
            chave_acesso: '35260111222333000199550010000001231234567890',
            numero: '123',
            serie: '1',
            nome_emitente: 'Fornecedor SA',
            cnpj_emitente: '11222333000199',
            cnpj_destinatario: '99888777000166',
            nome_destinatario: 'Cliente',
            nsu: '10',
            data_emissao: '2026-01-01',
            valor_total: '1500.00',
            natureza_operacao: 'Venda',
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
            itens: [],
            criada_em: '2026-01-01',
            atualizada_em: '2026-01-01',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 50,
        hasNext: false,
        hasPrevious: false,
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
  })

  it('renderiza lista de NF-es recebidas', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /nf-es recebidas/i })).toBeInTheDocument()
    expect(screen.getByText('Fornecedor SA')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /abrir/i })).toHaveAttribute('href', '/fiscal/nfes/1')
  })

  it('mostra carregamento', () => {
    useNfesRecebidasListQueryMock.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
    renderPage()
    expect(screen.getByText(/carregando/i)).toBeInTheDocument()
  })

  it('atualiza filtro com debounce', async () => {
    renderPage()
    fireEvent.change(screen.getByLabelText(/chave de acesso/i), {
      target: { value: '3526' },
    })
    await waitFor(
      () =>
        expect(useNfesRecebidasListQueryMock).toHaveBeenCalledWith(
          expect.objectContaining({ chave_acesso: '3526' }),
          1,
          50
        ),
      { timeout: 1500 }
    )
  })
})
