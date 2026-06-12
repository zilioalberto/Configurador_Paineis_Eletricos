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

vi.mock('../hooks/useFiscalConfigQuery', () => ({
  useFiscalConfigQuery: () => ({
    data: { cnpj_empresa: '07284171000139' },
  }),
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
        objetivo_entrada: 'INDUSTRIALIZACAO',
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
    expect(screen.getAllByText(/Industrialização/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /importar itens no catálogo/i })).toHaveAttribute(
      'href',
      '/catalogo/produtos/importar-nfe?documentoFiscalId=5'
    )
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
    const xml = `<nfeProc><NFe><infNFe>
      <dest><CNPJ>07284171000139</CNPJ><xNome>ZFW Engenharia</xNome></dest>
    </infNFe></NFe></nfeProc>`
    fireEvent.change(screen.getByLabelText(/ou cole o xml/i), {
      target: { value: xml },
    })
    fireEvent.change(screen.getByLabelText(/objetivo da entrada/i), {
      target: { value: 'USO_CONSUMO' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^importar$/i }))

    await waitFor(() => expect(importarNfeXmlManualMock).toHaveBeenCalled())
    expect(importarNfeXmlManualMock).toHaveBeenCalledWith(
      expect.objectContaining({ objetivo_entrada: 'USO_CONSUMO' })
    )
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/fiscal/nfes/9'))
  })

  it('abre revisão do catálogo após importar quando opção está marcada', async () => {
    renderImportPage()
    const xml = `<nfeProc><NFe><infNFe>
      <dest><CNPJ>07284171000139</CNPJ><xNome>ZFW Engenharia</xNome></dest>
    </infNFe></NFe></nfeProc>`
    fireEvent.change(screen.getByLabelText(/ou cole o xml/i), {
      target: { value: xml },
    })
    fireEvent.change(screen.getByLabelText(/objetivo da entrada/i), {
      target: { value: 'USO_CONSUMO' },
    })
    fireEvent.click(
      screen.getByLabelText(/após importar, revisar itens para adicionar ao catálogo/i),
    )
    fireEvent.click(screen.getByRole('button', { name: /^importar$/i }))

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith(
        '/catalogo/produtos/importar-nfe?documentoFiscalId=9',
      ),
    )
  })

  it('importa todos os XMLs de uma pasta', async () => {
    renderImportPage()
    const xml1 = `<nfeProc><NFe><infNFe><dest><CNPJ>07284171000139</CNPJ></dest>
      <nNF>100</nNF></infNFe></NFe></nfeProc>`
    const xml2 = `<nfeProc><NFe><infNFe><dest><CNPJ>07284171000139</CNPJ></dest>
      <nNF>101</nNF></infNFe></NFe></nfeProc>`
    const file1 = new File([xml1], 'nfe-100.xml', { type: 'application/xml' })
    const file2 = new File([xml2], 'nfe-101.xml', { type: 'application/xml' })
    const ignored = new File(['texto'], 'readme.txt', { type: 'text/plain' })
    Object.defineProperty(file1, 'webkitRelativePath', { value: 'entrada/nfe-100.xml' })
    Object.defineProperty(file2, 'webkitRelativePath', { value: 'entrada/nfe-101.xml' })
    Object.defineProperty(ignored, 'webkitRelativePath', { value: 'entrada/readme.txt' })

    fireEvent.change(screen.getByLabelText(/pasta com xmls/i), {
      target: { files: [ignored, file2, file1] },
    })
    expect(await screen.findByText('nfe-100.xml')).toBeInTheDocument()
    expect(screen.getByText('nfe-101.xml')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/objetivo da entrada/i), {
      target: { value: 'USO_CONSUMO' },
    })
    fireEvent.click(screen.getByRole('button', { name: /importar 2 xmls/i }))

    await waitFor(() => expect(importarNfeXmlManualMock).toHaveBeenCalledTimes(2))
    expect(importarNfeXmlManualMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ xml: xml1, objetivo_entrada: 'USO_CONSUMO' }),
    )
    expect(importarNfeXmlManualMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ xml: xml2, objetivo_entrada: 'USO_CONSUMO' }),
    )
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/fiscal/nfes'))
  })
})
