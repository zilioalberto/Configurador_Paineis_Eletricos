import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useFiscalConfigQueryMock = vi.hoisted(() => vi.fn())
const useControleNsuQueryMock = vi.hoisted(() => vi.fn())

vi.mock('../hooks/useFiscalConfigQuery', () => ({
  useFiscalConfigQuery: () => useFiscalConfigQueryMock(),
}))

vi.mock('../hooks/useControleNsuQuery', () => ({
  useControleNsuQuery: (...args: unknown[]) => useControleNsuQueryMock(...args),
}))

vi.mock('./SefazControleNsuAlert', () => ({ default: () => null }))
vi.mock('./SefazSyncIndisponivelAlert', () => ({ default: () => null }))
vi.mock('./SincronizarNfesSefazButton', () => ({
  default: () => <button type="button">Sincronizar SEFAZ</button>,
}))

import FiscalNsuStatusCard from './FiscalNsuStatusCard'

function nsu(overrides: Record<string, unknown> = {}) {
  return {
    ultimo_nsu: '000000000000010',
    max_nsu: '000000000000020',
    ultimo_cstat: '138',
    ultimo_motivo: 'Documento localizado',
    ultima_consulta: '2026-06-15T10:00:00Z',
    bloqueado_ate: null,
    ...overrides,
  }
}

function mockNsuQuery(overrides: Record<string, unknown> = {}) {
  useControleNsuQueryMock.mockReturnValue({
    data: nsu(),
    isFetching: false,
    isError: false,
    error: null,
    ...overrides,
  })
}

function renderCard() {
  return render(
    <MemoryRouter>
      <FiscalNsuStatusCard />
    </MemoryRouter>,
  )
}

describe('FiscalNsuStatusCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useFiscalConfigQueryMock.mockReturnValue({
      data: { cnpj_empresa: '07284171000139', sefaz_sync_disponivel: true },
      isPending: false,
    })
    mockNsuQuery()
  })

  it('não renderiza enquanto a config carrega', () => {
    useFiscalConfigQueryMock.mockReturnValue({ data: undefined, isPending: true })
    const { container } = renderCard()
    expect(container.firstChild).toBeNull()
  })

  it('orienta a configurar o CNPJ quando ausente', () => {
    useFiscalConfigQueryMock.mockReturnValue({ data: { cnpj_empresa: '' }, isPending: false })
    renderCard()
    expect(screen.getByText(/Configure/)).toBeInTheDocument()
    expect(screen.getByText('FISCAL_EMPRESA_CNPJ')).toBeInTheDocument()
  })

  it('mostra badge "SEFAZ pronta" e os dados de NSU', () => {
    renderCard()
    expect(screen.getByText('SEFAZ pronta')).toBeInTheDocument()
    expect(screen.getByText('000000000000010')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Detalhes' })).toBeInTheDocument()
  })

  it('mostra modo simulado (stub)', () => {
    useFiscalConfigQueryMock.mockReturnValue({
      data: { cnpj_empresa: '07284171000139', sefaz_sync_disponivel: false, sefaz_sync_modo: 'stub' },
      isPending: false,
    })
    renderCard()
    expect(screen.getByText('Modo simulado (stub)')).toBeInTheDocument()
  })

  it('mostra certificado A1 ausente', () => {
    useFiscalConfigQueryMock.mockReturnValue({
      data: { cnpj_empresa: '07284171000139', sefaz_sync_disponivel: false, sefaz_sync_modo: 'native' },
      isPending: false,
    })
    renderCard()
    expect(screen.getByText('Certificado A1 ausente')).toBeInTheDocument()
  })

  it('mostra estado de carregamento e erro', () => {
    mockNsuQuery({ data: undefined, isFetching: true })
    const { rerender } = renderCard()
    expect(screen.getByText('A carregar estado…')).toBeInTheDocument()

    mockNsuQuery({ data: undefined, isFetching: false, isError: true, error: new Error('NSU off') })
    rerender(
      <MemoryRouter>
        <FiscalNsuStatusCard />
      </MemoryRouter>,
    )
    expect(screen.getByText('NSU off')).toBeInTheDocument()
  })

  it('sinaliza bloqueio aguardando janela (cStat 137)', async () => {
    const futuro = new Date(Date.now() + 3_600_000).toISOString()
    mockNsuQuery({ data: nsu({ ultimo_cstat: '137', bloqueado_ate: futuro }) })
    renderCard()

    await waitFor(() => expect(screen.getByText('Consultar após')).toBeInTheDocument())
    expect(screen.getByText(/Aguarde o horário indicado para consultar novamente/i)).toBeInTheDocument()
  })
})
