import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useAuthMock = vi.hoisted(() => vi.fn())
const useProjetoListQueryMock = vi.hoisted(() => vi.fn())
const useComposicaoSnapshotQueryMock = vi.hoisted(() => vi.fn())
const useDimensionamentoQueryMock = vi.hoisted(() => vi.fn())
const useProjetoFluxoGatesMock = vi.hoisted(() => vi.fn())
const gerarMutateAsyncMock = vi.hoisted(() => vi.fn())
const reavaliarPendenciasMutateAsyncMock = vi.hoisted(() => vi.fn())
const aprovarMutateAsyncMock = vi.hoisted(() => vi.fn())
const reabrirComposicaoItemMutateAsyncMock = vi.hoisted(() => vi.fn())
const useAlternativasSugestaoQueryMock = vi.hoisted(() => vi.fn())
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
  useDimensionamentoQuery: () => useDimensionamentoQueryMock(),
}))

vi.mock('@/modules/projetos/hooks/useProjetoFluxoGates', () => ({
  useProjetoFluxoGates: () => useProjetoFluxoGatesMock(),
}))

vi.mock('@/modules/projetos/components/ProjetoFluxoStepper', () => ({
  ProjetoFluxoStepper: () => null,
}))

vi.mock('@/modules/composicao/hooks/useGerarSugestoesMutation', () => ({
  useGerarSugestoesMutation: () => ({ mutateAsync: gerarMutateAsyncMock, isPending: false }),
}))

vi.mock('@/modules/composicao/hooks/useReavaliarPendenciasMutation', () => ({
  useReavaliarPendenciasMutation: () => ({
    mutateAsync: reavaliarPendenciasMutateAsyncMock,
    isPending: false,
  }),
}))

vi.mock('@/modules/composicao/hooks/useAprovarSugestaoMutation', () => ({
  useAprovarSugestaoMutation: () => ({ mutateAsync: aprovarMutateAsyncMock, isPending: false }),
}))

vi.mock('@/modules/composicao/hooks/useReabrirComposicaoItemMutation', () => ({
  useReabrirComposicaoItemMutation: () => ({
    mutateAsync: reabrirComposicaoItemMutateAsyncMock,
    isPending: false,
  }),
}))

