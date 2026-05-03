import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useAuthMock = vi.hoisted(() => vi.fn())
const useProjetoListQueryMock = vi.hoisted(() => vi.fn())
const useComposicaoSnapshotQueryMock = vi.hoisted(() => vi.fn())
const exportarComposicaoListaPdfMock = vi.hoisted(() => vi.fn())
const exportarComposicaoListaXlsxMock = vi.hoisted(() => vi.fn())
const showToastMock = vi.hoisted(() => vi.fn())
type ConfirmModalPropsShape = {
  show?: boolean
  onConfirm?: () => void
}
const lastConfirmModalProps = vi.hoisted(
  () => ({ current: null as null | ConfirmModalPropsShape })
)

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('@/modules/projetos/hooks/useProjetoListQuery', () => ({
  useProjetoListQuery: () => useProjetoListQueryMock(),
}))

vi.mock('@/modules/composicao/hooks/useComposicaoSnapshotQuery', () => ({
  useComposicaoSnapshotQuery: () => useComposicaoSnapshotQueryMock(),
}))

vi.mock('@/modules/dimensionamento/hooks/useDimensionamentoQuery', () => ({
  useDimensionamentoQuery: () => ({
    data: null,
    isPending: false,
    isError: false,
    error: null,
  }),
}))

vi.mock('@/modules/projetos/hooks/useProjetoFluxoGates', () => ({
  useProjetoFluxoGates: () => ({
    loading: false,
    temCargas: true,
    condutoresRevisaoOk: true,
    podeAcessarDimensionamento: true,
    podeAcessarComposicao: true,
  }),
}))

vi.mock('@/modules/projetos/components/ProjetoFluxoStepper', () => ({
  ProjetoFluxoStepper: () => null,
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
  ConfirmModal: (props: ConfirmModalPropsShape) => {
    lastConfirmModalProps.current = props
    return null
  },
  useToast: () => ({ showToast: showToastMock }),
}))

import ComposicaoPage from '@/modules/composicao/pages/ComposicaoPage'

describe('ComposicaoPage', () => {
  beforeEach(() => {
    exportarComposicaoListaPdfMock.mockClear()
    exportarComposicaoListaXlsxMock.mockClear()
    showToastMock.mockClear()
    lastConfirmModalProps.current = null
  })

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

  function userComPermissaoSeparar() {
    return {
      email: 'u@test.com',
      first_name: '',
      last_name: '',
      tipo_usuario: 'USUARIO',
      permissoes: ['almoxarifado.separar_material'],
    }
  }

  function setupComposicaoPage({
    user,
    projetos = baseProjetos,
    snapshot = snapshotBase,
  }: {
    user?: ReturnType<typeof userComPermissaoSeparar> | {
      email: string
      first_name: string
      last_name: string
      tipo_usuario: string
      permissoes?: string[]
    }
    projetos?: unknown[]
    snapshot?: unknown
  }) {
    useAuthMock.mockReturnValue({
      user:
        user ??
        {
          email: 'u@test.com',
          first_name: '',
          last_name: '',
          tipo_usuario: 'USUARIO',
        },
    })
    useProjetoListQueryMock.mockReturnValue({ data: projetos, isPending: false })
    useComposicaoSnapshotQueryMock.mockReturnValue({
      data: snapshot,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
  }

  it('não exibe seletor de projeto quando a URL já define ?projeto=', () => {
    setupComposicaoPage({ user: userComPermissaoSeparar(), projetos: baseProjetos, snapshot: snapshotBase })

    render(
      <MemoryRouter initialEntries={['/composicao?projeto=p1']}>
        <ComposicaoPage />
      </MemoryRouter>
    )

    expect(document.querySelector('#comp-projeto')).toBeNull()
    expect(screen.queryByText(/Antes de gerar, confira as/i)).not.toBeInTheDocument()
  })

  it('oculta acao de gerar sugestoes sem permissao de separacao', () => {
    setupComposicaoPage({ user: undefined, projetos: [], snapshot: null })

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
    setupComposicaoPage({ user: userComPermissaoSeparar(), projetos: baseProjetos, snapshot: null })
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
    setupComposicaoPage({ user: userComPermissaoSeparar(), projetos: baseProjetos, snapshot: snapshotBase })

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

  it('quando há pendências abre confirmação antes de exportar', async () => {
    setupComposicaoPage({
      user: userComPermissaoSeparar(),
      projetos: baseProjetos,
      snapshot: {
        ...snapshotBase,
        pendencias: [{ id: 'pen-1', descricao: 'x' }],
        totais: { ...snapshotBase.totais, pendencias: 1 },
      },
    })
    showToastMock.mockClear()
    lastConfirmModalProps.current = null

    render(
      <MemoryRouter initialEntries={['/composicao?projeto=p1']}>
        <ComposicaoPage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: /^Excel$/i }))
    await waitFor(() =>
      expect(lastConfirmModalProps.current?.show).toBe(true)
    )
    expect(exportarComposicaoListaXlsxMock).not.toHaveBeenCalled()

    const modalProps = lastConfirmModalProps.current as ConfirmModalPropsShape | null
    const onConfirm = modalProps?.onConfirm
    expect(onConfirm).toBeDefined()
    onConfirm?.()
    await waitFor(() => expect(exportarComposicaoListaXlsxMock).toHaveBeenCalled())
  })
})
