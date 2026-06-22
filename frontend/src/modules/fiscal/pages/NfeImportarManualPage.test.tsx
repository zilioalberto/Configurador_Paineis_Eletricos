import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const importarNfeXmlManualMock = vi.hoisted(() => vi.fn())
const navigateMock = vi.hoisted(() => vi.fn())
const showToastMock = vi.hoisted(() => vi.fn())
const useFiscalConfigQueryMock = vi.hoisted(() => vi.fn())

vi.mock('../hooks/useFiscalConfigQuery', () => ({
  useFiscalConfigQuery: () => useFiscalConfigQueryMock(),
}))

vi.mock('../services/fiscalNfeService', () => ({
  importarNfeXmlManual: (...args: unknown[]) => importarNfeXmlManualMock(...args),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

import NfeImportarManualPage from './NfeImportarManualPage'

const CNPJ_EMPRESA = '07284171000139'

function nfeXml(numero: number, destCnpj = CNPJ_EMPRESA): string {
  return `<nfeProc><NFe><infNFe><ide><nNF>${numero}</nNF></ide><emit><CNPJ>11111111000111</CNPJ></emit><dest><CNPJ>${destCnpj}</CNPJ></dest></infNFe></NFe></nfeProc>`
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <NfeImportarManualPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function selecionarObjetivo() {
  fireEvent.change(screen.getByLabelText(/objetivo da entrada/i), {
    target: { value: 'REVENDA' },
  })
}

describe('NfeImportarManualPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useFiscalConfigQueryMock.mockReturnValue({ data: { cnpj_empresa: CNPJ_EMPRESA } })
    importarNfeXmlManualMock.mockResolvedValue({
      created: true,
      message: 'NF-e importada',
      documento_id: 7,
      chave_acesso: '0'.repeat(44),
    })
  })

  it('importa um único XML válido e navega para o detalhe', async () => {
    renderPage()
    const file = new File([nfeXml(1)], 'nfe-1.xml', { type: 'application/xml' })
    fireEvent.change(screen.getByLabelText(/arquivos xml/i), { target: { files: [file] } })

    expect(await screen.findByText('nfe-1.xml')).toBeInTheDocument()
    selecionarObjetivo()
    fireEvent.click(screen.getByRole('button', { name: /^importar$/i }))

    await waitFor(() => expect(importarNfeXmlManualMock).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/fiscal/nfes/7'))
  })

  it('lista arquivos rejeitados quando o destinatário não é a empresa', async () => {
    renderPage()
    const file = new File([nfeXml(2, '99999999000199')], 'nfe-outro.xml', {
      type: 'application/xml',
    })
    fireEvent.change(screen.getByLabelText(/arquivos xml/i), { target: { files: [file] } })

    expect(await screen.findByText(/1 arquivo\(s\) ignorado\(s\)/i)).toBeInTheDocument()
    expect(screen.getByText('nfe-outro.xml')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /remover nfe-outro\.xml/i })).not.toBeInTheDocument()
  })

  it('importa em lote mostrando status novo e duplicado por arquivo', async () => {
    importarNfeXmlManualMock
      .mockResolvedValueOnce({ created: true, message: 'ok', documento_id: 10, chave_acesso: 'a' })
      .mockResolvedValueOnce({ created: false, message: 'dup', documento_id: 11, chave_acesso: 'b' })
    renderPage()

    const f1 = new File([nfeXml(10)], 'nfe-10.xml', { type: 'application/xml' })
    const f2 = new File([nfeXml(11)], 'nfe-11.xml', { type: 'application/xml' })
    fireEvent.change(screen.getByLabelText(/arquivos xml/i), { target: { files: [f1, f2] } })

    expect(await screen.findByText('nfe-10.xml')).toBeInTheDocument()
    expect(screen.getByText(/2 XML\(s\) válido\(s\)/i)).toBeInTheDocument()

    selecionarObjetivo()
    fireEvent.click(screen.getByRole('button', { name: /importar 2 xmls/i }))

    await waitFor(() => expect(importarNfeXmlManualMock).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Importado')).toBeInTheDocument()
    expect(screen.getByText('Duplicado')).toBeInTheDocument()
    expect(await screen.findByText(/Lote concluído/i)).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('permite remover um arquivo válido da seleção', async () => {
    renderPage()
    const f1 = new File([nfeXml(20)], 'nfe-20.xml', { type: 'application/xml' })
    const f2 = new File([nfeXml(21)], 'nfe-21.xml', { type: 'application/xml' })
    fireEvent.change(screen.getByLabelText(/arquivos xml/i), { target: { files: [f1, f2] } })

    expect(await screen.findByText('nfe-20.xml')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /remover nfe-20\.xml/i }))

    await waitFor(() => expect(screen.queryByText('nfe-20.xml')).not.toBeInTheDocument())
    expect(screen.getByText('nfe-21.xml')).toBeInTheDocument()
  })
})
