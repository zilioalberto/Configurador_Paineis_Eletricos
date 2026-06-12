import { type ChangeEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  labelObjetivoSaida,
  labelTipoDocumentoEmitido,
  objetivoSaidaOptions,
} from '../constants/objetivoSaidaOptions'
import { fiscalPaths } from '../fiscalPaths'
import { useRelatorioFaturamentoQuery } from '../hooks/useRelatorioFaturamentoQuery'
import type { RelatorioFaturamentoFiltros } from '../types/relatorioFaturamento'
import {
  formatCompetencia,
  formatCnpjExibicao,
  formatDataIso,
  formatMoedaBrl,
  labelAnexoSimples,
  periodoUltimos12MesesLocal,
} from '../utils/fiscalDisplay'
import { periodoDaCompetencia } from '../utils/periodoCompetencia'

import './RelatorioFaturamentoPage.css'

const FILTROS_INICIAIS: RelatorioFaturamentoFiltros = {
  competencia: '',
  cliente: '',
  objetivo_saida: '',
  anexo_simples: '',
  tipo_documento: '',
  top_clientes: 15,
  ...periodoUltimos12MesesLocal(),
}

function parseMoeda(valor: string): number {
  const n = Number(valor)
  return Number.isNaN(n) ? 0 : n
}

