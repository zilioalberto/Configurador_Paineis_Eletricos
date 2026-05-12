import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useRelatorioHorasGestaoQueryMock = vi.hoisted(() => vi.fn())
const useColaboradoresRelatorioHorasPeriodoQueryMock = vi.hoisted(() => vi.fn())
const useTarefaResponsaveisQueryMock = vi.hoisted(() => vi.fn())

vi.mock('../hooks/useRelatorioHorasGestaoQuery', () => ({
  useRelatorioHorasGestaoQuery: (...args: unknown[]) => useRelatorioHorasGestaoQueryMock(...args),
}))

vi.mock('../hooks/useColaboradoresRelatorioHorasPeriodoQuery', () => ({
  useColaboradoresRelatorioHorasPeriodoQuery: (...args: unknown[]) =>
    useColaboradoresRelatorioHorasPeriodoQueryMock(...args),
}))

vi.mock('../hooks/useTarefaResponsaveisQuery', () => ({
  useTarefaResponsaveisQuery: () => useTarefaResponsaveisQueryMock(),
}))

import HorasGestaoPage from './HorasGestaoPage'

const relatorioBase = {
  periodo: { data_inicio: '2026-05-01', data_fim: '2026-05-31' },
  filtros: {
    proposta: 'PROP-001',
    ordem_producao: null,
    colaborador_id: 7,
    colaborador_nome: 'Ana Souza',
  },
  total_horas: '12.50',
  por_colaborador: [
    {
      colaborador_id: 7,
      colaborador_nome: 'Ana Souza',
      total_horas: '12.50',
      registros: 3,
    },
  ],
  por_proposta: [
    {
      proposta_referencia: 'PROP-001',
      total_horas: '12.50',
      registros: 3,
      tarefas_distintas: 2,
      colaboradores_distintos: 1,
    },
  ],
  por_ordem_producao: [],
  por_tarefa: [
    {
      tarefa_id: 't1',
      titulo: 'Montagem painel',
      tipo_etapa: 'PROPOSTA',
      proposta_referencia: 'PROP-001',
      ordem_producao_referencia: '',
      total_horas: '12.50',
      registros: 3,
      colaboradores_distintos: 1,
    },
  ],
  por_tarefa_colaborador: [
    {
      tarefa_id: 't1',
      titulo: 'Montagem painel',
      colaborador_id: 7,
      colaborador_nome: 'Ana Souza',
      horas: '12.50',
      registros: 3,
    },
  ],
}

function setupHorasGestaoPage() {
  useRelatorioHorasGestaoQueryMock.mockReturnValue({
    data: relatorioBase,
    isError: false,
    isPending: false,
    error: null,
  })
  useColaboradoresRelatorioHorasPeriodoQueryMock.mockReturnValue({
    data: [{ id: 8, label: 'Bruno Lima', email: 'bruno@empresa.com' }],
    isError: false,
    isFetching: false,
  })
  useTarefaResponsaveisQueryMock.mockReturnValue({
    data: [{ id: 7, label: 'Ana Souza', email: 'ana@empresa.com' }],
    isPending: false,
  })
}

function renderHorasGestaoPage() {
  return render(
    <MemoryRouter>
      <HorasGestaoPage />
    </MemoryRouter>
  )
}

describe('HorasGestaoPage', () => {
  beforeEach(() => {
    useRelatorioHorasGestaoQueryMock.mockClear()
    setupHorasGestaoPage()
  })

  it('exibe resumo e tabelas do relatorio', () => {
    renderHorasGestaoPage()

    expect(screen.getByRole('heading', { name: 'Gestão de horas' })).toBeInTheDocument()
    expect(screen.getByText('12,50 h')).toBeInTheDocument()
    expect(screen.getAllByText('Ana Souza').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Montagem painel').length).toBeGreaterThan(0)
    expect(screen.getAllByText('PROP-001').length).toBeGreaterThan(0)
  })

  it('submete filtros opcionais e alterna foco para propostas', () => {
    renderHorasGestaoPage()

    fireEvent.change(document.getElementById('hg-colaborador')!, { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Proposta (referência PROP)'), {
      target: { value: 'PROP-777' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }))

    expect(useRelatorioHorasGestaoQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ colaborador: '8', proposta: 'PROP-777' }),
      true
    )

    fireEvent.click(screen.getByRole('button', { name: 'Propostas' }))
    expect(screen.getByRole('heading', { name: 'Por proposta (tarefas tipo proposta)' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Por ordem de produção' })).not.toBeInTheDocument()
  })
})
