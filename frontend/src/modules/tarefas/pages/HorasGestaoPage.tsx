import { type SyntheticEvent, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useColaboradoresRelatorioHorasPeriodoQuery } from '../hooks/useColaboradoresRelatorioHorasPeriodoQuery'
import { useRelatorioHorasGestaoQuery } from '../hooks/useRelatorioHorasGestaoQuery'
import { useTarefaResponsaveisQuery } from '../hooks/useTarefaResponsaveisQuery'

type FocoRelatorio = 'resumo' | 'colaborador' | 'propostas' | 'ordens'

type OpcaoColaborador = {
  id: number
  label: string
  email: string
}

type FiltrosSubmetidos = {
  data_inicio: string
  data_fim: string
  proposta?: string
  ordem_producao?: string
  colaborador?: string
}

type RelatorioHorasGestao = NonNullable<ReturnType<typeof useRelatorioHorasGestaoQuery>['data']>

const FOCOS_RELATORIO: ReadonlyArray<readonly [FocoRelatorio, string]> = [
  ['resumo', 'Resumo'],
  ['colaborador', 'Colaborador'],
  ['propostas', 'Propostas'],
  ['ordens', 'Ordens de produção'],
]

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

function formatHoras(v: string): string {
  return Number(v).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function montarParams(submetido: FiltrosSubmetidos): FiltrosSubmetidos {
  const params: FiltrosSubmetidos = {
    data_inicio: submetido.data_inicio,
    data_fim: submetido.data_fim,
  }
  const proposta = submetido.proposta?.trim()
  const ordemProducao = submetido.ordem_producao?.trim()
  const colaborador = submetido.colaborador?.trim()
  if (proposta) params.proposta = proposta
  if (ordemProducao) params.ordem_producao = ordemProducao
  if (colaborador) params.colaborador = colaborador
  return params
}

function nomeColaborador(row: {
  colaborador_id: number | string | null
  colaborador_nome?: string | null
}) {
  return row.colaborador_nome || `#${row.colaborador_id ?? '—'}`
}

function HorasGestaoTabs({
  foco,
  onChange,
}: Readonly<{
  foco: FocoRelatorio
  onChange: (foco: FocoRelatorio) => void
}>) {
  return (
    <ul className="nav nav-tabs mb-3 flex-nowrap overflow-auto small">
      {FOCOS_RELATORIO.map(([id, label]) => (
        <li className="nav-item" key={id}>
          <button
            type="button"
            className={`nav-link py-2 ${foco === id ? 'active' : ''}`}
            onClick={() => onChange(id)}
          >
            {label}
          </button>
        </li>
      ))}
    </ul>
  )
}

function ColaboradorOptions({
  colaboradorId,
  opcoes,
}: Readonly<{
  colaboradorId: string
  opcoes: OpcaoColaborador[]
}>) {
  const incluiSelecionado = opcoes.some((o) => String(o.id) === colaboradorId)
  return (
    <>
      <option value="">Todos os colaboradores</option>
      {colaboradorId && !incluiSelecionado ? (
        <option value={colaboradorId}>#{colaboradorId} (ajuste o período se não encontrar o nome)</option>
      ) : null}
      {opcoes.map((r) => (
        <option key={r.id} value={String(r.id)}>
          {r.label || r.email}
        </option>
      ))}
    </>
  )
}

function HorasGestaoFiltros({
  colaboradoresPeriodoErro,
  colaboradoresPeriodoFetching,
  colaboradorId,
  dataFim,
  dataInicio,
  foco,
  opcoesColaborador,
  ordemProducao,
  proposta,
  selectColaboradorDesabilitado,
  onClear,
  onColaboradorChange,
  onDataFimChange,
  onDataInicioChange,
  onOrdemProducaoChange,
  onPropostaChange,
  onSubmit,
}: Readonly<{
  colaboradoresPeriodoErro: boolean
  colaboradoresPeriodoFetching: boolean
  colaboradorId: string
  dataFim: string
  dataInicio: string
  foco: FocoRelatorio
  opcoesColaborador: OpcaoColaborador[]
  ordemProducao: string
  proposta: string
  selectColaboradorDesabilitado: boolean
  onClear: () => void
  onColaboradorChange: (value: string) => void
  onDataFimChange: (value: string) => void
  onDataInicioChange: (value: string) => void
  onOrdemProducaoChange: (value: string) => void
  onPropostaChange: (value: string) => void
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
}>) {
  return (
    <form
      className="card card-body mb-4 bg-body-secondary bg-opacity-25 border-secondary-subtle"
      onSubmit={onSubmit}
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
            onChange={(e) => onDataInicioChange(e.target.value)}
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
            onChange={(e) => onDataFimChange(e.target.value)}
            required
          />
        </div>
        <div className="col-md-6 col-lg-2">
          <label className="form-label d-flex align-items-center gap-2 flex-wrap" htmlFor="hg-colaborador">
            Colaborador
            {colaboradoresPeriodoFetching ? (
              <span className="badge text-bg-light border fw-normal">Período…</span>
            ) : null}
          </label>
          <select
            id="hg-colaborador"
            className="form-select form-select-sm"
            value={colaboradorId}
            onChange={(e) => onColaboradorChange(e.target.value)}
            disabled={selectColaboradorDesabilitado}
          >
            <ColaboradorOptions colaboradorId={colaboradorId} opcoes={opcoesColaborador} />
          </select>
          {colaboradoresPeriodoErro ? (
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
        <ReferenciaInput
          id="hg-proposta"
          label="Proposta (referência PROP)"
          value={proposta}
          visible={foco === 'propostas' || foco === 'resumo'}
          help={foco === 'propostas'}
          placeholder="Ex.: PROP-05001-26"
          onChange={(value) => {
            onPropostaChange(value)
            if (value.trim()) onOrdemProducaoChange('')
          }}
        />
        <ReferenciaInput
          id="hg-op"
          label="Ordem de produção"
          value={ordemProducao}
          visible={foco === 'ordens' || foco === 'resumo'}
          help={foco === 'ordens'}
          placeholder="Ex.: OP-12345"
          onChange={(value) => {
            onOrdemProducaoChange(value)
            if (value.trim()) onPropostaChange('')
          }}
        />
        <FiltrosMobile
          colaboradorId={colaboradorId}
          opcoesColaborador={opcoesColaborador}
          ordemProducao={ordemProducao}
          proposta={proposta}
          selectColaboradorDesabilitado={selectColaboradorDesabilitado}
          onColaboradorChange={onColaboradorChange}
          onOrdemProducaoChange={onOrdemProducaoChange}
          onPropostaChange={onPropostaChange}
        />
        <div className="col-12 col-lg-2 d-flex gap-2 flex-wrap align-items-end">
          <button type="submit" className="btn btn-primary btn-sm">
            Atualizar
          </button>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClear}>
            Limpar filtros
          </button>
        </div>
      </div>
    </form>
  )
}

function ReferenciaInput({
  help,
  id,
  label,
  placeholder,
  value,
  visible,
  onChange,
}: Readonly<{
  help: boolean
  id: string
  label: string
  placeholder: string
  value: string
  visible: boolean
  onChange: (value: string) => void
}>) {
  return (
    <div className={`col-md-6 col-lg-2 ${visible ? '' : 'd-none d-lg-block'}`}>
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        className="form-control form-control-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {help ? (
        <p className="form-text small mb-0 mt-1">
          Opcional: restrinja a uma referência. Sem preenchimento, a tabela lista todas as horas no
          período.
        </p>
      ) : null}
    </div>
  )
}