/** Dashboard e relatório de faturamento por mês e por cliente (NF-es emitidas). */
export default function RelatorioFaturamentoPage() {
  const [filtrosInput, setFiltrosInput] = useState<RelatorioFaturamentoFiltros>(FILTROS_INICIAIS)
  const [filtrosDebounced, setFiltrosDebounced] = useState<RelatorioFaturamentoFiltros>(FILTROS_INICIAIS)

  useEffect(() => {
    const t = globalThis.setTimeout(() => setFiltrosDebounced(filtrosInput), 400)
    return () => globalThis.clearTimeout(t)
  }, [filtrosInput])

  const { data, isPending, isError, error, refetch } = useRelatorioFaturamentoQuery(filtrosDebounced)

  const maxMes = useMemo(() => {
    if (!data?.por_mes.length) return 0
    return Math.max(...data.por_mes.map((m) => parseMoeda(m.valor_total)))
  }, [data?.por_mes])

  const maxCliente = useMemo(() => {
    if (!data?.por_cliente.length) return 0
    return Math.max(...data.por_cliente.map((c) => parseMoeda(c.valor_total)))
  }, [data?.por_cliente])

  const onFiltroChange =
    (field: keyof RelatorioFaturamentoFiltros) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value
      setFiltrosInput((prev) => ({
        ...prev,
        [field]: value,
        ...(field === 'data_inicio' || field === 'data_fim' ? { competencia: '' } : {}),
      }))
    }

  const onCompetenciaChange = (e: ChangeEvent<HTMLInputElement>) => {
    const competencia = e.target.value
    const periodo = periodoDaCompetencia(competencia)
    setFiltrosInput((prev) => ({
      ...prev,
      competencia,
      ...(periodo ?? { data_inicio: '', data_fim: '' }),
    }))
  }

  return (
    <div className="container-fluid">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-2">
              <li className="breadcrumb-item">
                <Link to={fiscalPaths.home}>Fiscal</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Faturamento
              </li>
            </ol>
          </nav>
          <h1 className="h3 mb-1">Faturamento e clientes</h1>
          <p className="text-muted mb-0">
            Dashboard e relatórios com base nas NF-es/NFS-es emitidas importadas (somente notas que
            compõem faturamento).
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link to={fiscalPaths.nfesEmitidas} className="btn btn-outline-primary">
            NF-es emitidas
          </Link>
          <Link to={fiscalPaths.projecaoDas} className="btn btn-outline-secondary">
            Projeção DAS
          </Link>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => refetch().catch(() => undefined)}
          >
            Atualizar
          </button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h6 mb-3">Filtros</h2>
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label" htmlFor="fat-competencia">
                Competência
              </label>
              <input
                id="fat-competencia"
                type="month"
                className="form-control"
                value={filtrosInput.competencia ?? ''}
                onChange={onCompetenciaChange}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="fat-inicio">
                Data início
              </label>
              <input
                id="fat-inicio"
                type="date"
                className="form-control"
                value={filtrosInput.data_inicio ?? ''}
                onChange={onFiltroChange('data_inicio')}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="fat-fim">
                Data fim
              </label>
              <input
                id="fat-fim"
                type="date"
                className="form-control"
                value={filtrosInput.data_fim ?? ''}
                onChange={onFiltroChange('data_fim')}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="fat-cliente">
                Cliente
              </label>
              <input
                id="fat-cliente"
                className="form-control"
                placeholder="Nome ou CNPJ"
                value={filtrosInput.cliente ?? ''}
                onChange={onFiltroChange('cliente')}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="fat-objetivo">
                Finalidade
              </label>
              <select
                id="fat-objetivo"
                className="form-select"
                value={filtrosInput.objetivo_saida ?? ''}
                onChange={onFiltroChange('objetivo_saida')}
              >
                <option value="">Todas</option>
                {objetivoSaidaOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="fat-anexo">
                Anexo Simples
              </label>
              <select
                id="fat-anexo"
                className="form-select"
                value={filtrosInput.anexo_simples ?? ''}
                onChange={onFiltroChange('anexo_simples')}
              >
                <option value="">Todos</option>
                <option value="I">Anexo I — Comércio</option>
                <option value="II">Anexo II — Indústria</option>
                <option value="III">Anexo III — Serviços</option>
                <option value="V">Anexo V — Serviços</option>
                <option value="SERVICO">Serviço (Fator R)</option>
                <option value="NENHUM">Não compõe RBT12</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="fat-tipo-doc">
                Tipo de documento
              </label>
              <select
                id="fat-tipo-doc"
                className="form-select"
                value={filtrosInput.tipo_documento ?? ''}
                onChange={onFiltroChange('tipo_documento')}
              >
                <option value="">Todos</option>
                <option value="NFE_PRODUTO">{labelTipoDocumentoEmitido('NFE_PRODUTO')}</option>
                <option value="NFSE_SERVICO">{labelTipoDocumentoEmitido('NFSE_SERVICO')}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {isError ? (
        <div className="alert alert-danger" role="alert">
          {error instanceof Error ? error.message : 'Erro ao carregar relatório.'}
        </div>
      ) : null}

      {isPending ? (
        <p className="text-muted">Carregando relatório…</p>
      ) : data ? (
        <>
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-3">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body">
                  <div className="text-muted small">Faturamento total</div>
                  <div className="fs-4 fw-semibold">{formatMoedaBrl(data.resumo.valor_total)}</div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body">
                  <div className="text-muted small">Documentos</div>
                  <div className="fs-4 fw-semibold">{data.resumo.quantidade_documentos}</div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body">
                  <div className="text-muted small">Ticket médio</div>
                  <div className="fs-4 fw-semibold">{formatMoedaBrl(data.resumo.ticket_medio)}</div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body">
                  <div className="text-muted small">Clientes distintos</div>
                  <div className="fs-4 fw-semibold">{data.resumo.clientes_distintos}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4 mb-4">
            <div className="col-lg-7">
              <div className="card h-100">
                <div className="card-header">Faturamento por mês</div>
                <div className="card-body">
                  {data.por_mes.length === 0 ? (
                    <p className="text-muted mb-0">Sem dados no período.</p>
                  ) : (
                    <div className="fat-bar-chart" role="img" aria-label="Gráfico de barras por mês">
                      {data.por_mes.map((mes) => {
                        const valor = parseMoeda(mes.valor_total)
                        const altura = maxMes > 0 ? Math.round((valor / maxMes) * 100) : 0
                        return (
                          <div key={mes.competencia} className="fat-bar-chart__item">
                            <div className="fat-bar-chart__bar-wrap">
                              <div
                                className="fat-bar-chart__bar"
                                style={{ height: `${Math.max(altura, 2)}%` }}
                                title={`${formatCompetencia(mes.competencia)}: ${formatMoedaBrl(mes.valor_total)}`}
                              />
                            </div>
                            <div className="fat-bar-chart__label">{formatCompetencia(mes.competencia)}</div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="col-lg-5">
              <div className="card h-100">
                <div className="card-header">Top clientes</div>
                <div className="card-body p-0">
                  {data.por_cliente.length === 0 ? (
                    <p className="text-muted p-3 mb-0">Sem clientes no período.</p>
                  ) : (
                    <ul className="list-group list-group-flush">
                      {data.por_cliente.map((cli) => {
                        const valor = parseMoeda(cli.valor_total)
                        const largura = maxCliente > 0 ? (valor / maxCliente) * 100 : 0
                        return (
                          <li key={cli.cnpj_destinatario} className="list-group-item">
                            <div className="d-flex justify-content-between gap-2 mb-1">
                              <div className="min-w-0">
                                <div className="fw-semibold text-truncate">
                                  {cli.nome_destinatario || 'Sem nome'}
                                </div>
                                <div className="small text-muted">
                                  {formatCnpjExibicao(cli.cnpj_destinatario)} · {cli.quantidade_documentos}{' '}
                                  doc(s)
                                </div>
                              </div>
                              <div className="text-end flex-shrink-0">
                                <div className="fw-semibold">{formatMoedaBrl(cli.valor_total)}</div>
                                <div className="small text-muted">{cli.participacao_percentual}%</div>
                              </div>
                            </div>
                            <div className="fat-client-bar" style={{ width: `${largura}%` }} />
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4 mb-4">
            <div className="col-lg-6">
              <div className="card">
                <div className="card-header">Detalhamento mensal</div>
                <div className="table-responsive">
                  <table className="table table-sm table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Competência</th>
                        <th className="text-end">NF-es</th>
                        <th className="text-end">Qtd.</th>
                        <th className="text-end">Ajuste</th>
                        <th className="text-end">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.por_mes.map((mes) => (
                        <tr key={mes.competencia}>
                          <td>{formatCompetencia(mes.competencia)}</td>
                          <td className="text-end">{formatMoedaBrl(mes.valor_nfes)}</td>
                          <td className="text-end">{mes.quantidade_documentos}</td>
                          <td className="text-end">{formatMoedaBrl(mes.valor_ajuste)}</td>
                          <td className="text-end fw-semibold">{formatMoedaBrl(mes.valor_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="card">
                <div className="card-header">Por anexo / finalidade</div>
                <div className="card-body">
                  <h3 className="h6">Anexo Simples</h3>
                  <ul className="list-unstyled mb-3">
                    {data.por_anexo.map((row) => (
                      <li key={row.anexo} className="d-flex justify-content-between border-bottom py-1">
                        <span>{labelAnexoSimples(row.anexo)}</span>
                        <span>{formatMoedaBrl(row.valor_total)}</span>
                      </li>
                    ))}
                  </ul>
                  <h3 className="h6">Finalidade da saída</h3>
                  <ul className="list-unstyled mb-0">
                    {data.por_objetivo.map((row) => (
                      <li
                        key={row.objetivo_saida}
                        className="d-flex justify-content-between border-bottom py-1"
                      >
                        <span>{labelObjetivoSaida(row.objetivo_saida)}</span>
                        <span>{formatMoedaBrl(row.valor_total)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">Documentos no período</div>
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Emissão</th>
                    <th>Nº</th>
                    <th>Cliente</th>
                    <th>CFOP</th>
                    <th>Anexo</th>
                    <th className="text-end">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {data.documentos.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-muted p-4">
                        Nenhum documento no período.{' '}
                        <Link to={fiscalPaths.nfeEmitidaImportar}>Importar XMLs</Link>
                      </td>
                    </tr>
                  ) : (
                    data.documentos.map((doc) => (
                      <tr key={doc.id}>
                        <td>{formatDataIso(doc.data_emissao)}</td>
                        <td>
                          {doc.numero}
                          {doc.serie ? ` / ${doc.serie}` : ''}
                        </td>
                        <td>
                          <div className="text-truncate" style={{ maxWidth: '14rem' }}>
                            {doc.nome_destinatario || '—'}
                          </div>
                          <div className="small text-muted">{formatCnpjExibicao(doc.cnpj_destinatario)}</div>
                        </td>
                        <td>{doc.cfop_predominante || '—'}</td>
                        <td>{labelAnexoSimples(doc.anexo_simples)}</td>
                        <td className="text-end">{formatMoedaBrl(doc.valor_total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
