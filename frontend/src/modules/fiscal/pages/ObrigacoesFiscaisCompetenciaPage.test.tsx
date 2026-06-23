import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authUser } from '@/test/factories/authUser'

const showToastMock = vi.hoisted(() => vi.fn())
const obterPacoteObrigacaoMock = vi.hoisted(() => vi.fn())
const atualizarObrigacaoFiscalMock = vi.hoisted(() => vi.fn())
const excluirAnexoObrigacaoFiscalMock = vi.hoisted(() => vi.fn())
const excluirTodosAnexosPacoteMock = vi.hoisted(() => vi.fn())

vi.mock('@/components/feedback', () => ({
  ConfirmModal: ({
    show,
    onConfirm,
  }: {
    show: boolean
    onConfirm: () => void
  }) =>
    show ? (
      <button type="button" onClick={onConfirm}>
        Confirmar exclusão
      </button>
    ) : null,
  useToast: () => ({ showToast: showToastMock }),
}))

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => ({
    user: authUser(['fiscal.editar']),
  }),
}))

vi.mock('../services/fiscalObrigacoesService', () => ({
  atualizarObrigacaoFiscal: (...args: unknown[]) => atualizarObrigacaoFiscalMock(...args),
  excluirAnexoObrigacaoFiscal: (...args: unknown[]) => excluirAnexoObrigacaoFiscalMock(...args),
  excluirTodosAnexosPacote: (...args: unknown[]) => excluirTodosAnexosPacoteMock(...args),
  marcarObrigacaoPaga: vi.fn(),
  obterPacoteObrigacao: (...args: unknown[]) => obterPacoteObrigacaoMock(...args),
  reconciliarPacote: vi.fn(),
  uploadLotePacote: vi.fn(),
}))

import ObrigacoesFiscaisCompetenciaPage from './ObrigacoesFiscaisCompetenciaPage'

const pacoteBase = {
  public_id: 'pac-1',
  cnpj: '07284171000139',
  competencia: '2026-03',
  recebido_em: null,
  pacote_completo: false,
  observacoes: '',
  obrigacoes: [
    {
      public_id: 'obr-das',
      tipo: 'DAS',
      tipo_label: 'DAS — Simples Nacional',
      descricao: 'DAS março',
      valor: '0.00',
      valor_estimado: '1200.00',
      data_vencimento: '2026-04-20',
      data_pagamento: null,
      status: 'PENDENTE',
      status_label: 'Pendente',
      numero_documento: '',
      observacoes: '',
      dados_extra: {},
      linhas_composicao: [],
      lancamento_financeiro: null,
    },
  ],
  anexos: [],
  holerites: [],
  reconciliacoes: [],
  snapshot_icms: null,
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/fiscal/obrigacoes/pac-1']}>
        <Routes>
          <Route path="/fiscal/obrigacoes/:id" element={<ObrigacoesFiscaisCompetenciaPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ObrigacoesFiscaisCompetenciaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    obterPacoteObrigacaoMock.mockResolvedValue(pacoteBase)
    atualizarObrigacaoFiscalMock.mockResolvedValue({
      ...pacoteBase.obrigacoes[0],
      valor: '1523.45',
    })
    excluirAnexoObrigacaoFiscalMock.mockResolvedValue(undefined)
  })

  it('abre modal de edição e salva valor via API', async () => {
    renderPage()

    await screen.findByRole('heading', { name: /competência 03\/2026/i })
    fireEvent.click(screen.getByRole('button', { name: 'Informar DAS' }))

    expect(screen.getByRole('heading', { name: /editar das — simples nacional/i })).toBeInTheDocument()

    const valorInput = screen.getByLabelText(/valor \(r\$\)/i)
    fireEvent.change(valorInput, { target: { value: '1.523,45' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => {
      expect(atualizarObrigacaoFiscalMock).toHaveBeenCalledWith('obr-das', {
        descricao: 'DAS março',
        valor: '1523.45',
        data_vencimento: '2026-04-20',
        numero_documento: '',
        observacoes: '',
      })
    })

    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success', title: 'Obrigação atualizada' }),
    )
  })

  it('exclui anexo após confirmação', async () => {
    obterPacoteObrigacaoMock.mockResolvedValue({
      ...pacoteBase,
      anexos: [
        {
          public_id: 'anexo-1',
          tipo_arquivo: 'DARF',
          nome_original: 'darf-marco.pdf',
          arquivo_url: '/media/darf-marco.pdf',
          parse_sucesso: true,
          parse_erros: '',
          parsed_data: {},
        },
      ],
    })

    renderPage()

    await screen.findByText('darf-marco.pdf')
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }))

    await waitFor(() => {
      expect(excluirAnexoObrigacaoFiscalMock).toHaveBeenCalledWith('anexo-1')
    })
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success', title: 'Anexo excluído' }),
    )
  })

  it('exclui todos os anexos após confirmação', async () => {
    excluirTodosAnexosPacoteMock.mockResolvedValue({
      excluidos: 2,
      pacote: { ...pacoteBase, anexos: [] },
    })
    obterPacoteObrigacaoMock.mockResolvedValue({
      ...pacoteBase,
      anexos: [
        {
          public_id: 'anexo-1',
          tipo_arquivo: 'DARF',
          nome_original: 'darf.pdf',
          arquivo_url: '/media/darf.pdf',
          parse_sucesso: true,
          parse_erros: '',
          parsed_data: {},
        },
        {
          public_id: 'anexo-2',
          tipo_arquivo: 'SIMPLES',
          nome_original: 'simples.pdf',
          arquivo_url: '/media/simples.pdf',
          parse_sucesso: true,
          parse_erros: '',
          parsed_data: {},
        },
      ],
    })

    renderPage()

    await screen.findByText('Excluir todos')
    fireEvent.click(screen.getByRole('button', { name: 'Excluir todos' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }))

    await waitFor(() => {
      expect(excluirTodosAnexosPacoteMock).toHaveBeenCalledWith('pac-1')
    })
  })
})
