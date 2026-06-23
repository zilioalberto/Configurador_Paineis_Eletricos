import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { authUser } from '@/test/factories/authUser'
import type { DocumentoFiscalRecebidoDetail } from '../types/documentoFiscalRecebido'

const useAuthMock = vi.hoisted(() => vi.fn())
const solicitarManifestacaoDestinatarioMock = vi.hoisted(() => vi.fn())
const showToastMock = vi.hoisted(() => vi.fn())

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

vi.mock('../services/fiscalNfeService', () => ({
  solicitarManifestacaoDestinatario: (...args: unknown[]) =>
    solicitarManifestacaoDestinatarioMock(...args),
}))

import NfeManifestacaoDestinatarioPanel from './NfeManifestacaoDestinatarioPanel'

function documentoStub(
  overrides: Partial<DocumentoFiscalRecebidoDetail> = {}
): DocumentoFiscalRecebidoDetail {
  return {
    id: 1,
    chave_acesso: '123',
    nsu: '1',
    cnpj_emitente: '11222333000199',
    nome_emitente: 'Fornecedor',
    cnpj_destinatario: '99888777000166',
    nome_destinatario: 'Empresa',
    numero: '100',
    serie: '1',
    data_emissao: '2026-01-01',
    valor_total: '1000.00',
    natureza_operacao: 'Venda',
    finalidade_nfe: '1',
    finalidade_nfe_display: 'Normal',
    cfop_predominante: '5102',
    status_importacao: 'PROCESSADA',
    origem_importacao: 'MANUAL',
    objetivo_entrada: 'OUTRAS_ENTRADAS',
    objetivo_entrada_display: 'Outras entradas',
    classificacao_origem: 'AUTOMATICA',
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
    xml_original: '<nfe/>',
    ...overrides,
  }
}

function renderPanel(documento = documentoStub()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <NfeManifestacaoDestinatarioPanel documento={documento} />
    </QueryClientProvider>
  )
}

describe('NfeManifestacaoDestinatarioPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthMock.mockReturnValue({ user: authUser([PERMISSION_KEYS.FISCAL_EDITAR]) })
    solicitarManifestacaoDestinatarioMock.mockResolvedValue({ message: 'Solicitada' })
  })

  it('renderiza status e botões de manifestação', () => {
    renderPanel()
    expect(screen.getByRole('heading', { name: /manifestação do destinatário/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ciência/i })).toBeInTheDocument()
  })

  it('solicita ciência da operação', async () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: /ciência/i }))

    await waitFor(() =>
      expect(solicitarManifestacaoDestinatarioMock).toHaveBeenCalledWith(1, {
        tipo: 'CIENCIA',
        justificativa: undefined,
      })
    )
    expect(showToastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }))
  })

  it('mostra aviso sem permissão', () => {
    useAuthMock.mockReturnValue({ user: authUser([]) })
    renderPanel()
    expect(screen.getByText(/sem permissão para solicitar manifestação/i)).toBeInTheDocument()
  })

  it('bloqueia novas solicitações quando pendente', () => {
    renderPanel(documentoStub({ manifestacao_status: 'PENDENTE' }))
    expect(screen.getByText(/manifestação pendente na fila/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ciência/i })).not.toBeInTheDocument()
  })
})
