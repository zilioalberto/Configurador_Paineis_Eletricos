import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useFiscalConfigQueryMock = vi.hoisted(() => vi.fn())
const obterControleNsuNfseAdnMock = vi.hoisted(() => vi.fn())

vi.mock('../hooks/useFiscalConfigQuery', () => ({
  useFiscalConfigQuery: () => useFiscalConfigQueryMock(),
}))

vi.mock('../services/fiscalNfseRecebidaService', () => ({
  obterControleNsuNfseAdn: (...args: unknown[]) => obterControleNsuNfseAdnMock(...args),
}))

vi.mock('./SincronizarNfseAdnButton', () => ({
  default: () => <button type="button">Sincronizar ADN</button>,
}))

import FiscalNfseAdnStatusCard from './FiscalNfseAdnStatusCard'

function renderCard() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <FiscalNfseAdnStatusCard />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('FiscalNfseAdnStatusCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    obterControleNsuNfseAdnMock.mockResolvedValue({
      ultimo_nsu: '000000000000010',
      max_nsu: '000000000000020',
      ultimo_status: '138',
      ultimo_motivo: 'Documento localizado',
      ultima_consulta: '2026-06-15T10:00:00Z',
      bloqueado_ate: null,
    })
  })

  it('não renderiza enquanto a config carrega', () => {
    useFiscalConfigQueryMock.mockReturnValue({ data: undefined, isPending: true })
    const { container } = renderCard()
    expect(container.querySelector('.card')).toBeNull()
  })

  it('mostra badge "ADN pronto" quando disponível', async () => {
    useFiscalConfigQueryMock.mockReturnValue({
      data: { cnpj_empresa: '07284171000139', nfse_adn_sync_disponivel: true },
      isPending: false,
    })
    renderCard()
    expect(screen.getByText('ADN pronto')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver NFS-es' })).toBeInTheDocument()
    expect(await screen.findByText('000000000000010')).toBeInTheDocument()
  })

  it('mostra modo simulado e alerta quando em stub', () => {
    useFiscalConfigQueryMock.mockReturnValue({
      data: {
        cnpj_empresa: '07284171000139',
        nfse_adn_sync_disponivel: false,
        nfse_adn_sync_modo: 'stub',
        nfse_adn_sync_mensagem: 'Rodando em modo simulado.',
      },
      isPending: false,
    })
    renderCard()
    expect(screen.getByText('Modo simulado')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Sincronização ADN indisponível.')
  })

  it('mostra certificado ausente quando indisponível e sem stub', () => {
    useFiscalConfigQueryMock.mockReturnValue({
      data: {
        cnpj_empresa: '07284171000139',
        nfse_adn_sync_disponivel: false,
        nfse_adn_sync_modo: 'native',
      },
      isPending: false,
    })
    renderCard()
    expect(screen.getByText('Certificado ausente')).toBeInTheDocument()
  })
})