function FiltrosMobile({
  colaboradorId,
  opcoesColaborador,
  ordemProducao,
  proposta,
  selectColaboradorDesabilitado,
  onColaboradorChange,
  onOrdemProducaoChange,
  onPropostaChange,
}: Readonly<{
  colaboradorId: string
  opcoesColaborador: OpcaoColaborador[]
  ordemProducao: string
  proposta: string
  selectColaboradorDesabilitado: boolean
  onColaboradorChange: (value: string) => void
  onOrdemProducaoChange: (value: string) => void
  onPropostaChange: (value: string) => void
}>) {
  return (
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
            onChange={(e) => onColaboradorChange(e.target.value)}
            disabled={selectColaboradorDesabilitado}
          >
            <ColaboradorOptions colaboradorId={colaboradorId} opcoes={opcoesColaborador} />
          </select>
        </div>
        <ReferenciaMobileInput
          id="hg-proposta-m"
          label="Proposta"
          value={proposta}
          placeholder="PROP-…"
          onChange={(value) => {
            onPropostaChange(value)
            if (value.trim()) onOrdemProducaoChange('')
          }}
        />
        <ReferenciaMobileInput
          id="hg-op-m"
          label="Ordem de produção"
          value={ordemProducao}
          placeholder="OP-…"
          onChange={(value) => {
            onOrdemProducaoChange(value)
            if (value.trim()) onPropostaChange('')
          }}
        />
      </div>
    </div>
  )
}

