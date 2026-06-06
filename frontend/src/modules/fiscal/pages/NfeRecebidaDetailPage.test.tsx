import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useNfeRecebidaDetailQueryMock = vi.hoisted(() => vi.fn())
const navigateMock = vi.hoisted(() => vi.fn())
const showToastMock = vi.hoisted(() => vi.fn())
const importarNfeXmlManualMock = vi.hoisted(() => vi.fn())

vi.mock('../hooks/useNfeRecebidaDetailQuery', () => ({
  useNfeRecebidaDetailQuery: (...args: unknown[]) => useNfeRecebidaDetailQueryMock(...args),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

vi.mock('../services/fiscalNfeService', () => ({
  importarNfeXmlManual: (...args: unknown[]) => importarNfeXmlManualMock(...args),
}))

vi.mock('../components/NfeManifestacaoDestinatarioPanel', () => ({
  default: () => <div data-testid="manifestacao-panel" />,
}))

import NfeRecebidaDetailPage from './NfeRecebidaDetailPage'
import NfeImportarManualPage from './NfeImportarManualPage'

describe('NfeRecebidaDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useNfeRecebidaDetailQueryMock.mockReturnValue({
      data: {
        id: 5,
        numero: '500',
        serie: '1',
        chave_acesso: '123',
        nsu: '1',
        cnpj_emitente: '11222333000199',
        nome_emitente: 'Fornecedor',
        cnpj_destinatario: '99888777000166',
        nome_destinatario: 'Cliente',
        data_emissao: '2026-01-01',
        valor_total: '900.00',
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
        xml_original: '<nfeProc/>',
      },
      isPending: false,
      isError: false,
      error: null,
    })
  })

  it('renderiza detalhe da NF-e', () => {
    render(
      <MemoryRouter initialEntries={['/fiscal/nfes/5']}>
        <Routes>
          <Route path="/fiscal/nfes/:id" element={<NfeRecebidaDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: /nf-e 500/i })).toBeInTheDocument()
    expect(useNfeRecebidaDetailQueryMock).toHaveBeenCalledWith(5, true)
  })

  it('mostra aviso para id inválido', () => {
    render(
      <MemoryRouter initialEntries={['/fiscal/nfes/abc']}>
        <Routes>
          <Route path="/fiscal/nfes/:id" element={<NfeRecebidaDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText(/identificador da nf-e inválido/i)).toBeInTheDocument()
  })
})

describe('NfeImportarManualPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    importarNfeXmlManualMock.mockResolvedValue({
      message: 'Importado',
      documento_id: 9,
    })
  })

  function renderImportPage() {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <NfeImportarManualPage />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  it('desabilita importação sem XML', () => {
    renderImportPage()
    expect(screen.getByRole('button', { name: /^importar$/i })).toBeDisabled()
  })

  it('importa XML colado', async () => {
    renderImportPage()
    fireEvent.change(screen.getByLabelText(/ou cole o xml/i), {
      target: { value: '<nfeProc/>' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^importar$/i }))

    await waitFor(() => expect(importarNfeXmlManualMock).toHaveBeenCalled())
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/fiscal/nfes/9'))
  })
})
