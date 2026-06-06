import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import {
  AppPageToolbarProvider,
  useAppPageToolbarState,
} from '@/components/layout/AppPageToolbarContext'

const useQueryMock = vi.hoisted(() => vi.fn())
const useProjetoDetailQueryMock = vi.hoisted(() => vi.fn())
const useCargaListQueryMock = vi.hoisted(() => vi.fn())
const useDimensionamentoQueryMock = vi.hoisted(() => vi.fn())
const useComposicaoSnapshotQueryMock = vi.hoisted(() => vi.fn())
const recalcMutateAsyncMock = vi.hoisted(() => vi.fn())
const gerarMutateAsyncMock = vi.hoisted(() => vi.fn())
const reavaliarMutateAsyncMock = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<object>('@tanstack/react-query')
  return {
    ...actual,
    useQuery: () => useQueryMock(),
  }
})

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      email: 'a@test.com',
      tipo_usuario: 'ADMIN',
      permissoes: [],
    },
  }),
}))

vi.mock('@/modules/configurador_paineis/projetos/hooks/useProjetoDetailQuery', () => ({
  useProjetoDetailQuery: () => useProjetoDetailQueryMock(),
}))

vi.mock('@/modules/configurador_paineis/cargas/hooks/useCargaListQuery', () => ({
  useCargaListQuery: () => useCargaListQueryMock(),
}))

vi.mock('@/modules/configurador_paineis/dimensionamento/hooks/useDimensionamentoQuery', () => ({
  useDimensionamentoQuery: () => useDimensionamentoQueryMock(),
}))

vi.mock('@/modules/configurador_paineis/composicao/hooks/useComposicaoSnapshotQuery', () => ({
  useComposicaoSnapshotQuery: () => useComposicaoSnapshotQueryMock(),
}))

vi.mock('@/modules/configurador_paineis/dimensionamento/hooks/useRecalcularDimensionamentoMutation', () => ({
  useRecalcularDimensionamentoMutation: () => ({
    mutateAsync: recalcMutateAsyncMock,
    isPending: false,
  }),
}))

vi.mock('@/modules/configurador_paineis/dimensionamento/components/WizardCondutoresPanel', () => ({
  default: () => null,
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

import ProjetoWizardPage from '@/modules/configurador_paineis/projetos/pages/ProjetoWizardPage'

const projetoBase = { id: 'p1', codigo: 'PRJ-01', nome: 'Projeto 1' }
const cargasComItem = [{ id: 'c1' }]
const dimensionamentoBase = {
  corrente_total_painel_a: '33.1',
  condutores_revisao_confirmada: true,
}
const composicaoTotaisBase = { totais: { sugestoes: 0, pendencias: 0, composicao_itens: 0 } }

function mockWizardData({
  projeto = projetoBase,
  cargas = [],
  dimensionamento = null,
  composicao = null,
  historico = [],
}: {
  projeto?: unknown
  cargas?: unknown[]
  dimensionamento?: unknown
  composicao?: unknown
  historico?: unknown[]
}) {
  useProjetoDetailQueryMock.mockReturnValue({ data: projeto, isPending: false })
  useCargaListQueryMock.mockReturnValue({ data: cargas })
  useDimensionamentoQueryMock.mockReturnValue({ data: dimensionamento })
  useComposicaoSnapshotQueryMock.mockReturnValue({ data: composicao })
  useQueryMock.mockReturnValue({ data: historico })
}

function renderWizard(initialEntry: string, includeListRoute = false) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/projetos/:id/fluxo/:etapa" element={<ProjetoWizardPage />} />
        <Route path="/projetos/fluxo/:etapa" element={<ProjetoWizardPage />} />
        <Route path="/configurador/composicao" element={<div>Página de composição</div>} />
        <Route path="/configurador/cargas" element={<div>Lista de cargas</div>} />
        <Route
          path="/configurador/configuracoes/:id/fluxo/:etapa"
          element={<ProjetoWizardPage />}
        />
        {includeListRoute ? (
          <Route path="/configurador/configuracoes" element={<div>Lista de projetos</div>} />
        ) : null}
      </Routes>
    </MemoryRouter>
  )
}

function ToolbarStateViewer() {
  const toolbar = useAppPageToolbarState()
  return (
    <div>
      {toolbar?.actions}
      {toolbar?.primaryAction ? (
        <button
          type="button"
          disabled={toolbar.primaryAction.disabled}
          onClick={toolbar.primaryAction.onClick}
        >
          {toolbar.primaryAction.label}
        </button>
      ) : null}
    </div>
  )
}

function renderWizardWithToolbar(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppPageToolbarProvider>
        <ToolbarStateViewer />
        <Routes>
          <Route
            path="/configurador/configuracoes/:id/fluxo/:etapa"
            element={<ProjetoWizardPage />}
          />
          <Route path="/configurador/composicao" element={<div>Página de composição</div>} />
          <Route path="/configurador/cargas" element={<div>Lista de cargas</div>} />
        </Routes>
      </AppPageToolbarProvider>
    </MemoryRouter>
  )
}

