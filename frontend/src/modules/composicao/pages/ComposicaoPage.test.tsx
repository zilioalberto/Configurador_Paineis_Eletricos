import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

const useAuthMock = vi.hoisted(() => vi.fn())
const useProjetoListQueryMock = vi.hoisted(() => vi.fn())
const useComposicaoSnapshotQueryMock = vi.hoisted(() => vi.fn())
const exportarComposicaoListaPdfMock = vi.hoisted(() => vi.fn())
const exportarComposicaoListaXlsxMock = vi.hoisted(() => vi.fn())

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('@/modules/projetos/hooks/useProjetoListQuery', () => ({
  useProjetoListQuery: () => useProjetoListQueryMock(),
}))

vi.mock('@/modules/composicao/hooks/useComposicaoSnapshotQuery', () => ({
  useComposicaoSnapshotQuery: () => useComposicaoSnapshotQueryMock(),
}))

vi.mock('@/modules/composicao/hooks/useGerarSugestoesMutation', () => ({
  useGerarSugestoesMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/modules/composicao/hooks/useReavaliarPendenciasMutation', () => ({
  useReavaliarPendenciasMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/modules/composicao/hooks/useAprovarSugestaoMutation', () => ({
  useAprovarSugestaoMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/modules/composicao/hooks/useReabrirComposicaoItemMutation', () => ({
  useReabrirComposicaoItemMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/modules/composicao/hooks/useAlternativasSugestaoQuery', () => ({
  useAlternativasSugestaoQuery: () => ({
    data: [],
    isPending: false,
    isError: false,
    error: null,
  }),
}))

vi.mock('@/modules/composicao/components/InclusaoManualCatalogoSection', () => ({
  InclusaoManualCatalogoSection: () => null,
}))

vi.mock('@/modules/composicao/services/composicaoService', () => ({
  exportarComposicaoListaPdf: exportarComposicaoListaPdfMock,
  exportarComposicaoListaXlsx: exportarComposicaoListaXlsxMock,
}))

vi.mock('@/components/feedback', () => ({
  ConfirmModal: () => null,
  useToast: () => ({ showToast: vi.fn() }),
}))

import ComposicaoPage from '@/modules/composicao/pages/ComposicaoPage'

describe('ComposicaoPage', () => {
  const baseProjetos = [
    {
      id: 'p1',
      codigo: 'PRJ-01',
      cliente: 'Cliente X',
      nome: 'Projeto 1',
      status: 'EM_ANDAMENTO',
    },
  ]

  const snapshotBase = {
    projeto: 'p1',
    sugestoes: [],
    composicao_itens: [],
    pendencias: [],
    inclusoes_manuais: [],
    totais: { sugestoes: 0, pendencias: 0, composicao_itens: 0, inclusoes_manuais: 0 },
  }

  it('oculta acao de gerar sugestoes sem permissao de separacao', () => {
    useAuthMock.mockReturnValue({
      user: { email: 'u@test.com', first_name: '', last_name: '', tipo_usuario: 'USUARIO' },
    })
    useProjetoListQueryMock.mockReturnValue({ data: [], isPending: false })
    useComposicaoSnapshotQueryMock.mockReturnValue({
      data: null,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    render(
      <MemoryRouter>
        <ComposicaoPage />
      </MemoryRouter>
    )

    expect(screen.queryByRole('button', { name: /Gerar sugestões/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Excel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /PDF/i })).toBeInTheDocument()
  })

  it('exibe erro quando falha ao carregar snapshot', () => {
    useAuthMock.mockReturnValue({
      user: {
        email: 'u@test.com',
        first_name: '',
        last_name: '',
        tipo_usuario: 'USUARIO',
        permissoes: ['almoxarifado.separar_material'],
      },
    })
    useProjetoListQueryMock.mockReturnValue({ data: baseProjetos, isPending: false })
    useComposicaoSnapshotQueryMock.mockReturnValue({
      data: null,
      isPending: false,
      isError: true,
      error: new Error('Falha no snapshot'),
      refetch: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/composicao?projeto=p1']}>
        <ComposicaoPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Falha no snapshot')).toBeInTheDocument()
  })

  it('permite exportar excel e pdf com projeto selecionado', async () => {
    useAuthMock.mockReturnValue({
      user: {
        email: 'u@test.com',
        first_name: '',
        last_name: '',
        tipo_usuario: 'USUARIO',
        permissoes: ['almoxarifado.separar_material'],
      },
    })
    useProjetoListQueryMock.mockReturnValue({ data: baseProjetos, isPending: false })
    useComposicaoSnapshotQueryMock.mockReturnValue({
      data: snapshotBase,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/composicao?projeto=p1']}>
        <ComposicaoPage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: /^Excel$/i }))

    await waitFor(() => {
      expect(exportarComposicaoListaXlsxMock).toHaveBeenCalledWith(
        'p1',
        'PRJ-01 - Cliente X - Projeto 1'
      )
    })

    fireEvent.click(screen.getByRole('button', { name: /^PDF$/i }))
    await waitFor(() => {
      expect(exportarComposicaoListaPdfMock).toHaveBeenCalledWith(
        'p1',
        'PRJ-01 - Cliente X - Projeto 1'
      )
    })
  })
})
