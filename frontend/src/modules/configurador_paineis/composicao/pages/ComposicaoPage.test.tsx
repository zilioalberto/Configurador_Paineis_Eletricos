import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AppPageToolbar from '@/components/layout/AppPageToolbar'
import {
  AppPageToolbarProvider,
  useAppPageToolbarState,
} from '@/components/layout/AppPageToolbarContext'

import type { ProdutoAlternativa } from '@/modules/configurador_paineis/composicao/types/composicao'

const gerarMutateAsyncMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    geracao: { erros_etapas: [], sugestoes_descartadas_aprovadas: 0 },
  })
)
const reavaliarMutateAsyncMock = vi.hoisted(() => vi.fn())
const aprovarMutateAsyncMock = vi.hoisted(() => vi.fn())
const reabrirMutateAsyncMock = vi.hoisted(() => vi.fn())
type AlternativasQueryReturn = {
  data: ProdutoAlternativa[]
  isPending: boolean
  isError: boolean
  error: unknown
}

const useAlternativasSugestaoQueryMock = vi.hoisted(() =>
  vi.fn((_sugestaoId: string | null, _enabled: boolean): AlternativasQueryReturn => ({
    data: [],
    isPending: false,
    isError: false,
    error: null,
  }))
)
const useAuthMock = vi.hoisted(() => vi.fn())
const useProjetoListQueryMock = vi.hoisted(() => vi.fn())
const useComposicaoSnapshotQueryMock = vi.hoisted(() => vi.fn())
const exportarComposicaoListaPdfMock = vi.hoisted(() => vi.fn())
const exportarComposicaoListaXlsxMock = vi.hoisted(() => vi.fn())
const sincronizarComposicaoPainelMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ itens_sincronizados: 2, orcamento: { id: 'orc-1' } })
)
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

vi.mock('@/modules/configurador_paineis/projetos/hooks/useProjetoListQuery', () => ({
  useProjetoListQuery: () => useProjetoListQueryMock(),
}))

vi.mock('@/modules/configurador_paineis/composicao/hooks/useComposicaoSnapshotQuery', () => ({
  useComposicaoSnapshotQuery: () => useComposicaoSnapshotQueryMock(),
}))

vi.mock('@/modules/configurador_paineis/dimensionamento/hooks/useDimensionamentoQuery', () => ({
  useDimensionamentoQuery: () => ({
    data: null,
    isPending: false,
    isError: false,
    error: null,
  }),
}))

const useProjetoFluxoGatesMock = vi.hoisted(() =>
  vi.fn(() => ({
    loading: false,
    temCargas: true,
    condutoresRevisaoOk: true,
    composicaoComItens: false,
    podeAcessarDimensionamento: true,
    podeAcessarComposicao: true,
    podeAcessarDimensionamentoMecanico: false,
  }))
)

vi.mock('@/modules/configurador_paineis/projetos/hooks/useProjetoFluxoGates', () => ({
  useProjetoFluxoGates: () => useProjetoFluxoGatesMock(),
}))

vi.mock('@/modules/configurador_paineis/projetos/components/ProjetoFluxoStepper', () => ({
  ProjetoFluxoStepper: () => <nav aria-label="Etapas do fluxo do painel">Fluxo do painel</nav>,
}))

vi.mock('@/modules/configurador_paineis/composicao/hooks/useGerarSugestoesMutation', () => ({
  useGerarSugestoesMutation: () => ({
    mutateAsync: gerarMutateAsyncMock,
    isPending: false,
  }),
}))

vi.mock('@/modules/configurador_paineis/composicao/hooks/useReavaliarPendenciasMutation', () => ({
  useReavaliarPendenciasMutation: () => ({
    mutateAsync: reavaliarMutateAsyncMock,
    isPending: false,
  }),
}))

vi.mock('@/modules/configurador_paineis/composicao/hooks/useAprovarSugestaoMutation', () => ({
  useAprovarSugestaoMutation: () => ({
    mutateAsync: aprovarMutateAsyncMock,
    isPending: false,
  }),
}))