describe('ProjetoWizardPage', () => {
  it('redireciona para lista quando rota não tem id', () => {
    mockWizardData({ projeto: undefined })
    renderWizard('/projetos/fluxo/cargas', true)

    expect(screen.getByText('Lista de projetos')).toBeInTheDocument()
  })

  it('renderiza etapas do wizard e histórico', () => {
    mockWizardData({
      cargas: cargasComItem,
      dimensionamento: dimensionamentoBase,
      composicao: { totais: { sugestoes: 1, pendencias: 0, composicao_itens: 0 } },
      historico: [
        { id: 'e1', descricao: 'Projeto criado.', modulo: 'projeto', criado_em: new Date().toISOString() },
      ],
    })
    renderWizard('/projetos/p1/fluxo/cargas')

    expect(screen.getByRole('heading', { name: /Resumo do fluxo/i })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /Etapas do fluxo do painel/i })).toBeInTheDocument()
    expect(screen.getByText(/Ações rápidas do fluxo/i)).toBeInTheDocument()
    expect(screen.getByText(/Checklist de conclusão/i)).toBeInTheDocument()
    expect(screen.getByText(/Audit trail/i)).toBeInTheDocument()
    expect(screen.getByText(/Última ação:/i)).toBeInTheDocument()
    expect(screen.getByText(/Rastreabilidade do projeto/i)).toBeInTheDocument()
  })

  it('exibe estados bloqueados sem cargas e sem dimensionamento', () => {
    mockWizardData({ composicao: { totais: { sugestoes: 0, pendencias: 0 } } })
    renderWizard('/projetos/p1/fluxo/cargas')

    expect(screen.getByText(/Sem cálculo salvo para este projeto/i)).toBeInTheDocument()
    expect(screen.getAllByText('Bloqueado').length).toBeGreaterThan(0)
    const blockedStepLink = screen
      .getAllByRole('link', { name: /Abrir etapa/i })
      .find((link) => link.getAttribute('aria-disabled') === 'true')
    if (!blockedStepLink) {
      throw new Error('Expected blocked step link')
    }
    fireEvent.click(blockedStepLink)
  })

  it('aciona recalculo e geração de composição pelos botões rápidos', () => {
    mockWizardData({
      cargas: cargasComItem,
      dimensionamento: dimensionamentoBase,
      composicao: composicaoTotaisBase,
    })
    gerarMutateAsyncMock.mockResolvedValue({ geracao: { erros_etapas: [] } })
    recalcMutateAsyncMock.mockResolvedValue({})
    reavaliarMutateAsyncMock.mockResolvedValue({})
    renderWizard('/projetos/p1/fluxo/cargas')

    fireEvent.click(screen.getByRole('button', { name: /Recalcular agora/i }))
    fireEvent.click(screen.getByRole('button', { name: /Gerar sugestões/i }))
    fireEvent.click(screen.getByRole('button', { name: /Reavaliar/i }))

    expect(recalcMutateAsyncMock).toHaveBeenCalled()
    expect(gerarMutateAsyncMock).toHaveBeenCalled()
    expect(reavaliarMutateAsyncMock).toHaveBeenCalled()
  })

  it('redireciona fluxo/composicao para a rota de composição', () => {
    mockWizardData({})
    renderWizard('/projetos/p1/fluxo/composicao')
    expect(screen.getByText('Página de composição')).toBeInTheDocument()
  })

  it('redireciona fluxo/dimensionamento sem cargas para a lista de cargas', () => {
    mockWizardData({ cargas: [] })
    renderWizard('/projetos/p1/fluxo/dimensionamento')
    expect(screen.getByText('Lista de cargas')).toBeInTheDocument()
  })

  it('na etapa dimensionamento suprime fluxo, resumo em cartões, ações rápidas, checklist e rastreabilidade', () => {
    mockWizardData({
      cargas: cargasComItem,
      dimensionamento: dimensionamentoBase,
      composicao: composicaoTotaisBase,
      historico: [
        { id: 'e1', descricao: 'Teste', modulo: 'x', criado_em: new Date().toISOString() },
      ],
    })
    renderWizard('/projetos/p1/fluxo/dimensionamento')

    expect(screen.queryByRole('navigation', { name: /Etapas do fluxo do painel/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Resumo do dimensionamento/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Corrente do painel/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Checklist de conclusão/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Rastreabilidade do projeto/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Recalcular agora/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Abrir revisão de condutores/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Dados do projeto/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/Ações rápidas do fluxo/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Gerenciar cargas/i })).not.toBeInTheDocument()
  })

  it('habilita ação da toolbar quando condutores foram aprovados linha a linha', async () => {
    mockWizardData({
      cargas: cargasComItem,
      dimensionamento: {
        corrente_total_painel_a: '33.1',
        condutores_revisao_confirmada: false,
        circuitos_carga: [{ id: 'cc1', condutores_aprovado: true }],
        alimentacao_geral: { id: 'ag1', condutores_aprovado: true },
      },
      composicao: composicaoTotaisBase,
    })
    renderWizardWithToolbar('/configurador/configuracoes/p1/fluxo/dimensionamento')

    expect(
      await screen.findByRole('button', { name: /Salvar e ir para sugestões/i })
    ).toBeEnabled()
  })

  it('redireciona etapa inválida na URL para fluxo/cargas', () => {
    mockWizardData({})
    renderWizard('/projetos/p1/fluxo/etapa-inexistente')
    expect(screen.getByRole('heading', { name: /Resumo do fluxo/i })).toBeInTheDocument()
  })

  it('indica pronto para exportação quando fluxo técnico está concluído', () => {
    mockWizardData({
      cargas: [{ id: 'c1', atualizado_em: '2026-04-10T10:00:00.000Z' }],
      dimensionamento: {
        corrente_total_painel_a: '33.1',
        atualizado_em: '2026-04-10T11:00:00.000Z',
        condutores_revisao_confirmada: true,
      },
      composicao: { totais: { sugestoes: 1, pendencias: 0, composicao_itens: 1 } },
    })
    renderWizard('/projetos/p1/fluxo/cargas')

    expect(screen.getByText(/Pronto para exportação/i)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Ir para exportação da composição/i })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Última ação executada por usuário identificado/i)
    ).toBeInTheDocument()
  })
})