function ReferenciaMobileInput({
  id,
  label,
  placeholder,
  value,
  onChange,
}: Readonly<{
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}>) {
  return (
    <div className="col-12 col-sm-6">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        className="form-control form-control-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
    </div>
  )
}

function ResumoTotalCard({ dados }: Readonly<{ dados: RelatorioHorasGestao }>) {
  const colaboradorNome =
    dados.filtros.colaborador_nome || `Colaborador #${dados.filtros.colaborador_id}`
  const titulo =
    dados.filtros.colaborador_id == null
      ? 'Total no período (todos os colaboradores nos filtros)'
      : `Total de horas — ${colaboradorNome}`

  return (
    <section className="card border-primary mb-4" aria-label="Total de horas no período e filtros">
      <div className="card-body py-3">
        <div className="d-flex flex-wrap justify-content-between align-items-baseline gap-2">
          <div>
            <span className="text-muted small d-block">{titulo}</span>
            <strong className="display-6">{formatHoras(dados.total_horas)} h</strong>
          </div>
          <FiltrosAplicados dados={dados} />
        </div>
      </div>
    </section>
  )
}

function FiltrosAplicados({ dados }: Readonly<{ dados: RelatorioHorasGestao }>) {
  return (
    <div className="text-md-end small text-muted">
      <div>
        Período: {dados.periodo.data_inicio} — {dados.periodo.data_fim}
      </div>
      {dados.filtros.colaborador_id == null ? null : (
        <div>
          Colaborador: <strong>{nomeColaborador(dados.filtros)}</strong>
        </div>
      )}
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
  )
}

function RelatorioHoras({ dados, foco }: Readonly<{ dados: RelatorioHorasGestao; foco: FocoRelatorio }>) {
  const mostrarResumoPessoas = foco === 'resumo' || foco === 'colaborador'
  const mostrarPropostas = foco === 'resumo' || foco === 'propostas'
  const mostrarOrdens = foco === 'resumo' || foco === 'ordens'
  return (
    <>
      <ResumoTotalCard dados={dados} />
      {mostrarResumoPessoas ? <ResumoPessoasTables dados={dados} /> : null}
      {mostrarPropostas ? (
        <ReferenciaTable
          id="hg-h2-prop"
          title="Por proposta (tarefas tipo proposta)"
          emptyLabel="Sem dados de proposta no período."
          rows={dados.por_proposta}
          referenciaKey="proposta_referencia"
          referenciaLabel="Referência"
        />
      ) : null}
      {mostrarOrdens ? (
        <ReferenciaTable
          id="hg-h2-op"
          title="Por ordem de produção"
          emptyLabel="Sem dados de ordem de produção no período."
          rows={dados.por_ordem_producao}
          referenciaKey="ordem_producao_referencia"
          referenciaLabel="Referência OP"
        />
      ) : null}
      {mostrarResumoPessoas ? <DetalheTarefaColaboradorTable dados={dados} /> : null}
    </>
  )
}

