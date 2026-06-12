import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useNfeEmitidaDetailQueryMock = vi.hoisted(() => vi.fn())
const atualizarClassificacaoDocumentoEmitidoMock = vi.hoisted(() => vi.fn())
const excluirMutationMock = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  isPending: false,
}))
const navigateMock = vi.hoisted(() => vi.fn())
const showToastMock = vi.hoisted(() => vi.fn())
const PUBLIC_ID = '11111111-1111-4111-8111-111111111111'

vi.mock('../hooks/useNfeEmitidaDetailQuery', () => ({
  useNfeEmitidaDetailQuery: (...args: unknown[]) => useNfeEmitidaDetailQueryMock(...args),
}))

vi.mock('../services/fiscalNfeService', () => ({
  atualizarClassificacaoDocumentoEmitido: (...args: unknown[]) =>
    atualizarClassificacaoDocumentoEmitidoMock(...args),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('@/components/feedback', () => ({
  ConfirmModal: ({
    show,
    onConfirm,
    title,
  }: {
    show: boolean
    onConfirm: () => void
    title: string
  }) =>
    show ? (
      <div role="dialog" aria-label={title}>
        <button type="button" onClick={onConfirm}>
          Confirmar exclusão
        </button>
      </div>
    ) : null,
  useToast: () => ({ showToast: showToastMock }),
}))

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { permissoes: ['fiscal.editar', 'fiscal.visualizar'] },
  }),
}))

vi.mock('../hooks/useExcluirNfeEmitidaMutation', () => ({
  useExcluirNfeEmitidaMutation: () => excluirMutationMock,
}))

import NfeEmitidaDetailPage from './NfeEmitidaDetailPage'

describe('NfeEmitidaDetailPage', () => {
  const refetchMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    excluirMutationMock.mutateAsync.mockResolvedValue(undefined)
    atualizarClassificacaoDocumentoEmitidoMock.mockResolvedValue({})
    refetchMock.mockResolvedValue({})
    useNfeEmitidaDetailQueryMock.mockReturnValue({
      data: {
        id: 5,
        public_id: PUBLIC_ID,
        identificador: 'NFE:5',
        tipo_documento: 'NFE_PRODUTO',
        chave_acesso: '35260111222333000199550010000001231234567890',
        cnpj_emitente: '07284171000139',
        nome_emitente: 'ZFW Engenharia',
        cnpj_destinatario: '99888777000166',
        nome_destinatario: 'Cliente Alpha',
        numero: '100',
        serie: '1',
        data_emissao: '2026-06-10T10:00:00-03:00',
        valor_total: '1500.00',
        natureza_operacao: 'Venda',
        objetivo_saida: 'VENDA_PRODUTO',
        origem_importacao: 'MANUAL',
        cfop_predominante: '5102',
        anexo_simples: 'I',
        incluir_faturamento: true,
        classificacao_origem: 'AUTOMATICA',
        criada_em: '2026-06-10',
        atualizada_em: '2026-06-10',
        xml_original: '<nfeProc />',
        itens: [
          {
            id: 11,
            numero_item: 1,
            codigo: 'PRD-001',
            descricao: 'Painel elétrico',
            ncm: '85371090',
            cfop: '5102',
            unidade: 'UN',
            quantidade: '1.0000',
            valor_unitario: '1500.00',
            valor_total: '1500.00',
          },
        ],
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: refetchMock,
    })
  })

  it('renderiza dados completos e XML da NF-e emitida', () => {
    render(
      <MemoryRouter initialEntries={[`/fiscal/nfes-emitidas/${PUBLIC_ID}`]}>
        <Routes>
          <Route path="/fiscal/nfes-emitidas/:id" element={<NfeEmitidaDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(useNfeEmitidaDetailQueryMock).toHaveBeenCalledWith(PUBLIC_ID, true)
    expect(screen.getByRole('heading', { name: /NF-e de produto 100/i })).toBeInTheDocument()
    expect(screen.getByText('Cliente Alpha')).toBeInTheDocument()
    expect(screen.getByText('Painel elétrico')).toBeInTheDocument()
    expect(screen.getAllByText('Compõe faturamento')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: /ver xml/i }))
    expect(screen.getByText('<nfeProc />')).toBeInTheDocument()
  })

  it('permite editar se a nota emitida compõe faturamento', async () => {
    render(
      <MemoryRouter initialEntries={[`/fiscal/nfes-emitidas/${PUBLIC_ID}`]}>
        <Routes>
          <Route path="/fiscal/nfes-emitidas/:id" element={<NfeEmitidaDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('checkbox', { name: /compõe faturamento/i }))

    await waitFor(() => {
      expect(atualizarClassificacaoDocumentoEmitidoMock).toHaveBeenCalledWith(PUBLIC_ID, {
        incluir_faturamento: false,
      })
    })
    expect(refetchMock).toHaveBeenCalled()
  })

  it('exclui NF-e emitida e volta para a lista', async () => {
    render(
      <MemoryRouter initialEntries={[`/fiscal/nfes-emitidas/${PUBLIC_ID}`]}>
        <Routes>
          <Route path="/fiscal/nfes-emitidas/:id" element={<NfeEmitidaDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }))

    await waitFor(() => {
      expect(excluirMutationMock.mutateAsync).toHaveBeenCalledWith(PUBLIC_ID)
    })
    expect(navigateMock).toHaveBeenCalledWith('/fiscal/nfes-emitidas')
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success' }),
    )
  })
})
