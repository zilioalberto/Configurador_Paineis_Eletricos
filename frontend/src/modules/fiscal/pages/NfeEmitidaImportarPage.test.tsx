import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const importarDocumentoEmitidoManualMock = vi.hoisted(() => vi.fn())
const importarLoteDocumentosEmitidosMock = vi.hoisted(() => vi.fn())
const navigateMock = vi.hoisted(() => vi.fn())
const showToastMock = vi.hoisted(() => vi.fn())
const useFiscalConfigQueryMock = vi.hoisted(() => vi.fn())

vi.mock('../hooks/useFiscalConfigQuery', () => ({
  useFiscalConfigQuery: () => useFiscalConfigQueryMock(),
}))

vi.mock('../services/fiscalNfeService', () => ({
  importarDocumentoEmitidoManual: (...args: unknown[]) => importarDocumentoEmitidoManualMock(...args),
  importarLoteDocumentosEmitidos: (...args: unknown[]) => importarLoteDocumentosEmitidosMock(...args),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

import NfeEmitidaImportarPage from './NfeEmitidaImportarPage'

describe('NfeEmitidaImportarPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useFiscalConfigQueryMock.mockReturnValue({
      data: { cnpj_empresa: '07284171000139' },
    })
    importarDocumentoEmitidoManualMock.mockResolvedValue({
      created: true,
      message: 'Importado',
      documento_id: 9,
      identificador: 'NFSE:9',
    })
    importarLoteDocumentosEmitidosMock.mockResolvedValue({
      total: 2,
      criados: 2,
      duplicados: 0,
      erros: 0,
      itens: [],
    })
  })

  it('importa XML selecionado com classificação automática', async () => {
    render(
      <MemoryRouter>
        <NfeEmitidaImportarPage />
      </MemoryRouter>,
    )

    const xml = `<CompNfse>
      <PrestadorServico><IdentificacaoPrestador><Cnpj>07284171000139</Cnpj></IdentificacaoPrestador>
      <RazaoSocial>ZFW Engenharia</RazaoSocial></PrestadorServico>
      <Numero>42</Numero><ValorServicos>150.00</ValorServicos></CompNfse>`
    const file = new File([xml], 'nfse-42.xml', { type: 'application/xml' })
    fireEvent.change(screen.getByLabelText(/arquivos xml/i), {
      target: { files: [file] },
    })
    expect(await screen.findByText('nfse-42.xml')).toBeInTheDocument()
    expect(screen.getAllByText('NFS-e de serviço').length).toBeGreaterThanOrEqual(1)

    fireEvent.click(screen.getByRole('button', { name: /^importar$/i }))

    await waitFor(() => expect(importarDocumentoEmitidoManualMock).toHaveBeenCalled())
    expect(importarDocumentoEmitidoManualMock).toHaveBeenCalledWith({
      xml,
    })
    expect(navigateMock).toHaveBeenCalledWith('/fiscal/nfes-emitidas')
  })

  it('importa todos os XMLs de uma pasta em lote', async () => {
    render(
      <MemoryRouter>
        <NfeEmitidaImportarPage />
      </MemoryRouter>,
    )

    const xml1 = `
      <nfeProc>
        <NFe>
          <infNFe>
            <ide><natOp>Venda</natOp><serie>1</serie><nNF>100</nNF><dhEmi>2026-06-10T10:00:00-03:00</dhEmi></ide>
            <emit><CNPJ>07284171000139</CNPJ><xNome>ZFW Engenharia</xNome></emit>
            <dest><CNPJ>99888777000166</CNPJ><xNome>Cliente Alpha</xNome></dest>
            <det nItem="1"><prod><cProd>PRD-1</cProd><xProd>Produto teste</xProd><NCM>85371090</NCM><CFOP>5102</CFOP><uCom>UN</uCom><qCom>1.0000</qCom><vUnCom>10.00</vUnCom><vProd>10.00</vProd></prod></det>
            <total><ICMSTot><vBC>10.00</vBC><vICMS>1.20</vICMS><vProd>10.00</vProd><vDesc>0.00</vDesc><vFrete>0.00</vFrete><vNF>10.00</vNF></ICMSTot></total>
          </infNFe>
        </NFe>
      </nfeProc>`
    const xml2 = `<CompNfse>
      <PrestadorServico><IdentificacaoPrestador><Cnpj>07284171000139</Cnpj></IdentificacaoPrestador>
      <RazaoSocial>ZFW Engenharia</RazaoSocial></PrestadorServico>
      <Numero>200</Numero><ValorServicos>20.00</ValorServicos></CompNfse>`
    const file1 = new File([xml1], 'nfe-100.xml', { type: 'application/xml' })
    const file2 = new File([xml2], 'nfse-200.xml', { type: 'application/xml' })
    const ignored = new File(['texto'], 'readme.txt', { type: 'text/plain' })
    Object.defineProperty(file1, 'webkitRelativePath', { value: 'junho/nfe-100.xml' })
    Object.defineProperty(file2, 'webkitRelativePath', { value: 'junho/nfse-200.xml' })
    Object.defineProperty(ignored, 'webkitRelativePath', { value: 'junho/readme.txt' })

    fireEvent.change(screen.getByLabelText(/pasta com xmls/i), {
      target: { files: [ignored, file2, file1] },
    })

    expect(await screen.findByText('nfe-100.xml')).toBeInTheDocument()
    expect(screen.getByText('nfse-200.xml')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /NF-e de produto 100/i })).toBeInTheDocument()
    expect(screen.getByText('Cliente Alpha')).toBeInTheDocument()
    expect(screen.getByText('Produto teste')).toBeInTheDocument()
    expect(screen.getAllByText('R$ 10,00').length).toBeGreaterThanOrEqual(1)
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Arquivos ignorados',
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /^importar$/i }))

    await waitFor(() => expect(importarLoteDocumentosEmitidosMock).toHaveBeenCalled())
    expect(importarLoteDocumentosEmitidosMock).toHaveBeenCalledWith([xml1, xml2])
    expect(navigateMock).toHaveBeenCalledWith('/fiscal/nfes-emitidas')
  })
})
