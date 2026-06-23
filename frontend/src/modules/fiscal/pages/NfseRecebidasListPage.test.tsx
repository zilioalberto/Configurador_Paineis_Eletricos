import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const listarNfseRecebidasMock = vi.hoisted(() => vi.fn())
const useFiscalConfigQueryMock = vi.hoisted(() => vi.fn())

vi.mock('../services/fiscalNfseRecebidaService', () => ({
  listarNfseRecebidas: (...args: unknown[]) => listarNfseRecebidasMock(...args),
}))

vi.mock('../hooks/useFiscalConfigQuery', () => ({
  useFiscalConfigQuery: () => useFiscalConfigQueryMock(),
}))

vi.mock('../components/SincronizarNfseAdnButton', () => ({
  default: () => <button type="button">Sincronizar ADN</button>,
}))

import NfseRecebidasListPage from './NfseRecebidasListPage'

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <NfseRecebidasListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('NfseRecebidasListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useFiscalConfigQueryMock.mockReturnValue({
      data: { cnpj_empresa: '07284171000139', nfse_adn_sync_disponivel: true },
    })
  })

  it('mostra estado vazio quando não há NFS-es', async () => {
    listarNfseRecebidasMock.mockResolvedValue({ items: [] })

    renderPage()

    expect(
      await screen.findByText('Nenhuma NFS-e recebida importada ainda.'),
    ).toBeInTheDocument()
    expect(listarNfseRecebidasMock).toHaveBeenCalledWith(1)
  })

  it('renderiza linhas da tabela com os dados das NFS-es', async () => {
    listarNfseRecebidasMock.mockResolvedValue({
      items: [
        {
          public_id: 'aaaa-bbbb',
          numero: '4567',
          nome_prestador: 'Engenharia XPTO',
          cnpj_prestador: '12345678000199',
          data_emissao: '2026-06-10',
          valor_total: '1500.00',
          origem_importacao: 'ADN_SYNC',
        },
      ],
    })

    renderPage()

    expect(await screen.findByText('Engenharia XPTO')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '4567' })).toBeInTheDocument()
    expect(screen.getByText('ADN_SYNC')).toBeInTheDocument()
  })

  it('exibe alerta de erro quando a listagem falha', async () => {
    listarNfseRecebidasMock.mockRejectedValue(new Error('Falha ADN'))

    renderPage()

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Falha ADN'))
  })
})