function ResumoPessoasTables({ dados }: Readonly<{ dados: RelatorioHorasGestao }>) {
  return (
    <div className="row g-4 mb-4">
      <div className="col-lg-6">
        <PorColaboradorTable dados={dados} />
      </div>
      <div className="col-lg-6">
        <PorTarefaTable dados={dados} />
      </div>
    </div>
  )
}

function PorColaboradorTable({ dados }: Readonly<{ dados: RelatorioHorasGestao }>) {
  return (
    <section className="card h-100" aria-labelledby="hg-h2-colab">
      <TableHeader id="hg-h2-colab" title="Por colaborador" />
      <div className="card-body p-0 table-responsive">
        <table className="table table-sm table-striped mb-0">
          <thead>
            <tr>
              <th scope="col">Colaborador</th>
              <th scope="col" className="text-end">Horas</th>
              <th scope="col" className="text-end">Registros</th>
            </tr>
          </thead>
          <tbody>
            {dados.por_colaborador.length === 0 ? (
              <EmptyRow colSpan={3} label="Sem dados." />
            ) : (
              dados.por_colaborador.map((row) => (
                <tr key={row.colaborador_id}>
                  <td>{nomeColaborador(row)}</td>
                  <td className="text-end">{row.total_horas}</td>
                  <td className="text-end">{row.registros}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function PorTarefaTable({ dados }: Readonly<{ dados: RelatorioHorasGestao }>) {
  return (
    <section className="card h-100" aria-labelledby="hg-h2-tarefa">
      <TableHeader id="hg-h2-tarefa" title="Por tarefa (total da equipa)" />
      <div className="card-body p-0 table-responsive">
        <table className="table table-sm table-striped mb-0">
          <thead>
            <tr>
              <th scope="col">Tarefa</th>
              <th scope="col" className="text-end">Horas</th>
              <th scope="col" className="text-end">Pessoas</th>
            </tr>
          </thead>
          <tbody>
            {dados.por_tarefa.length === 0 ? (
              <EmptyRow colSpan={3} label="Sem dados." />
            ) : (
              dados.por_tarefa.map((row) => (
                <tr key={row.tarefa_id}>
                  <td>
                    <span className="d-block">{row.titulo}</span>
                    <span className="small text-muted">
                      {[row.tipo_etapa, row.proposta_referencia, row.ordem_producao_referencia]
                        .filter(Boolean)
                        .join(' · ')}
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
  )
}

type ReferenciaRow = {
  total_horas: string
  tarefas_distintas: number
  colaboradores_distintos: number
  registros: number
} & Record<string, string | number>

function ReferenciaTable({
  emptyLabel,
  id,
  referenciaKey,
  referenciaLabel,
  rows,
  title,
}: Readonly<{
  emptyLabel: string
  id: string
  referenciaKey: string
  referenciaLabel: string
  rows: ReferenciaRow[]
  title: string
}>) {
  return (
    <section className="card mb-4" aria-labelledby={id}>
      <TableHeader id={id} title={title} />
      <div className="card-body p-0 table-responsive">
        <table className="table table-sm table-striped mb-0">
          <thead>
            <tr>
              <th scope="col">{referenciaLabel}</th>
              <th scope="col" className="text-end">Horas</th>
              <th scope="col" className="text-end">Tarefas</th>
              <th scope="col" className="text-end">Pessoas</th>
              <th scope="col" className="text-end">Registros</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={5} label={emptyLabel} />
            ) : (
              rows.map((row) => {
                const referencia = String(row[referenciaKey])
                return (
                  <tr key={referencia}>
                    <td>
                      <strong>{referencia}</strong>
                    </td>
                    <td className="text-end">{row.total_horas}</td>
                    <td className="text-end">{row.tarefas_distintas}</td>
                    <td className="text-end">{row.colaboradores_distintos}</td>
                    <td className="text-end">{row.registros}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function DetalheTarefaColaboradorTable({ dados }: Readonly<{ dados: RelatorioHorasGestao }>) {
  return (
    <section className="card mt-4" aria-labelledby="hg-h2-det">
      <TableHeader id="hg-h2-det" title="Detalhe por tarefa e colaborador" />
      <div className="card-body p-0 table-responsive">
        <table className="table table-sm table-striped mb-0">
          <thead>
            <tr>
              <th scope="col">Tarefa</th>
              <th scope="col">Colaborador</th>
              <th scope="col" className="text-end">Horas</th>
              <th scope="col" className="text-end">Registros</th>
            </tr>
          </thead>
          <tbody>
            {dados.por_tarefa_colaborador.length === 0 ? (
              <EmptyRow colSpan={4} label="Sem dados." />
            ) : (
              dados.por_tarefa_colaborador.map((row) => (
                <tr key={`${row.tarefa_id}-${row.colaborador_id}`}>
                  <td>{row.titulo}</td>
                  <td>{nomeColaborador(row)}</td>
                  <td className="text-end">{row.horas}</td>
                  <td className="text-end">{row.registros}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function TableHeader({ id, title }: Readonly<{ id: string; title: string }>) {
  return (
    <div className="card-header py-2">
      <h2 id={id} className="h6 mb-0">
        {title}
      </h2>
    </div>
  )
}

function EmptyRow({ colSpan, label }: Readonly<{ colSpan: number; label: string }>) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-muted px-3 py-2">
        {label}
      </td>
    </tr>
  )
}

/** Relatório de horas por colaborador, tarefa, proposta e ordem de produção. */
export default function HorasGestaoPage() {
  const padrao = useMemo(() => periodoPadrao(), [])
  const [dataInicio, setDataInicio] = useState(padrao.inicio)
  const [dataFim, setDataFim] = useState(padrao.fim)
  const [colaboradorId, setColaboradorId] = useState('')
  const [proposta, setProposta] = useState('')
  const [ordemProducao, setOrdemProducao] = useState('')
  const [foco, setFoco] = useState<FocoRelatorio>('resumo')
  const [submetido, setSubmetido] = useState<FiltrosSubmetidos>({
    data_inicio: padrao.inicio,
    data_fim: padrao.fim,
  })

  const responsaveisQuery = useTarefaResponsaveisQuery()
  const colaboradoresPeriodoQuery = useColaboradoresRelatorioHorasPeriodoQuery(
    { data_inicio: dataInicio, data_fim: dataFim },
    true
  )

  const opcoesColaborador = useMemo(() => {
    const map = new Map<number, OpcaoColaborador>()
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

  const params = useMemo(() => montarParams(submetido), [submetido])
  const query = useRelatorioHorasGestaoQuery(params, Boolean(params.data_inicio && params.data_fim))
  const selectColaboradorDesabilitado =
    responsaveisQuery.isPending && opcoesColaborador.length === 0

  const handleSubmit: (event: SyntheticEvent<HTMLFormElement>) => void = (event) => {
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

      <HorasGestaoTabs foco={foco} onChange={setFoco} />
      <HorasGestaoFiltros
        colaboradoresPeriodoErro={colaboradoresPeriodoQuery.isError}
        colaboradoresPeriodoFetching={colaboradoresPeriodoQuery.isFetching}
        colaboradorId={colaboradorId}
        dataFim={dataFim}
        dataInicio={dataInicio}
        foco={foco}
        opcoesColaborador={opcoesColaborador}
        ordemProducao={ordemProducao}
        proposta={proposta}
        selectColaboradorDesabilitado={selectColaboradorDesabilitado}
        onClear={limparFiltrosOpcionais}
        onColaboradorChange={setColaboradorId}
        onDataFimChange={setDataFim}
        onDataInicioChange={setDataInicio}
        onOrdemProducaoChange={setOrdemProducao}
        onPropostaChange={setProposta}
        onSubmit={handleSubmit}
      />

      {query.isError ? (
        <div className="alert alert-danger" role="alert">
          Não foi possível carregar o relatório.
          {query.error instanceof Error ? ` ${query.error.message}` : ''}
        </div>
      ) : null}
      {query.isPending ? <p className="text-muted">Carregando…</p> : null}
      {query.data ? <RelatorioHoras dados={query.data} foco={foco} /> : null}
    </div>
  )
}