vi.mock('@/modules/composicao/hooks/useAlternativasSugestaoQuery', () => ({
  useAlternativasSugestaoQuery: () => useAlternativasSugestaoQueryMock(),
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
    useDimensionamentoQueryMock.mockReturnValue({
      data: null,
      isPending: false,
      isError: false,
      error: null,
    })
    useProjetoFluxoGatesMock.mockReturnValue({
      loading: false,
      temCargas: true,
      condutoresRevisaoOk: true,
      podeAcessarDimensionamento: true,
      podeAcessarComposicao: true,
    })
    gerarMutateAsyncMock.mockReset()
    gerarMutateAsyncMock.mockResolvedValue({
      geracao: { erros_etapas: [], sugestoes_descartadas_aprovadas: 0 },
    })
    reavaliarPendenciasMutateAsyncMock.mockReset()
    reavaliarPendenciasMutateAsyncMock.mockResolvedValue({
      reavaliacao: {
        pendencias_abertas_antes: 1,
        pendencias_abertas_depois: 0,
        categorias_reavaliadas: ['BORNES'],
        categorias_nao_mapeadas: [],
        erros: [],
      },
    })
    aprovarMutateAsyncMock.mockReset()
    aprovarMutateAsyncMock.mockResolvedValue({})
    reabrirComposicaoItemMutateAsyncMock.mockReset()
    reabrirComposicaoItemMutateAsyncMock.mockResolvedValue({})
    useAlternativasSugestaoQueryMock.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      error: null,
    })
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

  const projetoAlimentacao = {
    tensao_nominal: 380,
    tensao_nominal_display: '380 V',
    tipo_corrente: 'CA',
    tipo_corrente_display: 'CA',
    numero_fases: 3,
    numero_fases_display: 'Trifásico',
  }

  const cargaMotor = {
    id: 'carga-1',
    tag: 'M01',
    descricao: 'Motor principal',
    tipo: 'MOTOR',
    tipo_display: 'Motor',
    quantidade: 1,
    potencia_corrente_valor: '750',
    potencia_corrente_unidade: 'W',
    corrente_a: '2,5',
    tensao_carga_v: 380,
    tensao_carga_display: '380 V',
    numero_fases_carga: 3,
    numero_fases_carga_display: 'Trifásico',
  }

  const snapshotRico = {
    ...snapshotBase,
    projeto_codigo: 'PRJ-01',
    projeto_nome: 'Projeto 1',
    geracao: {
      total_sugestoes_retornadas: 2,
      erros_etapas: [{ etapa: 'contatoras', erro: 'Catálogo parcial' }],
      sugestoes_descartadas_aprovadas: 1,
    },
    composicao_itens: [
      {
        id: 'item-1',
        parte_painel: 'COMANDO',
        parte_painel_display: 'Comando',
        categoria_produto: 'CONTATORA',
        categoria_produto_display: 'Contatora',
        quantidade: '1',
        corrente_referencia_a: '2,5',
        memoria_calculo: 'Memória item aprovado',
        observacoes: 'Contatora K1\n[STATUS_APROVACAO] ignorar',
        ordem: 1,
        produto: {
          id: 'prod-contatora',
          codigo: 'K1-001',
          descricao: 'Contatora 9 A',
          fabricante: 'WEG',
        },
        produto_codigo: 'K1-001',
        carga: cargaMotor,
        status_display: 'Aprovado',
      },
      {
        id: 'item-2',
        parte_painel: 'POTENCIA',
        parte_painel_display: 'Potência',
        categoria_produto: 'DISJUNTOR',
        categoria_produto_display: 'Disjuntor geral',
        quantidade: '1',
        corrente_referencia_a: '125,50',
        memoria_calculo: 'Memória seccionamento',
        observacoes: '',
        ordem: 2,
        produto: {
          id: 'prod-geral',
          codigo: 'DJ-125',
          descricao: 'Disjuntor caixa moldada',
          fabricante: '',
        },
        produto_codigo: 'DJ-125',
        carga: null,
        projeto_alimentacao: projetoAlimentacao,
      },
    ],
    sugestoes: [
      {
        id: 'sug-1',
        parte_painel: 'COMANDO',
        parte_painel_display: 'Comando',
        categoria_produto: 'CONTATORA',
        categoria_produto_display: 'Contatora',
        quantidade: '1',
        corrente_referencia_a: '2,5',
        status: 'SUGERIDO',
        status_display: 'Sugerido',
        memoria_calculo: 'Icarga 2,5 A; usar AC-3',
        observacoes: 'Contatora de potência\n[STATUS_APROVACAO] ocultar',
        ordem: 1,
        produto: {
          id: 'prod-contatora',
          codigo: 'K1-001',
          descricao: 'Contatora 9 A',
          fabricante: 'WEG',
        },
        produto_codigo: 'K1-001',
        carga: cargaMotor,
      },
      {
        id: 'sug-2',
        parte_painel: 'POTENCIA',
        parte_painel_display: 'Potência',
        categoria_produto: 'DISJUNTOR',
        categoria_produto_display: 'Disjuntor geral',
        quantidade: '1',
        corrente_referencia_a: '125,50',
        status: 'SUGERIDO',
        memoria_calculo: 'Ib painel 125,50 A',
        observacoes: '',
        ordem: 2,
        produto: null,
        produto_codigo: null,
        carga: null,
        projeto_alimentacao: projetoAlimentacao,
      },
    ],
    pendencias: [
      {
        id: 'pend-1',
        parte_painel: 'COMANDO',
        parte_painel_display: 'Comando',
        categoria_produto: 'BORNE',
        categoria_produto_display: 'Borne',
        corrente_referencia_a: '2,5',
        descricao: 'Sem borne compatível',
        memoria_calculo: 'Pendência para bornes',
        observacoes: 'Borne X1',
        status: 'ABERTA',
        status_display: 'Aberta',
        ordem: 1,
        carga: cargaMotor,
      },
      {
        id: 'pend-2',
        parte_painel: 'POTENCIA',
        parte_painel_display: 'Potência',
        categoria_produto: 'FUSIVEL',
        categoria_produto_display: 'Fusível',
        corrente_referencia_a: '125,50',
        descricao: 'Sem fusível geral',
        memoria_calculo: 'Pendência painel geral',
        observacoes: '',
        status: 'ABERTA',
        ordem: 2,
        carga: null,
        projeto_alimentacao: projetoAlimentacao,
      },
    ],
    totais: { sugestoes: 2, pendencias: 2, composicao_itens: 2, inclusoes_manuais: 0 },
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

  function userComTodasPermissoes() {
    return {
      ...userComPermissaoSeparar(),
      permissoes: [
        'almoxarifado.separar_material',
        'material.editar_lista',
        'material.visualizar_lista',
        'projeto.visualizar',
      ],
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

  it('renderiza composição completa com sugestões, pendências e memorial', () => {
    useDimensionamentoQueryMock.mockReturnValue({
      data: { corrente_total_painel_a: '125,50' },
      isPending: false,
      isError: false,
      error: null,
    })
    setupComposicaoPage({
      user: userComTodasPermissoes(),
      projetos: baseProjetos,
      snapshot: snapshotRico,
    })

    render(
      <MemoryRouter initialEntries={['/composicao?projeto=p1']}>
        <ComposicaoPage />
      </MemoryRouter>
    )

    expect(screen.getByText(/2 sugestão\(ões\).*2 pendência\(s\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Avisos na última geração/i)).toBeInTheDocument()
    expect(screen.getByText('contatoras: Catálogo parcial')).toBeInTheDocument()
    expect(screen.getAllByText('M01').length).toBeGreaterThan(0)
    expect(screen.getAllByText('GDBT — 125,50 A').length).toBeGreaterThan(0)
    expect(screen.getAllByText('0,75 kW').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Contatora K1').length).toBeGreaterThan(0)
    expect(screen.queryByText(/STATUS_APROVACAO/)).not.toBeInTheDocument()
    expect(screen.getAllByText('SECCIONAMENTO').length).toBeGreaterThan(0)
    expect(screen.getByText('Sem borne compatível')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Cadastrar produto no catálogo/i })).toHaveAttribute(
      'href',
      '/catalogo/novo?retorno=%2Fcomposicao%3Fprojeto%3Dp1'
    )
    expect(screen.getByText('Icarga 2,5 A; usar AC-3')).toBeInTheDocument()
  })

  it('executa ações de geração, reavaliação, aprovação e reabertura', async () => {
    useAlternativasSugestaoQueryMock.mockReturnValue({
      data: [
        {
          id: 'alt-1',
          codigo: 'K1-ALT',
          descricao: 'Contatora alternativa',
          fabricante: null,
          valor_unitario: '',
        },
      ],
      isPending: false,
      isError: false,
      error: null,
    })
    gerarMutateAsyncMock.mockResolvedValueOnce({
      geracao: {
        erros_etapas: [{ etapa: 'bornes', erro: 'sem catálogo' }],
        sugestoes_descartadas_aprovadas: 0,
      },
    })
    reavaliarPendenciasMutateAsyncMock.mockResolvedValueOnce({
      reavaliacao: {
        pendencias_abertas_antes: 2,
        pendencias_abertas_depois: 1,
        categorias_reavaliadas: ['BORNES'],
        categorias_nao_mapeadas: ['FUSIVEL'],
        erros: [{ categoria_produto: 'BORNES', erro: 'Sem bitola' }],
      },
    })
    setupComposicaoPage({
      user: userComTodasPermissoes(),
      projetos: baseProjetos,
      snapshot: snapshotRico,
    })

    render(
      <MemoryRouter initialEntries={['/composicao?projeto=p1']}>
        <ComposicaoPage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: /Gerar sugestões/i }))
    await waitFor(() => expect(gerarMutateAsyncMock).toHaveBeenCalledWith(true))
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'warning', title: 'Sugestões geradas com avisos' })
    )

    fireEvent.click(screen.getByRole('button', { name: /Reavaliar pendências/i }))
    await waitFor(() => expect(reavaliarPendenciasMutateAsyncMock).toHaveBeenCalled())
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'warning', title: 'Reavaliação concluída com avisos' })
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Aprovar' })[0])
    await waitFor(() =>
      expect(aprovarMutateAsyncMock).toHaveBeenCalledWith({
        sugestaoId: 'sug-1',
        produtoId: null,
      })
    )

    fireEvent.click(screen.getByRole('button', { name: /Aprovar todas/i }))
    await waitFor(() =>
      expect(aprovarMutateAsyncMock).toHaveBeenCalledWith({
        sugestaoId: 'sug-2',
        produtoId: null,
      })
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Alterar' })[0])
    expect(await screen.findByRole('dialog', { name: /Alternativas de catálogo/i })).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Selecionar K1-ALT'))
    fireEvent.click(screen.getByRole('button', { name: /Aprovar produto selecionado/i }))
    await waitFor(() =>
      expect(aprovarMutateAsyncMock).toHaveBeenCalledWith({
        sugestaoId: 'sug-1',
        produtoId: 'alt-1',
      })
    )

    fireEvent.click(screen.getAllByRole('button', { name: /Reabrir/i })[0])
    await waitFor(() => expect(lastConfirmModalProps.current?.show).toBe(true))
    lastConfirmModalProps.current?.onConfirm?.()
    await waitFor(() =>
      expect(reabrirComposicaoItemMutateAsyncMock).toHaveBeenCalledWith({
        composicaoItemId: 'item-1',
      })
    )
  })
})