vi.mock('@/modules/configurador_paineis/composicao/hooks/useReabrirComposicaoItemMutation', () => ({
  useReabrirComposicaoItemMutation: () => ({
    mutateAsync: reabrirMutateAsyncMock,
    isPending: false,
  }),
}))

vi.mock('@/modules/configurador_paineis/composicao/hooks/useAlternativasSugestaoQuery', () => ({
  useAlternativasSugestaoQuery: (sugestaoId: string | null, enabled: boolean) =>
    useAlternativasSugestaoQueryMock(sugestaoId, enabled),
}))

vi.mock('@/modules/configurador_paineis/composicao/components/InclusaoManualCatalogoSection', () => ({
  InclusaoManualCatalogoSection: () => null,
}))

vi.mock('@/modules/configurador_paineis/composicao/services/composicaoService', () => ({
  exportarComposicaoListaPdf: exportarComposicaoListaPdfMock,
  exportarComposicaoListaXlsx: exportarComposicaoListaXlsxMock,
}))

vi.mock('@/modules/orcamentos/services/orcamentosApi', () => ({
  sincronizarComposicaoPainel: sincronizarComposicaoPainelMock,
}))

vi.mock('@/components/feedback', () => ({
  ConfirmModal: (props: ConfirmModalPropsShape) => {
    lastConfirmModalProps.current = props
    return null
  },
  useToast: () => ({ showToast: showToastMock }),
}))

import ComposicaoPage from '@/modules/configurador_paineis/composicao/pages/ComposicaoPage'

function ToolbarProbe() {
  const toolbar = useAppPageToolbarState()
  return toolbar ? <AppPageToolbar toolbar={toolbar} /> : null
}

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location-path">{location.pathname}</div>
}

