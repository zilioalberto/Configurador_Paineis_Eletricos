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
  ajustarApontamentoHora,
  aprovarApontamentoHora,
  atualizarComentarioTarefa,
  atualizarItemChecklist,
  atualizarTarefa,
  classificarTarefa,
  concluirTarefa,
  criarComentarioTarefa,
  criarItemChecklist,
  criarQuadroPadraoTarefas,
  criarTarefa,
  eliminarComentarioTarefa,
  eliminarItemChecklist,
  excluirTarefa,
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
  obterRelatorioHorasGestao,
  obterTimerAtivoTarefa,
  pararTimerTarefa,
  registrarApontamentoHora,
  rejeitarApontamentoHora,
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

  it('obtem dashboard diario sem filtro de data', async () => {
    getMock.mockResolvedValueOnce({
      data: { data: '2026-05-11', total_horas: '0', total_apontamentos: 0, total_tarefas: 0, apontamentos: [] },
    })

    await expect(obterDashboardHorasDia()).resolves.toMatchObject({ data: '2026-05-11' })
    expect(getMock).toHaveBeenCalledWith('/tarefas/dashboard/horas-dia/', { params: undefined })
  })

  it('obtem relatorio de gestao de horas com filtros opcionais', async () => {
    const relatorio = {
      periodo: { data_inicio: '2026-05-01', data_fim: '2026-05-31' },
      filtros: {
        proposta: null,
        ordem_producao: null,
        colaborador_id: null,
        colaborador_nome: null,
      },
      total_horas: '1',
      por_colaborador: [],
      por_proposta: [],
      por_ordem_producao: [],
      por_tarefa: [],
      por_tarefa_colaborador: [],
    }
    getMock.mockResolvedValueOnce({ data: relatorio })

    await expect(
      obterRelatorioHorasGestao({
        data_inicio: '2026-05-01',
        data_fim: '2026-05-31',
        proposta: '  PROP-1  ',
        ordem_producao: ' OP-9 ',
        colaborador: ' 42 ',
      })
    ).resolves.toEqual(relatorio)

    expect(getMock).toHaveBeenCalledWith('/tarefas/relatorios/horas-gestao/', {
      params: {
        data_inicio: '2026-05-01',
        data_fim: '2026-05-31',
        proposta: 'PROP-1',
        ordem_producao: 'OP-9',
        colaborador: '42',
      },
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

  it('move tarefa sem enviar ordem quando indefinida', async () => {
    postMock.mockResolvedValueOnce({ data: { id: 't-1', coluna: 'c-3' } })

    await expect(moverTarefa({ tarefaId: 't-1', colunaId: 'c-3' })).resolves.toEqual({
      id: 't-1',
      coluna: 'c-3',
    })

    expect(postMock).toHaveBeenCalledWith('/tarefas/t-1/mover/', { coluna_id: 'c-3' })
  })

  it('exclui tarefa', async () => {
    deleteMock.mockResolvedValueOnce({ data: undefined })

    await expect(excluirTarefa('t-x')).resolves.toBeUndefined()

    expect(deleteMock).toHaveBeenCalledWith('/tarefas/t-x/')
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

  it('cria, atualiza e elimina comentario de tarefa', async () => {
    postMock.mockResolvedValueOnce({ data: { id: 'cm-1', tarefa: 't-1', comentario: 'Olá' } })
    patchMock.mockResolvedValueOnce({ data: { id: 'cm-1', tarefa: 't-1', comentario: 'Oi' } })
    deleteMock.mockResolvedValueOnce({ data: undefined })

    await expect(criarComentarioTarefa('t-1', 'Olá')).resolves.toEqual({
      id: 'cm-1',
      tarefa: 't-1',
      comentario: 'Olá',
    })
    await expect(atualizarComentarioTarefa('cm-1', 'Oi')).resolves.toEqual({
      id: 'cm-1',
      tarefa: 't-1',
      comentario: 'Oi',
    })
    await expect(eliminarComentarioTarefa('cm-1')).resolves.toBeUndefined()

    expect(postMock).toHaveBeenCalledWith('/tarefas/comentarios/', {
      tarefa: 't-1',
      comentario: 'Olá',
    })
    expect(patchMock).toHaveBeenCalledWith('/tarefas/comentarios/cm-1/', { comentario: 'Oi' })
    expect(deleteMock).toHaveBeenCalledWith('/tarefas/comentarios/cm-1/')
  })

  it('cria, atualiza e elimina item de checklist', async () => {
    postMock
      .mockResolvedValueOnce({ data: { id: 'k-1', titulo: 'A', ordem: 1 } })
      .mockResolvedValueOnce({ data: { id: 'k-2', titulo: 'B' } })
    patchMock.mockResolvedValueOnce({ data: { id: 'k-1', titulo: 'A', concluido: true } })
    deleteMock.mockResolvedValueOnce({ data: undefined })

    await expect(criarItemChecklist('t-1', 'A', 1)).resolves.toEqual({ id: 'k-1', titulo: 'A', ordem: 1 })
    await expect(criarItemChecklist('t-1', 'B')).resolves.toEqual({ id: 'k-2', titulo: 'B' })
    await expect(atualizarItemChecklist('k-1', { concluido: true })).resolves.toMatchObject({
      id: 'k-1',
      concluido: true,
    })
    await expect(eliminarItemChecklist('k-1')).resolves.toBeUndefined()

    expect(postMock).toHaveBeenNthCalledWith(1, '/tarefas/checklist/', {
      tarefa: 't-1',
      titulo: 'A',
      ordem: 1,
    })
    expect(postMock).toHaveBeenNthCalledWith(2, '/tarefas/checklist/', { tarefa: 't-1', titulo: 'B' })
    expect(patchMock).toHaveBeenCalledWith('/tarefas/checklist/k-1/', { concluido: true })
    expect(deleteMock).toHaveBeenCalledWith('/tarefas/checklist/k-1/')
  })

  it('aprova, rejeita e ajusta apontamento de horas', async () => {
    postMock
      .mockResolvedValueOnce({ data: { id: 'ap-1', status_aprovacao: 'APROVADO' } })
      .mockResolvedValueOnce({ data: { id: 'ap-1', status_aprovacao: 'REJEITADO' } })
      .mockResolvedValueOnce({ data: { id: 'ap-1', horas: '2.00' } })

    await expect(aprovarApontamentoHora('ap-1')).resolves.toEqual({
      id: 'ap-1',
      status_aprovacao: 'APROVADO',
    })
    await expect(rejeitarApontamentoHora('ap-1')).resolves.toEqual({
      id: 'ap-1',
      status_aprovacao: 'REJEITADO',
    })
    await expect(
      ajustarApontamentoHora('ap-1', { justificativa_ajuste: 'Correção', horas: '2.00' })
    ).resolves.toEqual({ id: 'ap-1', horas: '2.00' })

    expect(postMock).toHaveBeenNthCalledWith(1, '/tarefas/apontamentos/ap-1/aprovar/')
    expect(postMock).toHaveBeenNthCalledWith(2, '/tarefas/apontamentos/ap-1/rejeitar/')
    expect(postMock).toHaveBeenNthCalledWith(3, '/tarefas/apontamentos/ap-1/ajustar/', {
      justificativa_ajuste: 'Correção',
      horas: '2.00',
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
