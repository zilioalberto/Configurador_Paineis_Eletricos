import { beforeEach, describe, expect, it, vi } from 'vitest'

const getMock = vi.hoisted(() => vi.fn())
const postMock = vi.hoisted(() => vi.fn())
const patchMock = vi.hoisted(() => vi.fn())
const deleteMock = vi.hoisted(() => vi.fn())

vi.mock('@/services/apiClient', () => ({
  default: {
    get: getMock,
    post: postMock,
    patch: patchMock,
    delete: deleteMock,
  },
}))

import { tarefasQueryKeys } from '../tarefasQueryKeys'
import {
  atualizarTarefa,
  classificarTarefa,
  concluirTarefa,
  criarQuadroPadraoTarefas,
  criarTarefa,
  iniciarTimerTarefa,
  listarApontamentosTarefa,
  listarChecklistTarefa,
  listarColaboradoresRelatorioHorasPeriodo,
  listarComentariosTarefa,
  listarHistoricoTarefa,
  listarResponsaveisTarefa,
  moverTarefa,
  obterDashboardHorasDia,
  obterKanbanTarefas,
  obterTimerAtivoTarefa,
  pararTimerTarefa,
  registrarApontamentoHora,
} from './tarefasService'

describe('tarefasService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('obtem Kanban de tarefas', async () => {
    getMock.mockResolvedValueOnce({ data: { quadro: null } })

    await expect(obterKanbanTarefas()).resolves.toEqual({ quadro: null })

    expect(getMock).toHaveBeenCalledWith('/tarefas/kanban/', { params: undefined })
  })

  it('obtem Kanban filtrando por quadro', async () => {
    getMock.mockResolvedValueOnce({ data: { quadro: { id: 'q-2' } } })

    await expect(obterKanbanTarefas('q-2')).resolves.toEqual({ quadro: { id: 'q-2' } })

    expect(getMock).toHaveBeenCalledWith('/tarefas/kanban/', { params: { quadro: 'q-2' } })
  })

  it('classifica e conclui tarefa pelos endpoints dedicados', async () => {
    postMock
      .mockResolvedValueOnce({ data: { id: 't-1', tipo_etapa: 'PROPOSTA' } })
      .mockResolvedValueOnce({ data: { id: 't-1', status: 'CONCLUIDA' } })

    await expect(
      classificarTarefa('t-1', {
        tipo_etapa: 'PROPOSTA',
        proposta_referencia: 'PROP-1',
      })
    ).resolves.toEqual({ id: 't-1', tipo_etapa: 'PROPOSTA' })
    await expect(concluirTarefa('t-1')).resolves.toEqual({ id: 't-1', status: 'CONCLUIDA' })

    expect(postMock).toHaveBeenNthCalledWith(1, '/tarefas/t-1/classificar/', {
      tipo_etapa: 'PROPOSTA',
      proposta_referencia: 'PROP-1',
    })
    expect(postMock).toHaveBeenNthCalledWith(2, '/tarefas/t-1/concluir/')
  })

  it('lista responsaveis de tarefas', async () => {
    getMock.mockResolvedValueOnce({ data: [{ id: 1, label: 'Ana', email: 'a@zfw.com' }] })

    await expect(listarResponsaveisTarefa()).resolves.toEqual([
      { id: 1, label: 'Ana', email: 'a@zfw.com' },
    ])

    expect(getMock).toHaveBeenCalledWith('/tarefas/responsaveis/')
  })

  it('lista apontamentos de uma tarefa', async () => {
    getMock.mockResolvedValueOnce({
      data: [{ id: 'a-1', tarefa: 't-1', horas: '1.25' }],
    })

    await expect(listarApontamentosTarefa('t-1')).resolves.toEqual([
      { id: 'a-1', tarefa: 't-1', horas: '1.25' },
    ])

    expect(getMock).toHaveBeenCalledWith('/tarefas/apontamentos/', {
      params: { tarefa: 't-1' },
    })
  })

  it('obtem dashboard diario de horas', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        data: '2026-05-06',
        total_horas: '2.00',
        total_apontamentos: 2,
        total_tarefas: 1,
        apontamentos: [],
      },
    })

    await expect(obterDashboardHorasDia('2026-05-06')).resolves.toEqual({
      data: '2026-05-06',
      total_horas: '2.00',
      total_apontamentos: 2,
      total_tarefas: 1,
      apontamentos: [],
    })

    expect(getMock).toHaveBeenCalledWith('/tarefas/dashboard/horas-dia/', {
      params: { data: '2026-05-06' },
    })
  })

  it('cria quadro padrao de tarefas', async () => {
    postMock.mockResolvedValueOnce({ data: { quadro: { id: 'q-1' } } })

    await expect(criarQuadroPadraoTarefas()).resolves.toEqual({
      quadro: { id: 'q-1' },
    })

    expect(postMock).toHaveBeenCalledWith('/tarefas/quadros/padrao/')
  })

  it('cria tarefa e move cartao no Kanban', async () => {
    postMock
      .mockResolvedValueOnce({ data: { id: 't-1', titulo: 'Nova' } })
      .mockResolvedValueOnce({ data: { id: 't-1', coluna: 'c-2', ordem: 0 } })

    await expect(
      criarTarefa({ titulo: 'Nova', coluna: 'c-1', prioridade: 'MEDIA' })
    ).resolves.toEqual({ id: 't-1', titulo: 'Nova' })
    await expect(
      moverTarefa({ tarefaId: 't-1', colunaId: 'c-2', ordem: 0 })
    ).resolves.toEqual({ id: 't-1', coluna: 'c-2', ordem: 0 })

    expect(postMock).toHaveBeenNthCalledWith(1, '/tarefas/', {
      titulo: 'Nova',
      coluna: 'c-1',
      prioridade: 'MEDIA',
    })
    expect(postMock).toHaveBeenNthCalledWith(2, '/tarefas/t-1/mover/', {
      coluna_id: 'c-2',
      ordem: 0,
    })
  })

  it('atualiza tarefa e registra apontamento de horas', async () => {
    patchMock.mockResolvedValueOnce({ data: { id: 't-1', titulo: 'Ajustada' } })
    postMock.mockResolvedValueOnce({ data: { id: 'a-1', tarefa: 't-1', horas: '1.25' } })

    await expect(
      atualizarTarefa('t-1', { titulo: 'Ajustada', prioridade: 'ALTA' })
    ).resolves.toEqual({ id: 't-1', titulo: 'Ajustada' })
    await expect(
      registrarApontamentoHora({
        tarefa: 't-1',
        data: '2026-05-06',
        horas: '1.25',
        etapa: 'Cronometro',
      })
    ).resolves.toEqual({ id: 'a-1', tarefa: 't-1', horas: '1.25' })

    expect(patchMock).toHaveBeenCalledWith('/tarefas/t-1/', {
      titulo: 'Ajustada',
      prioridade: 'ALTA',
    })
    expect(postMock).toHaveBeenCalledWith('/tarefas/apontamentos/', {
      tarefa: 't-1',
      data: '2026-05-06',
      horas: '1.25',
      etapa: 'Cronometro',
    })
  })

  it('controla timer ativo de tarefa', async () => {
    getMock.mockResolvedValueOnce({ data: { sessao: null } })
    postMock
      .mockResolvedValueOnce({ data: { sessao: { id: 's-1', tarefa: 't-1' } } })
      .mockResolvedValueOnce({
        data: {
          sessao: { id: 's-1', tarefa: 't-1', finalizado_em: '2026-05-06T12:00:00Z' },
          apontamento: { id: 'a-1', tarefa: 't-1', horas: '0.50' },
        },
      })

    await expect(obterTimerAtivoTarefa()).resolves.toMatchObject({ sessao: null })
    await expect(iniciarTimerTarefa('t-1')).resolves.toEqual({
      sessao: { id: 's-1', tarefa: 't-1' },
    })
    await expect(pararTimerTarefa()).resolves.toEqual({
      sessao: { id: 's-1', tarefa: 't-1', finalizado_em: '2026-05-06T12:00:00Z' },
      apontamento: { id: 'a-1', tarefa: 't-1', horas: '0.50' },
    })

    expect(getMock).toHaveBeenCalledWith('/tarefas/timer/ativo/')
    expect(postMock).toHaveBeenNthCalledWith(1, '/tarefas/t-1/timer/iniciar/')
    expect(postMock).toHaveBeenNthCalledWith(2, '/tarefas/timer/parar/')
  })

  it('lista colaboradores com apontamentos no periodo (gestao de horas)', async () => {
    getMock.mockResolvedValueOnce({ data: [{ id: 2, label: 'Beto', email: 'b@zfw.com' }] })

    await expect(
      listarColaboradoresRelatorioHorasPeriodo({
        data_inicio: '2026-05-01',
        data_fim: '2026-05-31',
      })
    ).resolves.toEqual([{ id: 2, label: 'Beto', email: 'b@zfw.com' }])

    expect(getMock).toHaveBeenCalledWith('/tarefas/relatorios/horas-gestao/colaboradores/', {
      params: { data_inicio: '2026-05-01', data_fim: '2026-05-31' },
    })
  })

  it('lista historico, comentarios e checklist por tarefa', async () => {
    getMock
      .mockResolvedValueOnce({ data: [{ id: 'h-1', tarefa: 't-1' }] })
      .mockResolvedValueOnce({ data: [{ id: 'c-1', tarefa: 't-1' }] })
      .mockResolvedValueOnce({ data: [{ id: 'k-1', tarefa: 't-1', titulo: 'Item' }] })

    await expect(listarHistoricoTarefa('t-1')).resolves.toEqual([{ id: 'h-1', tarefa: 't-1' }])
    await expect(listarComentariosTarefa('t-1')).resolves.toEqual([{ id: 'c-1', tarefa: 't-1' }])
    await expect(listarChecklistTarefa('t-1')).resolves.toEqual([
      { id: 'k-1', tarefa: 't-1', titulo: 'Item' },
    ])

    expect(getMock).toHaveBeenNthCalledWith(1, '/tarefas/historico/', {
      params: { tarefa: 't-1' },
    })
    expect(getMock).toHaveBeenNthCalledWith(2, '/tarefas/comentarios/', {
      params: { tarefa: 't-1' },
    })
    expect(getMock).toHaveBeenNthCalledWith(3, '/tarefas/checklist/', {
      params: { tarefa: 't-1' },
    })
  })

  it('declara chaves de query estaveis', () => {
    expect(tarefasQueryKeys.kanban()).toEqual(['tarefas', 'kanban'])
    expect(tarefasQueryKeys.responsaveis()).toEqual(['tarefas', 'responsaveis'])
    expect(tarefasQueryKeys.timerAtivo()).toEqual(['tarefas', 'timer-ativo'])
    expect(tarefasQueryKeys.apontamentos('t-1')).toEqual([
      'tarefas',
      'apontamentos',
      't-1',
    ])
    expect(tarefasQueryKeys.historico('t-1')).toEqual(['tarefas', 'historico', 't-1'])
    expect(tarefasQueryKeys.comentarios('t-1')).toEqual(['tarefas', 'comentarios', 't-1'])
    expect(tarefasQueryKeys.checklist('t-1')).toEqual(['tarefas', 'checklist', 't-1'])
    expect(tarefasQueryKeys.horasDia(99, '2026-05-06')).toEqual([
      'tarefas',
      'horas-dia',
      99,
      '2026-05-06',
    ])
    expect(
      tarefasQueryKeys.relatorioHorasGestaoColaboradores({
        data_inicio: '2026-05-01',
        data_fim: '2026-05-31',
      })
    ).toEqual([
      'tarefas',
      'relatorio-horas-gestao-colaboradores',
      { data_inicio: '2026-05-01', data_fim: '2026-05-31' },
    ])
  })
})
