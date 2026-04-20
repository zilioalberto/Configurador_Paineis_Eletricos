import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

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

vi.mock('@/modules/projetos/hooks/useProjetoDetailQuery', () => ({
  useProjetoDetailQuery: () => useProjetoDetailQueryMock(),
}))

vi.mock('@/modules/cargas/hooks/useCargaListQuery', () => ({
  useCargaListQuery: () => useCargaListQueryMock(),
}))

vi.mock('@/modules/dimensionamento/hooks/useDimensionamentoQuery', () => ({
  useDimensionamentoQuery: () => useDimensionamentoQueryMock(),
}))

vi.mock('@/modules/composicao/hooks/useComposicaoSnapshotQuery', () => ({
  useComposicaoSnapshotQuery: () => useComposicaoSnapshotQueryMock(),
}))

vi.mock('@/modules/dimensionamento/hooks/useRecalcularDimensionamentoMutation', () => ({
  useRecalcularDimensionamentoMutation: () => ({
    mutateAsync: recalcMutateAsyncMock,
    isPending: false,
  }),
}))

vi.mock('@/modules/composicao/hooks/useGerarSugestoesMutation', () => ({
  useGerarSugestoesMutation: () => ({
    mutateAsync: gerarMutateAsyncMock,
    isPending: false,
  }),
}))

vi.mock('@/modules/composicao/hooks/useReavaliarPendenciasMutation', () => ({
  useReavaliarPendenciasMutation: () => ({
    mutateAsync: reavaliarMutateAsyncMock,
    isPending: false,
  }),
}))

import ProjetoWizardPage from '@/modules/projetos/pages/ProjetoWizardPage'

describe('ProjetoWizardPage', () => {
  it('renderiza etapas do wizard e histórico', () => {
    useProjetoDetailQueryMock.mockReturnValue({
      data: { id: 'p1', codigo: 'PRJ-01', nome: 'Projeto 1' },
      isPending: false,
    })
    useCargaListQueryMock.mockReturnValue({ data: [{ id: 'c1' }] })
    useDimensionamentoQueryMock.mockReturnValue({ data: { corrente_total_painel_a: '33.1' } })
    useComposicaoSnapshotQueryMock.mockReturnValue({
      data: { totais: { sugestoes: 1, pendencias: 0, composicao_itens: 0 } },
    })
    useQueryMock.mockReturnValue({
      data: [{ id: 'e1', descricao: 'Projeto criado.', modulo: 'projeto', criado_em: new Date().toISOString() }],
    })

    render(
      <MemoryRouter initialEntries={['/projetos/p1/fluxo/cargas']}>
        <Routes>
          <Route path="/projetos/:id/fluxo/:etapa" element={<ProjetoWizardPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText(/Wizard do Projeto/i)).toBeInTheDocument()
    expect(screen.getByText(/Ações rápidas do fluxo/i)).toBeInTheDocument()
    expect(screen.getByText(/Checklist de conclusão/i)).toBeInTheDocument()
    expect(screen.getByText(/Audit trail/i)).toBeInTheDocument()
    expect(screen.getByText(/Última ação:/i)).toBeInTheDocument()
    expect(screen.getByText(/Rastreabilidade do projeto/i)).toBeInTheDocument()
  })

  it('aciona recalculo e geração de composição pelos botões rápidos', () => {
    useProjetoDetailQueryMock.mockReturnValue({
      data: { id: 'p1', codigo: 'PRJ-01', nome: 'Projeto 1' },
      isPending: false,
    })
    useCargaListQueryMock.mockReturnValue({ data: [{ id: 'c1' }] })
    useDimensionamentoQueryMock.mockReturnValue({ data: { corrente_total_painel_a: '33.1' } })
    useComposicaoSnapshotQueryMock.mockReturnValue({
      data: { totais: { sugestoes: 0, pendencias: 0, composicao_itens: 0 } },
    })
    useQueryMock.mockReturnValue({ data: [] })
    gerarMutateAsyncMock.mockResolvedValue({ geracao: { erros_etapas: [] } })
    recalcMutateAsyncMock.mockResolvedValue({})
    reavaliarMutateAsyncMock.mockResolvedValue({})

    render(
      <MemoryRouter initialEntries={['/projetos/p1/fluxo/composicao']}>
        <Routes>
          <Route path="/projetos/:id/fluxo/:etapa" element={<ProjetoWizardPage />} />
        </Routes>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: /Recalcular agora/i }))
    fireEvent.click(screen.getByRole('button', { name: /Gerar sugestões/i }))
    fireEvent.click(screen.getByRole('button', { name: /Reavaliar/i }))

    expect(recalcMutateAsyncMock).toHaveBeenCalled()
    expect(gerarMutateAsyncMock).toHaveBeenCalled()
    expect(reavaliarMutateAsyncMock).toHaveBeenCalled()
  })

  it('indica pronto para exportação quando fluxo técnico está concluído', () => {
    useProjetoDetailQueryMock.mockReturnValue({
      data: { id: 'p1', codigo: 'PRJ-01', nome: 'Projeto 1' },
      isPending: false,
    })
    useCargaListQueryMock.mockReturnValue({
      data: [{ id: 'c1', atualizado_em: '2026-04-10T10:00:00.000Z' }],
    })
    useDimensionamentoQueryMock.mockReturnValue({
      data: {
        corrente_total_painel_a: '33.1',
        atualizado_em: '2026-04-10T11:00:00.000Z',
      },
    })
    useComposicaoSnapshotQueryMock.mockReturnValue({
      data: { totais: { sugestoes: 1, pendencias: 0, composicao_itens: 1 } },
    })
    useQueryMock.mockReturnValue({ data: [] })

    render(
      <MemoryRouter initialEntries={['/projetos/p1/fluxo/composicao']}>
        <Routes>
          <Route path="/projetos/:id/fluxo/:etapa" element={<ProjetoWizardPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText(/Pronto para exportação/i)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Ir para exportação da composição/i })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Última ação executada por usuário identificado/i)
    ).toBeInTheDocument()
  })
})
