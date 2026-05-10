import { type FormEvent, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useColaboradoresRelatorioHorasPeriodoQuery } from '../hooks/useColaboradoresRelatorioHorasPeriodoQuery'
import { useRelatorioHorasGestaoQuery } from '../hooks/useRelatorioHorasGestaoQuery'
import { useTarefaResponsaveisQuery } from '../hooks/useTarefaResponsaveisQuery'

function dataIsoLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function periodoPadrao(): { inicio: string; fim: string } {
  const fim = new Date()
  const inicio = new Date(fim)
  inicio.setDate(inicio.getDate() - 89)
  return { inicio: dataIsoLocal(inicio), fim: dataIsoLocal(fim) }
}

type FocoRelatorio = 'resumo' | 'colaborador' | 'propostas' | 'ordens'

export default function HorasGestaoPage() {
  const padrao = useMemo(() => periodoPadrao(), [])
  const [dataInicio, setDataInicio] = useState(padrao.inicio)
  const [dataFim, setDataFim] = useState(padrao.fim)
  const [colaboradorId, setColaboradorId] = useState('')
  const [proposta, setProposta] = useState('')
  const [ordemProducao, setOrdemProducao] = useState('')
  const [foco, setFoco] = useState<FocoRelatorio>('resumo')
  const [submetido, setSubmetido] = useState(() => ({
    data_inicio: padrao.inicio,
    data_fim: padrao.fim,
    proposta: '' as string | undefined,
    ordem_producao: '' as string | undefined,
    colaborador: '' as string | undefined,
  }))

  const responsaveisQuery = useTarefaResponsaveisQuery()
  const colaboradoresPeriodoQuery = useColaboradoresRelatorioHorasPeriodoQuery(
    { data_inicio: dataInicio, data_fim: dataFim },
    true
  )

  const opcoesColaborador = useMemo(() => {
    const map = new Map<number, { id: number; label: string; email: string }>()
    for (const r of responsaveisQuery.data ?? []) {
      map.set(r.id, { id: r.id, label: r.label, email: r.email })
    }
    for (const c of colaboradoresPeriodoQuery.data ?? []) {
      if (!map.has(c.id)) {
        map.set(c.id, { id: c.id, label: c.label, email: c.email })
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' })
    )
  }, [responsaveisQuery.data, colaboradoresPeriodoQuery.data])

  const selectColaboradorDesabilitado =
    responsaveisQuery.isPending && opcoesColaborador.length === 0
    () => ({
      data_inicio: submetido.data_inicio,
      data_fim: submetido.data_fim,
      ...(submetido.proposta?.trim()
        ? { proposta: submetido.proposta.trim() }
        : {}),
      ...(submetido.ordem_producao?.trim()
        ? { ordem_producao: submetido.ordem_producao.trim() }
        : {}),
      ...(submetido.colaborador?.trim()
        ? { colaborador: submetido.colaborador.trim() }
        : {}),
    }),
    [submetido]
  )

  const query = useRelatorioHorasGestaoQuery(params, Boolean(params.data_inicio && params.data_fim))

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmetido({
      data_inicio: dataInicio,
      data_fim: dataFim,
      proposta: proposta.trim() || undefined,
      ordem_producao: ordemProducao.trim() || undefined,
      colaborador: colaboradorId.trim() || undefined,
    })
  }

  function limparFiltrosOpcionais() {
    setProposta('')
    setOrdemProducao('')
    setColaboradorId('')
  }

  const dados = query.data

  const totalHorasFmt = (v: string) =>
    Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="container-fluid py-3 horas-gestao-page">
      <header className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-4">
        <div>
          <h1 className="h3 mb-1">Gestão de horas</h1>
          <p className="text-muted small mb-0">
            Cruze o período com colaborador, referência de proposta (PROP) ou ordem de produção (OP).
            O total no topo reflete todos os filtros aplicados. A lista de colaboradores inclui quem
            tem apontamentos válidos no período (além dos usuários ativos). As tabelas &quot;Por
            proposta&quot; e &quot;Por ordem de produção&quot; agregam horas por referência no
            período.
          </p>
        </div>
        <Link to="/tarefas" className="btn btn-outline-secondary btn-sm">
          Voltar ao Kanban
        </Link>
      </header>

      <ul className="nav nav-tabs mb-3 flex-nowrap overflow-auto small">
        {(
          [
            ['resumo', 'Resumo'],
            ['colaborador', 'Colaborador'],
            ['propostas', 'Propostas'],
            ['ordens', 'Ordens de produção'],
          ] as const
        ).map(([id, label]) => (
          <li className="nav-item" key={id}>
            <button
              type="button"
              className={`nav-link py-2 ${foco === id ? 'active' : ''}`}
              onClick={() => setFoco(id)}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>

      <form
        className="card card-body mb-4 bg-body-secondary bg-opacity-25 border-secondary-subtle"
        onSubmit={handleSubmit}
      >
        <div className="row g-3 align-items-end">
          <div className="col-md-6 col-lg-2">
            <label className="form-label" htmlFor="hg-data-inicio">
              Data inicial
            </label>
            <input
              id="hg-data-inicio"
              type="date"
              className="form-control form-control-sm"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              required
            />
          </div>
          <div className="col-md-6 col-lg-2">
            <label className="form-label" htmlFor="hg-data-fim">
              Data final
            </label>
            <input
              id="hg-data-fim"
              type="date"
              className="form-control form-control-sm"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              required
            />
          </div>
          <div className="col-md-6 col-lg-2">
            <label className="form-label d-flex align-items-center gap-2 flex-wrap" htmlFor="hg-colaborador">
              Colaborador
              {colaboradoresPeriodoQuery.isFetching ? (
                <span className="badge text-bg-light border fw-normal">Período…</span>
              ) : null}
            </label>
            <select
              id="hg-colaborador"
              className="form-select form-select-sm"
              value={colaboradorId}
              onChange={(e) => setColaboradorId(e.target.value)}
              disabled={selectColaboradorDesabilitado}
            >
              <option value="">Todos os colaboradores</option>
              {colaboradorId &&
              !opcoesColaborador.some((o) => String(o.id) === colaboradorId) ? (
                <option value={colaboradorId}>
                  #{colaboradorId} (ajuste o período se não encontrar o nome)
                </option>
              ) : null}
              {opcoesColaborador.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.label || r.email}
                </option>
              ))}
            </select>
            {colaboradoresPeriodoQuery.isError ? (
              <p className="form-text text-danger small mb-0 mt-1">
                Não foi possível carregar quem apontou horas neste período; a lista usa só usuários
                ativos.
              </p>
            ) : null}
            {foco === 'colaborador' ? (
              <p className="form-text small mb-0 mt-1">
                Escolha um colaborador e clique em Atualizar para ver o total de horas dele no período
                (PROP/OP continuam opcionais para refinar).
              </p>
            ) : null}
          </div>
          <div
            className={`col-md-6 col-lg-2 ${foco === 'propostas' || foco === 'resumo' ? '' : 'd-none d-lg-block'}`}
          >
            <label className="form-label" htmlFor="hg-proposta">
              Proposta (referência PROP)
            </label>
            <input
              id="hg-proposta"
              type="text"
              className="form-control form-control-sm"
              value={proposta}
              onChange={(e) => {
                setProposta(e.target.value)
                if (e.target.value.trim()) setOrdemProducao('')
              }}
              placeholder="Ex.: PROP-05001-26"
              autoComplete="off"
            />
            {foco === 'propostas' ? (
              <p className="form-text small mb-0 mt-1">
                Opcional: restrinja a uma referência. Sem preenchimento, a tabela abaixo lista todas
                as propostas com horas no período.
              </p>
            ) : null}
          </div>
          <div
            className={`col-md-6 col-lg-2 ${foco === 'ordens' || foco === 'resumo' ? '' : 'd-none d-lg-block'}`}
          >
            <label className="form-label" htmlFor="hg-op">
              Ordem de produção
            </label>
            <input
              id="hg-op"
              type="text"
              className="form-control form-control-sm"
              value={ordemProducao}
              onChange={(e) => {
                setOrdemProducao(e.target.value)
                if (e.target.value.trim()) setProposta('')
              }}
              placeholder="Ex.: OP-12345"
              autoComplete="off"
            />
            {foco === 'ordens' ? (
              <p className="form-text small mb-0 mt-1">
                Opcional: restrinja a uma OP. Sem preenchimento, a tabela lista todas as ordens com
                horas no período.
              </p>
            ) : null}
          </div>
          <div className="col-12 d-md-none">
            <div className="row g-2">
              <div className="col-12">
                <label className="form-label" htmlFor="hg-colaborador-m">
                  Colaborador
                </label>
                <select
                  id="hg-colaborador-m"
                  className="form-select form-select-sm"
                  value={colaboradorId}
                  onChange={(e) => setColaboradorId(e.target.value)}
                  disabled={selectColaboradorDesabilitado}
                >
                  <option value="">Todos os colaboradores</option>
                  {colaboradorId &&
                  !opcoesColaborador.some((o) => String(o.id) === colaboradorId) ? (
                    <option value={colaboradorId}>
                      #{colaboradorId} (ajuste o período se não encontrar o nome)
                    </option>
                  ) : null}
                  {opcoesColaborador.map((r) => (
                    <option key={r.id} value={String(r.id)}>
                      {r.label || r.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-sm-6">
                <label className="form-label" htmlFor="hg-proposta-m">
                  Proposta
                </label>
                <input
                  id="hg-proposta-m"
                  type="text"
                  className="form-control form-control-sm"
                  value={proposta}
                  onChange={(e) => {
                    setProposta(e.target.value)
                    if (e.target.value.trim()) setOrdemProducao('')
                  }}
                  placeholder="PROP-…"
                  autoComplete="off"
                />
              </div>
              <div className="col-12 col-sm-6">
                <label className="form-label" htmlFor="hg-op-m">
                  Ordem de produção
                </label>
                <input
                  id="hg-op-m"
                  type="text"
                  className="form-control form-control-sm"
                  value={ordemProducao}
                  onChange={(e) => {
                    setOrdemProducao(e.target.value)
                    if (e.target.value.trim()) setProposta('')
                  }}
                  placeholder="OP-…"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-2 d-flex gap-2 flex-wrap align-items-end">
            <button type="submit" className="btn btn-primary btn-sm">
              Atualizar
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={limparFiltrosOpcionais}
            >
              Limpar filtros
            </button>
          </div>
        </div>
      </form>

      {query.isError ? (
        <div className="alert alert-danger" role="alert">
          Não foi possível carregar o relatório.
          {query.error instanceof Error ? ` ${query.error.message}` : ''}
        </div>
      ) : null}

      {query.isPending ? <p className="text-muted">Carregando…</p> : null}

      {dados ? (
        <>
          <section
            className="card border-primary mb-4"
            aria-label="Total de horas no período e filtros"
          >
            <div className="card-body py-3">
              <div className="d-flex flex-wrap justify-content-between align-items-baseline gap-2">
                <div>
                  <span className="text-muted small d-block">
                    {dados.filtros.colaborador_id != null
                      ? `Total de horas — ${dados.filtros.colaborador_nome || `Colaborador #${dados.filtros.colaborador_id}`}`
                      : 'Total no período (todos os colaboradores nos filtros)'}
                  </span>
                  <strong className="display-6">{totalHorasFmt(dados.total_horas)} h</strong>
                </div>
                <div className="text-md-end small text-muted">
                  <div>
                    Período: {dados.periodo.data_inicio} — {dados.periodo.data_fim}
                  </div>
                  {dados.filtros.colaborador_id != null ? (
                    <div>
                      Colaborador:{' '}
                      <strong>
                        {dados.filtros.colaborador_nome || `#${dados.filtros.colaborador_id}`}
                      </strong>
                    </div>
                  ) : null}
                  {dados.filtros.proposta ? (
                    <div>
                      Filtro proposta: <strong>{dados.filtros.proposta}</strong>
                    </div>
                  ) : null}
                  {dados.filtros.ordem_producao ? (
                    <div>
                      Filtro OP: <strong>{dados.filtros.ordem_producao}</strong>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          {(foco === 'resumo' || foco === 'colaborador') && (
            <div className="row g-4 mb-4">
              <div className="col-lg-6">
                <section className="card h-100" aria-labelledby="hg-h2-colab">
                  <div className="card-header py-2">
                    <h2 id="hg-h2-colab" className="h6 mb-0">
                      Por colaborador
                    </h2>
                  </div>
                  <div className="card-body p-0 table-responsive">
                    <table className="table table-sm table-striped mb-0">
                      <thead>
                        <tr>
                          <th scope="col">Colaborador</th>
                          <th scope="col" className="text-end">
                            Horas
                          </th>
                          <th scope="col" className="text-end">
                            Registros
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {dados.por_colaborador.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="text-muted px-3 py-2">
                              Sem dados.
                            </td>
                          </tr>
                        ) : (
                          dados.por_colaborador.map((row) => (
                            <tr key={row.colaborador_id}>
                              <td>{row.colaborador_nome || `#${row.colaborador_id}`}</td>
                              <td className="text-end">{row.total_horas}</td>
                              <td className="text-end">{row.registros}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>

              <div className="col-lg-6">
                <section className="card h-100" aria-labelledby="hg-h2-tarefa">
                  <div className="card-header py-2">
                    <h2 id="hg-h2-tarefa" className="h6 mb-0">
                      Por tarefa (total da equipa)
                    </h2>
                  </div>
                  <div className="card-body p-0 table-responsive">
                    <table className="table table-sm table-striped mb-0">
                      <thead>
                        <tr>
                          <th scope="col">Tarefa</th>
                          <th scope="col" className="text-end">
                            Horas
                          </th>
                          <th scope="col" className="text-end">
                            Pessoas
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {dados.por_tarefa.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="text-muted px-3 py-2">
                              Sem dados.
                            </td>
                          </tr>
                        ) : (
                          dados.por_tarefa.map((row) => (
                            <tr key={row.tarefa_id}>
                              <td>
                                <span className="d-block">{row.titulo}</span>
                                <span className="small text-muted">
                                  {row.tipo_etapa}
                                  {row.proposta_referencia
                                    ? ` · ${row.proposta_referencia}`
                                    : ''}
                                  {row.ordem_producao_referencia
                                    ? ` · ${row.ordem_producao_referencia}`
                                    : ''}
                                </span>
                              </td>
                              <td className="text-end">{row.total_horas}</td>
                              <td className="text-end">{row.colaboradores_distintos}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            </div>
          )}

          {(foco === 'resumo' || foco === 'propostas') && (
            <section className="card mb-4" aria-labelledby="hg-h2-prop">
              <div className="card-header py-2">
                <h2 id="hg-h2-prop" className="h6 mb-0">
                  Por proposta (tarefas tipo proposta)
                </h2>
              </div>
              <div className="card-body p-0 table-responsive">
                <table className="table table-sm table-striped mb-0">
                  <thead>
                    <tr>
                      <th scope="col">Referência</th>
                      <th scope="col" className="text-end">
                        Horas
                      </th>
                      <th scope="col" className="text-end">
                        Tarefas
                      </th>
                      <th scope="col" className="text-end">
                        Pessoas
                      </th>
                      <th scope="col" className="text-end">
                        Registros
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.por_proposta.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-muted px-3 py-2">
                          Sem dados de proposta no período.
                        </td>
                      </tr>
                    ) : (
                      dados.por_proposta.map((row) => (
                        <tr key={row.proposta_referencia}>
                          <td>
                            <strong>{row.proposta_referencia}</strong>
                          </td>
                          <td className="text-end">{row.total_horas}</td>
                          <td className="text-end">{row.tarefas_distintas}</td>
                          <td className="text-end">{row.colaboradores_distintos}</td>
                          <td className="text-end">{row.registros}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {(foco === 'resumo' || foco === 'ordens') && (
            <section className="card mb-4" aria-labelledby="hg-h2-op">
              <div className="card-header py-2">
                <h2 id="hg-h2-op" className="h6 mb-0">
                  Por ordem de produção
                </h2>
              </div>
              <div className="card-body p-0 table-responsive">
                <table className="table table-sm table-striped mb-0">
                  <thead>
                    <tr>
                      <th scope="col">Referência OP</th>
                      <th scope="col" className="text-end">
                        Horas
                      </th>
                      <th scope="col" className="text-end">
                        Tarefas
                      </th>
                      <th scope="col" className="text-end">
                        Pessoas
                      </th>
                      <th scope="col" className="text-end">
                        Registros
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.por_ordem_producao.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-muted px-3 py-2">
                          Sem dados de ordem de produção no período.
                        </td>
                      </tr>
                    ) : (
                      dados.por_ordem_producao.map((row) => (
                        <tr key={row.ordem_producao_referencia}>
                          <td>
                            <strong>{row.ordem_producao_referencia}</strong>
                          </td>
                          <td className="text-end">{row.total_horas}</td>
                          <td className="text-end">{row.tarefas_distintas}</td>
                          <td className="text-end">{row.colaboradores_distintos}</td>
                          <td className="text-end">{row.registros}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {(foco === 'resumo' || foco === 'colaborador') && (
            <section className="card mt-4" aria-labelledby="hg-h2-det">
              <div className="card-header py-2">
                <h2 id="hg-h2-det" className="h6 mb-0">
                  Detalhe por tarefa e colaborador
                </h2>
              </div>
              <div className="card-body p-0 table-responsive">
                <table className="table table-sm table-striped mb-0">
                  <thead>
                    <tr>
                      <th scope="col">Tarefa</th>
                      <th scope="col">Colaborador</th>
                      <th scope="col" className="text-end">
                        Horas
                      </th>
                      <th scope="col" className="text-end">
                        Registros
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.por_tarefa_colaborador.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-muted px-3 py-2">
                          Sem dados.
                        </td>
                      </tr>
                    ) : (
                      dados.por_tarefa_colaborador.map((row) => (
                        <tr key={`${row.tarefa_id}-${row.colaborador_id}`}>
                          <td>{row.titulo}</td>
                          <td>{row.colaborador_nome || `#${row.colaborador_id}`}</td>
                          <td className="text-end">{row.horas}</td>
                          <td className="text-end">{row.registros}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      ) : null}
    </div>
  )
}
