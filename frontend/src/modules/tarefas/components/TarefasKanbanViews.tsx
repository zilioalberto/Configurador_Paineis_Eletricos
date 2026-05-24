import type { PrioridadeTarefa, TarefaKanbanItem } from '../types/tarefa'
import type { ColunaRenderizada, TarefaVisivel } from '../utils/tarefasKanbanConstants'
import {
  formatarDataCompleta,
  formatarHoras,
  formatarPrazo,
  prioridadeClass,
  tarefaEntregue,
  tarefaPrazoTimestamp,
  tarefaVencida,
  totalizarHorasTarefas,
} from '../utils/tarefasKanbanUtils'

/** Visualizações alternativas: lista, calendário e dashboard de horas. */
export function TarefasListaView({
  tarefas,
  onOpen,
}: Readonly<{
  tarefas: TarefaVisivel[]
  onOpen: (tarefa: TarefaKanbanItem) => void
}>) {
  return (
    <section className="tarefas-view-panel tarefas-list-view" aria-label="Lista de tarefas">
      {tarefas.length === 0 ? (
        <p className="tarefas-view-empty">Nenhuma tarefa encontrada para os filtros atuais.</p>
      ) : (
        <div className="tarefas-list-table-wrap">
          <table className="tarefas-list-table">
            <thead>
              <tr>
                <th>Tarefa</th>
                <th>Coluna</th>
                <th>Responsável</th>
                <th>Prazo</th>
                <th>Prioridade</th>
                <th>Status</th>
                <th>Horas</th>
              </tr>
            </thead>
            <tbody>
              {tarefas.map((tarefa) => (
                <tr key={tarefa.id}>
                  <td>
                    <button
                      type="button"
                      className="tarefas-list-table__task"
                      onClick={() => onOpen(tarefa)}
                    >
                      <strong>{tarefa.titulo}</strong>
                    </button>
                  </td>
                  <td>{tarefa.colunaNome}</td>
                  <td>{tarefa.responsavel_nome ?? 'Sem responsável'}</td>
                  <td className={tarefaVencida(tarefa) ? 'is-danger' : undefined}>
                    {formatarPrazo(tarefa.prazo)}
                  </td>
                  <td>
                    <span className={`kanban-priority-badge ${prioridadeClass(tarefa.prioridade)}`}>
                      {tarefa.prioridade_display}
                    </span>
                  </td>
                  <td>{tarefa.status_display}</td>
                  <td>{formatarHoras(tarefa.total_horas_apontadas ?? '0.00')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export function TarefasCalendarioView({
  tarefas,
  onOpen,
}: Readonly<{
  tarefas: TarefaVisivel[]
  onOpen: (tarefa: TarefaKanbanItem) => void
}>) {
  const tarefasComPrazo = tarefas
    .filter((tarefa) => tarefaPrazoTimestamp(tarefa) !== null)
    .sort((a, b) => (tarefaPrazoTimestamp(a) ?? 0) - (tarefaPrazoTimestamp(b) ?? 0))
  const grupos = tarefasComPrazo.reduce<Array<{ key: string; label: string; tarefas: TarefaVisivel[] }>>(
    (acc, tarefa) => {
      const data = new Date(tarefa.prazo ?? '')
      const key = data.toISOString().slice(0, 10)
      const existente = acc.find((grupo) => grupo.key === key)
      if (existente) {
        existente.tarefas.push(tarefa)
      } else {
        acc.push({ key, label: formatarDataCompleta(tarefa.prazo), tarefas: [tarefa] })
      }
      return acc
    },
    []
  )

  return (
    <section className="tarefas-view-panel tarefas-calendar-view" aria-label="Calendário de tarefas">
      {grupos.length === 0 ? (
        <p className="tarefas-view-empty">Nenhuma tarefa com prazo para exibir no calendário.</p>
      ) : (
        <div className="tarefas-calendar-grid">
          {grupos.map((grupo) => (
            <article className="tarefas-calendar-day" key={grupo.key}>
              <header>
                <strong>{grupo.label}</strong>
                <span>{grupo.tarefas.length}</span>
              </header>
              <div className="tarefas-calendar-day__items">
                {grupo.tarefas.map((tarefa) => (
                  <button
                    type="button"
                    key={tarefa.id}
                    className={`tarefas-calendar-item ${tarefaVencida(tarefa) ? 'is-danger' : ''}`}
                    onClick={() => onOpen(tarefa)}
                  >
                    <strong>{tarefa.titulo}</strong>
                    <span>{tarefa.colunaNome}</span>
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export function TarefasDashboardView({
  tarefas,
  colunas,
}: Readonly<{
  tarefas: TarefaVisivel[]
  colunas: ColunaRenderizada[]
}>) {
  const concluidas = tarefas.filter(tarefaEntregue).length
  const emAndamento = tarefas.filter((tarefa) =>
    ['INICIADA', 'EM_ANDAMENTO'].includes(tarefa.status)
  ).length
  const vencidas = tarefas.filter(tarefaVencida).length
  const horas = formatarHoras(totalizarHorasTarefas(tarefas))
  const prioridades: Array<[PrioridadeTarefa, string]> = [
    ['URGENTE', 'Urgentes'],
    ['ALTA', 'Altas'],
    ['MEDIA', 'Médias'],
    ['BAIXA', 'Baixas'],
  ]

  return (
    <section className="tarefas-view-panel tarefas-dashboard-view" aria-label="Dashboard de tarefas">
      <div className="tarefas-dashboard-cards">
        <article>
          <span>Total</span>
          <strong>{tarefas.length}</strong>
        </article>
        <article>
          <span>Trabalhando</span>
          <strong>{emAndamento}</strong>
        </article>
        <article>
          <span>Entregue</span>
          <strong>{concluidas}</strong>
        </article>
        <article>
          <span>Vencidas</span>
          <strong>{vencidas}</strong>
        </article>
        <article>
          <span>Horas gastas</span>
          <strong>{horas}</strong>
        </article>
      </div>

      <div className="tarefas-dashboard-grid">
        <article className="tarefas-dashboard-panel">
          <h2>Prioridade</h2>
          {prioridades.map(([prioridade, label]) => {
            const total = tarefas.filter((tarefa) => tarefa.prioridade === prioridade).length
            const percentual = tarefas.length ? (total / tarefas.length) * 100 : 0
            return (
              <div className="tarefas-dashboard-bar" key={prioridade}>
                <span>{label}</span>
                <div>
                  <strong style={{ width: `${percentual}%` }} />
                </div>
                <em>{total}</em>
              </div>
            )
          })}
        </article>
        <article className="tarefas-dashboard-panel">
          <h2>Colunas</h2>
          {colunas.map((coluna) => {
            const total = coluna.tarefasVisiveis.length
            const percentual = tarefas.length ? (total / tarefas.length) * 100 : 0
            return (
              <div className="tarefas-dashboard-bar" key={coluna.id}>
                <span>{coluna.nome}</span>
                <div>
                  <strong style={{ width: `${percentual}%` }} />
                </div>
                <em>{total}</em>
              </div>
            )
          })}
        </article>
      </div>
    </section>
  )
}
