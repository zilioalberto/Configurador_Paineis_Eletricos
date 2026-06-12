import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { authUser } from '@/test/factories/authUser'

const useAuthMock = vi.hoisted(() => vi.fn())
const useNfesEmitidasListQueryMock = vi.hoisted(() => vi.fn())
const excluirMutationMock = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  isPending: false,
}))
const showToastMock = vi.hoisted(() => vi.fn())

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('../hooks/useNfesEmitidasListQuery', () => ({
  useNfesEmitidasListQuery: (...args: unknown[]) => useNfesEmitidasListQueryMock(...args),
}))

vi.mock('../hooks/useExcluirNfeEmitidaMutation', () => ({
  useExcluirNfeEmitidaMutation: () => excluirMutationMock,
}))

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

import NfesEmitidasListPage from './NfesEmitidasListPage'

const PUBLIC_ID = '11111111-1111-4111-8111-111111111111'

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <NfesEmitidasListPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('NfesEmitidasListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthMock.mockReturnValue({
      user: authUser([PERMISSION_KEYS.FISCAL_EDITAR, PERMISSION_KEYS.FISCAL_VISUALIZAR]),
    })
    excluirMutationMock.mutateAsync.mockResolvedValue(undefined)
    useNfesEmitidasListQueryMock.mockReturnValue({
      data: {
        items: [
          {
            id: 1,
            public_id: PUBLIC_ID,
            identificador: 'NFE:1',
            tipo_documento: 'NFE_PRODUTO',
            chave_acesso: '35260111222333000199550010000001231234567890',
            cnpj_emitente: '07284171000139',
            nome_emitente: 'ZFW Engenharia',
            cnpj_destinatario: '99888777000166',
            nome_destinatario: 'Cliente Alpha',
            numero: '100',
            serie: '1',
            data_emissao: '2026-06-10',
            valor_total: '5000.00',
            natureza_operacao: 'Venda',
            objetivo_saida: 'VENDA_PRODUTO',
            origem_importacao: 'MANUAL',
            cfop_predominante: '5102',
            anexo_simples: 'I',
            incluir_faturamento: true,
            classificacao_origem: 'AUTOMATICA',
            itens: [],
            criada_em: '2026-06-10',
            atualizada_em: '2026-06-10',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 50,
        hasNext: false,
        hasPrevious: false,
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
  })

  it('renderiza lista de NF-es emitidas', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /nf-es emitidas/i })).toBeInTheDocument()
    expect(screen.getByText('Cliente Alpha')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '100' })).toHaveAttribute(
      'href',
      `/fiscal/nfes-emitidas/${PUBLIC_ID}`
    )
  })

  it('mostra carregamento', () => {
    useNfesEmitidasListQueryMock.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
    renderPage()
    expect(screen.getByText(/carregando/i)).toBeInTheDocument()
  })

  it('atualiza filtro com debounce', async () => {
    renderPage()
    fireEvent.change(screen.getByLabelText(/número/i), { target: { value: '100' } })
    await waitFor(
      () =>
        expect(useNfesEmitidasListQueryMock).toHaveBeenCalledWith(
          expect.objectContaining({ numero: '100' }),
          1,
          50,
          '-data_emissao'
        ),
      { timeout: 1500 }
    )
  })

  it('exclui documento após confirmação', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /excluir/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmar exclusão/i }))

    await waitFor(() =>
      expect(excluirMutationMock.mutateAsync).toHaveBeenCalledWith(PUBLIC_ID)
    )
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success', message: expect.stringContaining('excluído') })
    )
  })

  it('oculta ações sem permissão de edição', () => {
    useAuthMock.mockReturnValue({
      user: authUser([PERMISSION_KEYS.FISCAL_VISUALIZAR]),
    })
    renderPage()
    expect(screen.queryByRole('button', { name: /excluir/i })).not.toBeInTheDocument()
  })
})