describe('ComposicaoPage', () => {
  beforeEach(() => {
    exportarComposicaoListaPdfMock.mockClear()
    exportarComposicaoListaXlsxMock.mockClear()
    sincronizarComposicaoPainelMock.mockClear()
    showToastMock.mockClear()
    gerarMutateAsyncMock.mockClear()
    reavaliarMutateAsyncMock.mockReset()
    aprovarMutateAsyncMock.mockReset()
    reabrirMutateAsyncMock.mockReset()
    useAlternativasSugestaoQueryMock.mockReset()
    useAlternativasSugestaoQueryMock.mockImplementation(() => ({
      data: [],
      isPending: false,
      isError: false,
      error: null,
    }))
    reavaliarMutateAsyncMock.mockResolvedValue({})
    aprovarMutateAsyncMock.mockResolvedValue({})
    reabrirMutateAsyncMock.mockResolvedValue({})
    gerarMutateAsyncMock.mockResolvedValue({
      geracao: { erros_etapas: [], sugestoes_descartadas_aprovadas: 0 },
    })
    lastConfirmModalProps.current = null
  })

  function renderPage(initialEntries = ['/composicao']) {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <AppPageToolbarProvider>
          <ToolbarProbe />
          <ComposicaoPage />
          <LocationProbe />
        </AppPageToolbarProvider>
      </MemoryRouter>
    )
  }

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

  function userComPermissoesCompletas() {
    return {
      email: 'u@test.com',
      first_name: '',
      last_name: '',
      tipo_usuario: 'USUARIO',
      permissoes: [
        'almoxarifado.separar_material',
        'material.editar_lista',
        'material.visualizar_lista',
        'projeto.visualizar',
      ],
    }
  }

  const cargaMotor = {
    id: 'c1',
    tag: 'MTR-01',
    descricao: 'Motor principal',
    tipo_display: 'Motor',
    potencia_corrente_valor: '1500',
    potencia_corrente_unidade_display: 'W',
    corrente_a: '8.5',
    tensao_carga_display: '220 V',
    numero_fases_carga_display: 'Trifásico',
  }

  const snapshotComItens = {
    ...snapshotBase,
    sugestoes: [
      {
        id: 'sug-1',
        carga: cargaMotor,
        quantidade: 1,
        categoria_produto: 'CONTATOR',
        categoria_produto_display: 'Contator',
        produto: { id: 'prod-1', codigo: 'K1', descricao: 'Contator 9A' },
        produto_codigo: 'K1',
        status: 'SUGERIDO',
        status_display: 'Sugerido',
        observacoes: 'Principal\n[STATUS_APROVACAO] antigo',
        memoria_calculo: 'Ib=8.5A; In=9A',
      },
      {
        id: 'sug-2',
        carga: null,
        quantidade: 1,
        categoria_produto: 'SECCIONADORA',
        categoria_produto_display: 'Seccionadora',
        produto: { id: 'prod-2', codigo: 'QG', descricao: 'Chave geral' },
        produto_codigo: 'QG',
        status: 'SUGERIDO',
        status_display: 'Sugerido',
        corrente_referencia_a: '30',
        projeto_alimentacao: {
          tensao_nominal: 380,
          tipo_corrente: 'CA',
          numero_fases: 3,
        },
        memoria_calculo: '',
      },
    ],
    composicao_itens: [
      {
        id: 'cmp-1',
        carga: cargaMotor,
        quantidade: 1,
        categoria_produto: 'DISJUNTOR',
        categoria_produto_display: 'Disjuntor',
        produto: { id: 'prod-3', codigo: 'DJ1', descricao: 'Disjuntor motor' },
        produto_codigo: 'DJ1',
        status_display: 'Aprovado',
        observacoes: 'Proteção',
      },
    ],
    pendencias: [
      {
        id: 'pen-1',
        carga: cargaMotor,
        categoria_produto: 'CABO',
        categoria_produto_display: 'Cabo',
        descricao: 'Sem cabo compatível',
        status: 'ABERTA',
        status_display: 'Aberta',
        parte_painel: 'FORCA',
        parte_painel_display: 'Força',
      },
    ],
    totais: { sugestoes: 2, pendencias: 1, composicao_itens: 1, inclusoes_manuais: 0 },
    geracao: {
      erros_etapas: [{ etapa: 'contatoras', erro: 'Catálogo incompleto' }],
      sugestoes_descartadas_aprovadas: 0,
    },
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

  it('não exibe seletor de projeto quando a URL já define ?projeto=', async () => {
    setupComposicaoPage({ user: userComPermissaoSeparar(), projetos: baseProjetos, snapshot: snapshotBase })

    renderPage(['/composicao?projeto=p1'])

    expect(document.querySelector('#comp-projeto')).toBeNull()
    expect(screen.queryByRole('button', { name: /Gerar sugestões/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/Antes de gerar, confira as/i)).not.toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /etapas do fluxo/i })).toBeInTheDocument()
    expect(screen.queryByText(/^Projeto$/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Dimensionamento$/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Editar condutores/i })).toHaveAttribute(
      'href',
      '/configurador/configuracoes/p1/fluxo/dimensionamento'
    )
    expect(document.body.textContent).not.toMatch(/sugestão\(ões\).*pendência\(s\).*item\(ns\)/)
    await waitFor(() => {
      expect(gerarMutateAsyncMock).toHaveBeenCalledWith(true)
    })
  })

  it('exibe atalho para dimensionamento mecânico quando composição tem itens aprovados', () => {
    useProjetoFluxoGatesMock.mockReturnValueOnce({
      loading: false,
      temCargas: true,
      condutoresRevisaoOk: true,
      composicaoComItens: true,
      podeAcessarDimensionamento: true,
      podeAcessarComposicao: true,
      podeAcessarDimensionamentoMecanico: true,
    })
    setupComposicaoPage({ user: userComPermissaoSeparar(), projetos: baseProjetos, snapshot: snapshotBase })

    renderPage(['/composicao?projeto=p1'])

    expect(screen.getByRole('link', { name: /Dimensionamento mecânico/i })).toHaveAttribute(
      'href',
      '/configurador/configuracoes/p1/fluxo/dimensionamento_mecanico'
    )
  })

  it('oculta acao de gerar sugestoes sem permissao de separacao', () => {
    setupComposicaoPage({ user: undefined, projetos: [], snapshot: null })

    renderPage()

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

    renderPage(['/composicao?projeto=p1'])

    expect(screen.getByText('Falha no snapshot')).toBeInTheDocument()
  })

  it('permite exportar excel e pdf com projeto selecionado', async () => {
    setupComposicaoPage({ user: userComPermissaoSeparar(), projetos: baseProjetos, snapshot: snapshotBase })

    renderPage(['/composicao?projeto=p1'])

    fireEvent.click(screen.getByRole('button', { name: /^Excel$/i }))

    await waitFor(() => {
      expect(exportarComposicaoListaXlsxMock).toHaveBeenCalledWith(
        'p1',
        'PRJ-01 - Cliente X - Projeto 1'
      )
    })

    await waitFor(() => expect(screen.getByRole('button', { name: /^PDF$/i })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: /^PDF$/i }))
    await waitFor(() => {
      expect(exportarComposicaoListaPdfMock).toHaveBeenCalledWith(
        'p1',
        'PRJ-01 - Cliente X - Projeto 1'
      )
    })
  })

  it('sincroniza e retorna para a proposta quando não há pendências', async () => {
    setupComposicaoPage({
      user: userComPermissaoSeparar(),
      projetos: baseProjetos,
      snapshot: snapshotBase,
    })

    renderPage(['/composicao?projeto=p1&orcamento=orc-1&vinculo=vinc-1'])

    expect(screen.queryByRole('button', { name: /Gerar sugestões/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Exportar sugestões para proposta/i }))

    await waitFor(() => {
      expect(sincronizarComposicaoPainelMock).toHaveBeenCalledWith('orc-1', 'vinc-1')
    })
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'success',
        message: '2 item(ns) sincronizado(s) com a proposta.',
      })
    )
    await waitFor(() =>
      expect(screen.getByTestId('location-path')).toHaveTextContent('/orcamentos/orc-1')
    )
  })

  it('habilita retorno para proposta quando listas abertas estão vazias mesmo com totais defasados', async () => {
    setupComposicaoPage({
      user: userComPermissaoSeparar(),
      projetos: baseProjetos,
      snapshot: {
        ...snapshotBase,
        sugestoes: [],
        pendencias: [],
        totais: { ...snapshotBase.totais, sugestoes: 2, pendencias: 1 },
      },
    })

    renderPage(['/composicao?projeto=p1&orcamento=orc-1&vinculo=vinc-1'])

    const botao = screen.getByRole('button', { name: /Exportar sugestões para proposta/i })
    expect(botao).toBeEnabled()
    fireEvent.click(botao)

    await waitFor(() => {
      expect(sincronizarComposicaoPainelMock).toHaveBeenCalledWith('orc-1', 'vinc-1')
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

    renderPage(['/composicao?projeto=p1'])

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

  it('exibe retorno desabilitado quando fluxo veio da proposta mas há pendências', () => {
    setupComposicaoPage({
      user: userComPermissaoSeparar(),
      projetos: baseProjetos,
      snapshot: {
        ...snapshotBase,
        pendencias: [{ id: 'pen-1', descricao: 'x' }],
        totais: { ...snapshotBase.totais, pendencias: 1 },
      },
    })

    renderPage(['/composicao?projeto=p1&orcamento=orc-1&vinculo=vinc-1'])

    expect(screen.queryByRole('button', { name: /Gerar sugestões/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Exportar sugestões para proposta/i })).toBeDisabled()
    expect(screen.getByRole('region', { name: /Monitoramento da exportação para proposta/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Orçamento')).toHaveValue('orc-1')
    expect(screen.getByLabelText('Vínculo')).toHaveValue('vinc-1')
    expect(screen.getByLabelText('Snapshot carregado')).toHaveValue('Sim')
    expect(screen.getByLabelText('Pendências')).toHaveValue('1')
    expect(screen.getByLabelText('Sugestões pendentes')).toHaveValue('0')
    expect(screen.getByLabelText('Pode exportar')).toHaveValue('Não')
    expect(screen.getByLabelText('Motivo')).toHaveValue(
      'Resolva as pendências antes de exportar para a proposta.'
    )
  })

  it('exibe retorno desabilitado quando fluxo veio da proposta mas há sugestões pendentes', () => {
    setupComposicaoPage({
      user: userComPermissaoSeparar(),
      projetos: baseProjetos,
      snapshot: {
        ...snapshotBase,
        sugestoes: [{ id: 'sug-1', descricao: 'x' }],
        totais: { ...snapshotBase.totais, sugestoes: 1 },
      },
    })

    renderPage(['/composicao?projeto=p1&orcamento=orc-1&vinculo=vinc-1'])

    const botao = screen.getByRole('button', { name: /Exportar sugestões para proposta/i })
    expect(botao).toBeDisabled()
    expect(botao).toHaveAttribute(
      'title',
      'Aprove todas as sugestões antes de exportar para a proposta.'
    )
    fireEvent.click(botao)
    expect(sincronizarComposicaoPainelMock).not.toHaveBeenCalled()
  })

  it('aprova sugestão individual, aprova todas e altera produto sugerido', async () => {
    setupComposicaoPage({
      user: userComPermissoesCompletas(),
      projetos: baseProjetos,
      snapshot: snapshotComItens,
    })
    useAlternativasSugestaoQueryMock.mockImplementation(() => ({
      data: [
        {
          id: 'prod-alt',
          codigo: 'K2',
          descricao: 'Contator 12A',
          fabricante: 'ACME',
          preco_base: '123.45',
        },
      ],
      isPending: false,
      isError: false,
      error: null,
    }))

    renderPage(['/composicao?projeto=p1'])

    expect(await screen.findByText('Contator 9A')).toBeInTheDocument()
    expect(screen.getByText(/Catálogo incompleto/)).toBeInTheDocument()
    expect(screen.getByText('Sem cabo compatível')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Aprovar' })[0])
    await waitFor(() => {
      expect(aprovarMutateAsyncMock).toHaveBeenCalledWith({
        sugestaoId: 'sug-1',
        produtoId: null,
      })
    })

    aprovarMutateAsyncMock.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar todas' }))
    await waitFor(() => expect(aprovarMutateAsyncMock).toHaveBeenCalledTimes(2))
    expect(aprovarMutateAsyncMock).toHaveBeenNthCalledWith(1, {
      sugestaoId: 'sug-1',
      produtoId: null,
    })
    expect(aprovarMutateAsyncMock).toHaveBeenNthCalledWith(2, {
      sugestaoId: 'sug-2',
      produtoId: null,
    })

    aprovarMutateAsyncMock.mockClear()
    fireEvent.click(screen.getAllByRole('button', { name: 'Alterar' })[0])
    expect(screen.getByText('Alternativas de catálogo')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Selecionar K2'))
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar produto selecionado' }))

    await waitFor(() => {
      expect(aprovarMutateAsyncMock).toHaveBeenCalledWith({
        sugestaoId: 'sug-1',
        produtoId: 'prod-alt',
      })
    })
  })

  it('reavalia pendências e reabre item aprovado', async () => {
    setupComposicaoPage({
      user: userComPermissoesCompletas(),
      projetos: baseProjetos,
      snapshot: snapshotComItens,
    })
    reavaliarMutateAsyncMock.mockResolvedValue({
      reavaliacao: {
        pendencias_abertas_antes: 3,
        pendencias_abertas_depois: 1,
        categorias_reavaliadas: ['CABO'],
        categorias_sem_produto: ['BORNE'],
        categorias_nao_mapeadas: ['XYZ'],
      },
    })

    renderPage(['/composicao?projeto=p1'])

    fireEvent.click(await screen.findByRole('button', { name: 'Reavaliar pendências' }))
    await waitFor(() => expect(reavaliarMutateAsyncMock).toHaveBeenCalled())
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'warning',
        title: 'Reavaliação concluída com avisos',
      })
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reabrir' }))
    await waitFor(() => expect(lastConfirmModalProps.current?.show).toBe(true))
    lastConfirmModalProps.current?.onConfirm?.()

    await waitFor(() => {
      expect(reabrirMutateAsyncMock).toHaveBeenCalledWith({
        composicaoItemId: 'cmp-1',
      })
    })
  })
})
